const isLoggedIn = require('./auth-guard');

/**
 * Sets req.user when a valid session cookie is present, but never rejects
 * the request: public pages work the same for guests, while admins get
 * extra data (e.g. draft tours).
 */
module.exports = function optionalAuth(req, res, next) {
    let done = false;
    const proceed = () => {
        if (done) return;
        done = true;
        next();
    };
    // Swallow the guard's 401 response and carry on as a guest
    const guestRes = { status: () => guestRes, json: () => { req.user = undefined; proceed(); } };
    isLoggedIn(req, guestRes, proceed);
};
