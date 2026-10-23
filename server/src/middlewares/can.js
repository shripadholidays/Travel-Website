const ResponseHandler = require('../utils/response-handler');
const { hasPermission, ROLES } = require('../config/permissions');

/**
 * Lets the request through when the signed-in user's role grants any of the given permissions.
 * Use after the auth guard.
 */
module.exports = function can(...permissions) {
    return (req, res, next) => {
        if (!req.user) return ResponseHandler.fail(res, 401, 'Unauthorized: No user found');
        if (permissions.some((p) => hasPermission(req.user, p))) return next();
        const role = ROLES[req.user.role]?.label ?? req.user.role;
        return ResponseHandler.fail(res, 403, `Your role (${role}) does not have access to this. Ask an administrator if you need it.`);
    };
};
