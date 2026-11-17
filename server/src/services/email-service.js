const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const config = require('../config');

const { host, port, secure, user, apiKey, fromName, fromAddress, replyTo, brandColor, accentColor, copyrightYear, adminNotifyAddress } = config.email;

/*
 * Every email here is a transactional message (a reply to something the person did), written so Gmail keeps it in
 * the Primary inbox rather than Promotions:
 *   - a plain-text copy goes with every HTML email
 *   - no images, tracking pixels or web fonts; a light, letter-like layout
 *   - one button at most, and the same link written out in full
 *   - no sales wording, emoji or capitals in subjects
 *   - no List-Unsubscribe / bulk headers (those mark mail as marketing)
 *   - a real reply-to inbox
 * Keep click and open tracking switched off for the domain in Resend for the same reason.
 */

// Customer-entered text goes into HTML emails, so escape it.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const siteUrl = () => (config.app.nodeEnv === 'production' ? config.cors.productionOrigin : config.cors.localOrigin) || '';
const siteHost = () => siteUrl().replace(/^https?:\/\//, '');
const longDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const reference = (id) => String(id || '').slice(-8).toUpperCase();
// ₹24,500 rather than ₹24,500.00 when there are no paise
const money = (amount, currency) => require('./currency').formatMoney(amount, currency).replace(/[.,]00$/, '');

let transporter = null;

if (apiKey && apiKey.startsWith('re_')) {
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass: apiKey } });
}

const sendEmail = async (mailOptions) => {
    if (!transporter) {
        logger.info('Email service not configured, skipping email', { to: mailOptions.to, subject: mailOptions.subject });
        return null;
    }
    try {
        const info = await transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, ...(replyTo && { replyTo }), ...mailOptions });
        logger.info('Email sent successfully', { messageId: info.messageId, to: mailOptions.to });
        return info;
    } catch (error) {
        logger.error('Error sending email', { error: error.message, to: mailOptions.to });
        return null;
    }
};

/**
 * Builds the HTML and plain-text versions of one email from the same parts.
 * @param {object} p
 * @param {string} p.preview   one line shown next to the subject in the inbox list
 * @param {string} p.heading
 * @param {string} [p.greeting] "Hi Asha,"
 * @param {string[]} [p.lines] paragraphs (plain text, escaped here)
 * @param {[string, *][]} [p.details] label/value rows in a soft box; empty values are left out
 * @param {{label: string, url: string}} [p.button]
 * @param {string[]} [p.after] paragraphs under the button
 * @param {string} p.reason    why they got this email (footer)
 * @param {boolean} [p.team]   an alert for the staff inbox: no sign-off or "reply to us" line
 */
function compose({ preview, heading, greeting, lines = [], details = [], button, after = [], reason, team = false }) {
    const rows = details.filter(([, v]) => v !== undefined && v !== null && v !== '');
    const p = (t) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(t)}</p>`;
    const small = (t) => `<p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#94A3B8;">${t}</p>`;
    const cell = (i) => (i ? 'border-top:1px solid #F0EBE4;' : '');

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#F6F4F1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4F1;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td style="padding:0 4px 16px;font-size:17px;font-weight:700;color:${brandColor};">${escapeHtml(fromName)}</td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #ECE7E1;border-radius:12px;padding:32px 28px;">
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${brandColor};font-weight:700;">${escapeHtml(heading)}</h1>
      ${greeting ? p(greeting) : ''}
      ${lines.map(p).join('')}
      ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;border:1px solid #F0EBE4;border-radius:6px;margin:4px 0 20px;">
        ${rows.map(([label, value], i) => `<tr><td style="padding:10px 16px;font-size:13px;color:#64748B;white-space:nowrap;vertical-align:top;${cell(i)}">${escapeHtml(label)}</td><td style="padding:10px 16px;font-size:14px;color:#0F172A;font-weight:600;${cell(i)}">${escapeHtml(value)}</td></tr>`).join('')}
      </table>` : ''}
      ${button ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:6px;background:${accentColor};">
        <a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(button.label)}</a>
      </td></tr></table>
      <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#94A3B8;word-break:break-all;">If the button does not work, open this link: <a href="${escapeHtml(button.url)}" style="color:#64748B;">${escapeHtml(button.url)}</a></p>` : ''}
      ${after.map(p).join('')}
      ${team ? '' : `<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#334155;">Warm regards,<br>The ${escapeHtml(fromName)} team</p>`}
    </td></tr>
    <tr><td style="padding:16px 4px 0;">
      ${small(team ? escapeHtml(reason) : `${escapeHtml(reason)} Questions? Just reply to this email.`)}
      ${small(`&copy; ${escapeHtml(copyrightYear)} ${escapeHtml(fromName)}${siteHost() ? ` &middot; <a href="${escapeHtml(siteUrl())}" style="color:#94A3B8;">${escapeHtml(siteHost())}</a>` : ''}`)}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

    const text = [
        heading, '',
        ...(greeting ? [greeting, ''] : []),
        ...lines.flatMap((l) => [l, '']),
        ...(rows.length ? [...rows.map(([l, v]) => `${l}: ${v}`), ''] : []),
        ...(button ? [`${button.label}: ${button.url}`, ''] : []),
        ...after.flatMap((l) => [l, '']),
        ...(team ? [] : ['Warm regards,', `The ${fromName} team`, '']),
        '--',
        team ? reason : `${reason} Questions? Just reply to this email.`,
        siteHost() ? `${fromName} · ${siteHost()}` : fromName,
    ].join('\n');

    return { html, text };
}

