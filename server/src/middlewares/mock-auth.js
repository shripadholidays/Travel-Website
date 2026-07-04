const mockAuth = (req, res, next) => {
    // Check if the mock user is already attached to the request
    if (!req.user) {
        // Create a mock user object. This object should mimic the structure
        // that a real authenticated user would have after Passport.js
        // deserializes them from the session.
        req.user = {
            id: 'mock-user-id',
            googleId: '1234567890',
            displayName: 'Mock User',
            email: 'test@example.com'
        };
    }
    next();
};

module.exports = mockAuth;
