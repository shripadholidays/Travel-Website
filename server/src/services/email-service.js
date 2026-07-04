const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

if (process.env.MAILGUN_HOST && process.env.MAILGUN_API_KEY && process.env.MAILGUN_API_KEY !== 'your_mailgun_api_key') {
    transporter = nodemailer.createTransport({
        host: process.env.MAILGUN_HOST,
        port: process.env.MAILGUN_PORT || 587,
        secure: process.env.MAILGUN_SECURE === 'true',
        auth: {
            user: process.env.MAILGUN_DOMAIN,
            pass: process.env.MAILGUN_API_KEY,
        },
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

const sendBookingConfirmation = async (booking, userEmail) => {
    const tourTitle = booking.tour?.title || 'your tour';
    return sendEmail({
        from: `"Wandeazy" <noreply@${process.env.MAILGUN_DOMAIN || 'wandeazy.com'}>`,
        to: userEmail,
        subject: `Booking Confirmed - ${tourTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0F172A; padding: 24px; text-align: center;">
                    <h1 style="color: #F97316; margin: 0;">Wandeazy</h1>
                </div>
                <div style="padding: 32px; background: #fff;">
                    <h2 style="color: #0F172A;">Booking Confirmed!</h2>
                    <p>Your booking for <strong>${tourTitle}</strong> has been confirmed.</p>
                    <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p><strong>Booking ID:</strong> ${booking._id}</p>
                        <p><strong>Travel Date:</strong> ${new Date(booking.travelDate).toLocaleDateString()}</p>
                        <p><strong>Travelers:</strong> ${booking.numberOfTravelers}</p>
                        <p><strong>Total:</strong> $${booking.totalAmount}</p>
                    </div>
                    <p>We'll send you more details as your travel date approaches.</p>
                </div>
                <div style="background: #F8FAFC; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
                    <p>&copy; 2025 Wandeazy. All rights reserved.</p>
                </div>
            </div>
        `
    });
};

const sendInquiryAcknowledgment = async (inquiry) => {
    return sendEmail({
        from: `"Wandeazy" <noreply@${process.env.MAILGUN_DOMAIN || 'wandeazy.com'}>`,
        to: inquiry.email,
        subject: 'We received your travel inquiry!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0F172A; padding: 24px; text-align: center;">
                    <h1 style="color: #F97316; margin: 0;">Wandeazy</h1>
                </div>
                <div style="padding: 32px; background: #fff;">
                    <h2 style="color: #0F172A;">Hi ${inquiry.fullName}!</h2>
                    <p>Thank you for your travel inquiry. Our team will review your request and get back to you within 24 hours.</p>
                </div>
                <div style="background: #F8FAFC; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
                    <p>&copy; 2025 Wandeazy. All rights reserved.</p>
                </div>
            </div>
        `
    });
};

module.exports = { sendEmail, sendBookingConfirmation, sendInquiryAcknowledgment };
