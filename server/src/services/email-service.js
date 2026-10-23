const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const config = require('../config');

const { host, port, secure, domain, apiKey, fromName, fromAddress, brandColor, accentColor, copyrightYear, adminNotifyAddress } = config.email;

// Customer-entered text goes into HTML emails, so escape it.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let transporter = null;

if (host && apiKey && apiKey !== 'your_mailgun_api_key') {
    transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: domain, pass: apiKey },
    });
}

const sendEmail = async (mailOptions) => {
    if (!transporter) {
        logger.info('Email service not configured, skipping email', { to: mailOptions.to, subject: mailOptions.subject });
        return null;
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully', { messageId: info.messageId, to: mailOptions.to });
        return info;
    } catch (error) {
        logger.error('Error sending email', { error: error.message, to: mailOptions.to });
        return null;
    }
};

function emailLayout(bodyHtml) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${brandColor}; padding: 24px; text-align: center;">
                <h1 style="color: ${accentColor}; margin: 0;">${fromName}</h1>
            </div>
            ${bodyHtml}
            <div style="background: #F8FAFC; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
                <p>&copy; ${copyrightYear} ${fromName}. All rights reserved.</p>
            </div>
        </div>`;
}

const sendBookingConfirmation = async (booking, userEmail) => {
    const tourTitle = booking.tour?.title || 'your tour';
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to: userEmail,
        subject: `Booking Confirmed - ${tourTitle}`,
        html: emailLayout(`
            <div style="padding: 32px; background: #fff;">
                <h2 style="color: ${brandColor};">Booking Confirmed!</h2>
                <p>Your booking for <strong>${tourTitle}</strong> has been confirmed.</p>
                <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p><strong>Booking ID:</strong> ${booking._id}</p>
                    <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString()}</p>
                    <p><strong>Travelers:</strong> ${booking.numberOfTravelers}</p>
                    <p><strong>Total:</strong> ${escapeHtml(require('./currency').formatMoney(booking.totalAmount, booking.currency))}</p>
                </div>
                <p>We'll send you more details as your travel date approaches.</p>
            </div>`),
    });
};

const sendInquiryAcknowledgment = async (inquiry) => {
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to: inquiry.email,
        subject: 'We received your travel inquiry!',
        html: emailLayout(`
            <div style="padding: 32px; background: #fff;">
                <h2 style="color: ${brandColor};">Hi ${escapeHtml(inquiry.fullName)}!</h2>
                <p>Thank you for your travel inquiry. Our team will review your request and get back to you within 24 hours.</p>
            </div>`),
    });
};

const sendPasswordResetEmail = async (userEmail, resetUrl) => {
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to: userEmail,
        subject: 'Reset your password',
        html: emailLayout(`
            <div style="padding: 32px; background: #fff;">
                <h2 style="color: ${brandColor}; margin-top: 0;">Reset your password</h2>
                <p>We received a request to reset your password. Click the button below to choose a new one.</p>
                <p style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: ${accentColor}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #64748B; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
                <p style="color: #64748B; font-size: 12px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
            </div>`),
    });
};

const sendVerificationEmail = async (userEmail, verifyUrl) => {
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to: userEmail,
        subject: `Verify your ${fromName} account`,
        html: emailLayout(`
            <div style="padding: 32px; background: #fff;">
                <h2 style="color: ${brandColor}; margin-top: 0;">Verify your email</h2>
                <p>Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
                <p style="text-align: center; margin: 32px 0;">
                    <a href="${verifyUrl}" style="display: inline-block; background: ${accentColor}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Verify Email
                    </a>
                </p>
                <p style="color: #64748B; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            </div>`),
    });
};

/** Tells the staff inbox (ADMIN_NOTIFY_EMAIL) about something that needs attention. */
const sendAdminAlert = async (subject, rows) => {
    if (!adminNotifyAddress) return null;
    const body = rows
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
        .join('');
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to: adminNotifyAddress,
        subject,
        html: emailLayout(`<div style="padding: 32px; background: #fff;"><h2 style="color: ${brandColor}; margin-top: 0;">${escapeHtml(subject)}</h2>${body}</div>`),
    });
};

// Tells a writer their article was published, or sent back with the editor's note
const sendArticleReviewEmail = async (to, { title, approved, note, url }) => {
    return sendEmail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject: approved ? `Your article is live: ${title}` : `Your article needs a few changes: ${title}`,
        html: emailLayout(`
            <div style="padding: 32px; background: #fff;">
                <h2 style="color: ${brandColor}; margin-top: 0;">${approved ? 'Your article is published!' : 'A few changes before we publish'}</h2>
                <p><strong>${escapeHtml(title)}</strong></p>
                ${note ? `<p style="background: #F8FAFC; padding: 16px; border-radius: 8px;">${escapeHtml(note)}</p>` : ''}
                <p style="text-align: center; margin: 32px 0;">
                    <a href="${url}" style="display: inline-block; background: ${accentColor}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                        ${approved ? 'Read it on the site' : 'Edit your article'}
                    </a>
                </p>
            </div>`),
    });
};

module.exports = { sendArticleReviewEmail, sendEmail, sendBookingConfirmation, sendInquiryAcknowledgment, sendPasswordResetEmail, sendVerificationEmail, sendAdminAlert };
