const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
    windowMs: config.rateLimit.api.windowMs,
    max: config.rateLimit.api.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: config.rateLimit.auth.windowMs,
    max: config.rateLimit.auth.max,
    // Only failed attempts count, so brute-forcing is blocked but real sign-ins never are.
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many authentication attempts, please try again later.' }
});

const strictLimiter = rateLimit({
    windowMs: config.rateLimit.strict.windowMs,
    max: config.rateLimit.strict.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Rate limit exceeded. Please try again later.' }
});

const searchLimiter = rateLimit({
    windowMs: config.rateLimit.search.windowMs,
    max: config.rateLimit.search.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many searches, please slow down.' }
});

module.exports = { apiLimiter, authLimiter, strictLimiter, searchLimiter };
