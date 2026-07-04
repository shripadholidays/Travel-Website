const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

module.exports = async function isLoggedIn(req, res, next) {
    const token = req.cookies?.['wandeazy.token'];
    if (!token) return ResponseHandler.fail(res, 401, 'Unauthorized: No token provided');

    // 1) Try our own JWT (manual email/password sessions)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded?.email) {
            const user = await User.findOne({ email: decoded.email });
            if (!user) return ResponseHandler.fail(res, 401, 'Unauthorized: User not found');
            req.user = user;
            return next();
        }
    } catch {
        // Not our JWT — fall through to Google verification.
    }

    // 2) Fall back to Google ID token verification
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload?.email;
        if (!email) return ResponseHandler.fail(res, 401, 'Unauthorized: Token missing email');

        const user = await User.findOne({ email });
        if (!user) return ResponseHandler.fail(res, 401, 'Unauthorized: User not found');

        req.user = user;
        return next();
    } catch (err) {
        logger.error(`[Worker ${process.pid}] Token verification failed`, { error: err.message });
        return ResponseHandler.fail(res, 401, 'Unauthorized: Invalid token');
    }
};
