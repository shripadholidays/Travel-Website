// src/middlewares/authorize.js
const ResponseHandler = require('../utils/response-handler');

module.exports = function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return ResponseHandler.fail(res, 401, 'Unauthorized: No user found');

        if (!allowedRoles.includes(req.user.role)) {
            return ResponseHandler.fail(res, 403, 'Forbidden: You do not have access to this resource');
        }

        next();
    };
};
