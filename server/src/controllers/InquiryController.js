const UserInquiry = require('../models/UserInquiry');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { sendInquiryAcknowledgment, sendAdminAlert } = require('../services/email-service');

// Only the contact form's own fields; status and timestamps are never client-controlled.
const FIELDS = ['fullName', 'email', 'phoneNumber', 'preferredTravelDate', 'numberOfTravelers', 'message', 'topic', 'context', 'source'];

/**
 * Handles the creation of a new user inquiry.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
exports.createInquiry = async (req, res) => {
    try {
        const data = Object.fromEntries(FIELDS.filter((f) => req.body?.[f] !== undefined).map((f) => [f, req.body[f]]));
        if (!data.preferredTravelDate) delete data.preferredTravelDate;
        // Without trip details, the message is the only thing the team has to go on
        if (data.topic && data.topic !== 'trip' && !String(data.message || '').trim()) {
            return ResponseHandler.fail(res, 400, 'Please tell us how we can help.');
        }
        const newInquiry = new UserInquiry(data);

        // Save the new inquiry to the database
        const savedInquiry = await newInquiry.save();

        // Acknowledge the traveller and alert the team; neither may fail the request.
        Promise.allSettled([
            sendInquiryAcknowledgment(savedInquiry),
            sendAdminAlert(`New inquiry from ${savedInquiry.fullName}`, [
                ['Topic', savedInquiry.topic],
                ['About', savedInquiry.context],
                ['Sent from', savedInquiry.source],
                ['Email', savedInquiry.email],
                ['Phone', savedInquiry.phoneNumber],
                ['Travel date', savedInquiry.preferredTravelDate ? new Date(savedInquiry.preferredTravelDate).toDateString() : 'Flexible'],
                ['Travellers', savedInquiry.numberOfTravelers],
                ['Message', savedInquiry.message],
            ]),
        ]).catch(() => {});

        // Send a success response with the created inquiry data
        return ResponseHandler.success(res, savedInquiry, 'Inquiry submitted successfully!');
    } catch (err) {
        // Handle validation errors or database errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }

        logger.error('Error during inquiry submission', { error: err.message });
        return ResponseHandler.error(res, 500, 'Internal Server Error during inquiry submission.');
    }
};