const hi = (name) => (name ? `Hi ${String(name).trim().split(/\s+/)[0]},` : 'Hi,');

const sendBookingConfirmation = async (booking, userEmail) => {
    const tourTitle = booking.tour?.title || 'your tour';
    const choice = booking.packageChoice;
    const pkg = choice ? [choice.duration, choice.hotelLabel && `${choice.hotelLabel}${choice.hotel ? ` (${choice.hotel})` : ''}`].filter(Boolean).join(', ') : '';
    const ref = reference(booking._id);
    return sendEmail({
        to: userEmail,
        subject: `Booking confirmed: ${tourTitle} (ref ${ref})`,
        ...compose({
            preview: `Your trip on ${longDate(booking.travelDate)} is confirmed. Reference ${ref}.`,
            heading: 'Your booking is confirmed',
            greeting: hi(booking.contactInfo?.firstName || booking.user?.displayName),
            lines: [`Thank you for booking with us. Your place on ${tourTitle} is confirmed, and here are the details for your records.`],
            details: [
                ['Reference', ref],
                ['Tour', tourTitle],
                ['Travel date', longDate(booking.travelDate)],
                ['Travellers', booking.numberOfTravelers],
                ['Package', pkg],
                ['Total paid', money(booking.totalAmount, booking.currency)],
            ],
            button: siteUrl() ? { label: 'View your booking', url: `${siteUrl()}/bookings/${booking._id}` } : undefined,
            after: ['A travel specialist will get in touch before your trip with pickup times and anything else you need to know.'],
            reason: 'You are receiving this because you booked a trip with us.',
        }),
    });
};

const sendInquiryAcknowledgment = async (inquiry) => sendEmail({
    to: inquiry.email,
    subject: 'We have your message',
    ...compose({
        preview: 'A travel specialist will reply within 24 hours.',
        heading: 'Thanks for getting in touch',
        greeting: hi(inquiry.fullName),
        lines: [
            'We have received your message and a travel specialist will reply within 24 hours.',
            'If you think of anything else, such as dates, the number of travellers or a budget, just reply to this email and it will reach the same person.',
        ],
        details: [
            ['About', inquiry.context || inquiry.topic],
            ['Travel date', inquiry.preferredTravelDate ? longDate(inquiry.preferredTravelDate) : ''],
            ['Travellers', inquiry.numberOfTravelers],
        ],
        reason: 'You are receiving this because you sent us a message on our website.',
    }),
});

const sendPasswordResetEmail = async (userEmail, resetUrl) => sendEmail({
    to: userEmail,
    subject: 'Reset your password',
    ...compose({
        preview: 'Use this link within 1 hour to choose a new password.',
        heading: 'Reset your password',
        greeting: 'Hi,',
        lines: ['We received a request to reset the password for your account. Use the button below to choose a new one.'],
        button: { label: 'Choose a new password', url: resetUrl },
        after: ['This link works for 1 hour. If you did not ask for this, you can ignore this email and your password stays the same.'],
        reason: 'You are receiving this because someone asked to reset the password for this email address.',
    }),
});

const sendVerificationEmail = async (userEmail, verifyUrl) => sendEmail({
    to: userEmail,
    subject: `Confirm your email for ${fromName}`,
    ...compose({
        preview: 'One click to finish setting up your account.',
        heading: 'Confirm your email address',
        greeting: 'Hi,',
        lines: ['Thanks for creating an account. Please confirm this is your email address so we can send you booking details and updates about your trips.'],
        button: { label: 'Confirm email address', url: verifyUrl },
        after: ['This link works for 24 hours. If you did not create an account, you can ignore this email.'],
        reason: 'You are receiving this because this address was used to sign up on our website.',
    }),
});

