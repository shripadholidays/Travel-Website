const UserInquiry = require('../models/UserInquiry');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

/**
 * Handles the creation of a new user inquiry.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
exports.createInquiry = async (req, res) => {
    try {
        // Create a new inquiry instance from the request body
        const newInquiry = new UserInquiry(req.body);

        // Save the new inquiry to the database
        const savedInquiry = await newInquiry.save();

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
