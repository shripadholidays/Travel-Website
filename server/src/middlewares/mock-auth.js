const config = require('../config');

const mockAuth = (req, res, next) => {
    if (!req.user) {
        req.user = {
            id:          config.mock.userId,
            googleId:    config.mock.googleId,
            displayName: config.mock.displayName,
            email:       config.mock.email,
        };
    }
    next();
};

module.exports = mockAuth;