/**
 * Tells the staff inbox (ADMIN_NOTIFY_EMAIL) about something that needs attention.
 * `replyTo` is the customer's email, so hitting Reply on the alert writes straight to them.
 * A row labelled "Open it" or "Review it" becomes the button.
 */
const sendAdminAlert = async (subject, rows, { replyTo: customerEmail } = {}) => {
    if (!adminNotifyAddress) return null;
    const link = rows.find(([label, value]) => /^(open it|review it)$/i.test(label) && value);
    return sendEmail({
        to: adminNotifyAddress,
        ...(customerEmail && { replyTo: customerEmail }),
        subject,
        ...compose({
            preview: rows.filter(([, v]) => v).slice(0, 2).map(([l, v]) => `${l}: ${v}`).join(' · '),
            heading: subject,
            lines: customerEmail ? ['Reply to this email to answer the customer directly.'] : [],
            details: rows.filter((r) => r !== link),
            button: link ? { label: /review/i.test(link[0]) ? 'Review in admin' : 'Open in admin', url: link[1] } : undefined,
            reason: `Team alert from ${siteHost() || 'the website'}.`,
            team: true,
        }),
    });
};

// Tells a writer their article was published, or sent back with the editor's note
const sendArticleReviewEmail = async (to, { title, approved, note, url }) => sendEmail({
    to,
    subject: approved ? `Your article is published: ${title}` : `A few changes for your article: ${title}`,
    ...compose({
        preview: approved ? 'It is now live on the magazine.' : 'Our editor has left a note for you.',
        heading: approved ? 'Your article is published' : 'A few changes before we publish',
        greeting: 'Hi,',
        lines: [approved
            ? `Thank you for writing for us. "${title}" is now live on the magazine for other travellers to read.`
            : `Thank you for sending "${title}". Our editor has read it and would like a few changes before it goes live.`],
        details: note ? [["Editor's note", note]] : [],
        button: url ? { label: approved ? 'Read your article' : 'Edit your article', url } : undefined,
        reason: 'You are receiving this because you sent an article to our travel magazine.',
    }),
});

// The traveller's own trip from the trip builder: "we got it", or the team's final price
const sendCustomTripEmail = async (trip, { kind, url }) => {
    const est = trip.estimate || {};
    const currency = est.currency || 'INR';
    const quoted = kind === 'quoted';
    const route = (trip.stops || []).map((s) => `${s.name} (${s.nights}N)`).join(', ');
    const people = `${trip.adults} adult${trip.adults === 1 ? '' : 's'}${trip.children ? `, ${trip.children} child${trip.children === 1 ? '' : 'ren'}` : ''}`;
    return sendEmail({
        to: trip.email,
        subject: quoted ? `Your price for ${trip.title}` : `We have your trip: ${trip.title}`,
        ...compose({
            preview: quoted ? `Final price: ${money(trip.quote, currency)}` : 'A travel specialist will send your final price within 24 hours.',
            heading: quoted ? 'Your trip is priced' : 'We have your trip',
            greeting: hi(trip.fullName),
            lines: [quoted
                ? 'Our team has checked hotels and availability for your trip. Here is your final price.'
                : 'Thanks for planning your trip with us. A travel specialist will check it and send you a final price within 24 hours.'],
            details: [
                ['Trip', trip.title],
                ['Route', route],
                ['Nights', est.nights],
                ['Travellers', people],
                ['Hotels', est.hotelLabel],
                ['Start date', trip.startDate ? longDate(trip.startDate) : 'Flexible'],
                quoted
                    ? ['Final price', money(trip.quote, currency)]
                    : ['Estimated budget', `${money(est.low, currency)} to ${money(est.high, currency)}`],
            ],
            button: url ? { label: 'See your trip', url } : undefined,
            after: [
                ...(quoted && trip.quoteNote ? [trip.quoteNote] : []),
                ...(!quoted ? ['The estimate depends on availability, current prices and the season at each place.'] : []),
                'Want to change anything? Reply to this email and we will update it for you.',
            ],
            reason: 'You are receiving this because you sent us a trip from our trip builder.',
        }),
    });
};

module.exports = { sendArticleReviewEmail, sendEmail, sendBookingConfirmation, sendInquiryAcknowledgment, sendPasswordResetEmail, sendVerificationEmail, sendAdminAlert, sendCustomTripEmail, compose };
