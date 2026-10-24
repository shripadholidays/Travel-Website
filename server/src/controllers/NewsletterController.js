
const ResponseHandler = require('../utils/response-handler')
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { isDuplicate, validationText } = require('../db/errors');
const logger = require('../utils/logger');

exports.subscribeNewsletter = async (req, res) => {
    try {
        
        const { email } = req.body || {};
        if (!email) return ResponseHandler.fail(res, 400, 'Email is required');

        const existing = await NewsletterSubscriber.findOne('email = ?', [String(email).toLowerCase().trim()]);
        if (existing) return ResponseHandler.fail(res, 400, 'Already subscribed');

        const subscriber = await NewsletterSubscriber.insert({ email });
        return ResponseHandler.success(res, subscriber, 'Subscribed successfully');
    } catch (err) {
        if (isDuplicate(err)) return ResponseHandler.fail(res, 400, 'Already subscribed');
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error during newsletter subscription', { error: err.message });
        return ResponseHandler.error(res, 500, 'Internal server error');
    }
}