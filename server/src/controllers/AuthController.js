const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Issues our own session JWT and sets it in the auth cookie.
function setAuthCookie(res, user) {
    const token = jwt.sign(
        { sub: user._id.toString(), email: user.email, provider: 'local' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.cookie('wandeazy.token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: TOKEN_MAX_AGE,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    });
}

function publicUser(user) {
    return {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
    };
}

// POST /auth/register — email/password signup
exports.register = async (req, res) => {
    try {
        const { displayName, email, password } = req.body || {};
        if (!displayName || !email || !password) {
            return ResponseHandler.fail(res, 400, 'Name, email and password are required.');
        }
        if (password.length < 6) {
            return ResponseHandler.fail(res, 400, 'Password must be at least 6 characters.');
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return ResponseHandler.fail(res, 409, 'An account with this email already exists.');
        }

        const user = await User.create({
            displayName: displayName.trim(),
            email: email.toLowerCase().trim(),
            password,
            authProvider: 'local',
        });

        setAuthCookie(res, user);
        return ResponseHandler.success(res, { user: publicUser(user) }, 'Account created successfully!');
    } catch (err) {
        logger.error('Registration failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create account.');
    }
};

// POST /auth/login — email/password login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return ResponseHandler.fail(res, 400, 'Email and password are required.');
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !user.password) {
            return ResponseHandler.fail(res, 401, 'Invalid email or password.');
        }

        const valid = await user.comparePassword(password);
        if (!valid) {
            return ResponseHandler.fail(res, 401, 'Invalid email or password.');
        }

        setAuthCookie(res, user);
        return ResponseHandler.success(res, { user: publicUser(user) }, 'Logged in successfully!');
    } catch (err) {
        logger.error('Login failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to log in.');
    }
};

// Redirect to Google OAuth page
exports.googleLogin = (req, res) => {
    const redirectUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    redirectUrl.searchParams.set('response_type', 'code');
    redirectUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    redirectUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL);
    redirectUrl.searchParams.set('scope', 'openid profile email');
    redirectUrl.searchParams.set('access_type', 'offline');
    redirectUrl.searchParams.set('prompt', 'consent');

    res.redirect(redirectUrl.toString());
};

// Google callback after login
exports.googleCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) return ResponseHandler.fail(res, 400, 'Authorization code is required.');

    try {
        const { data: tokenData } = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                grant_type: 'authorization_code'
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const decoded = jwt.decode(tokenData.id_token);
        const { email, name, picture, sub: googleId } = decoded;

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google' });
        }

        // Set secure cookies
        res.cookie('wandeazy.token', tokenData.id_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || "none",
        });

        res.cookie('wandeazy.sid', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || "none",
        });

        // Redirect to dashboard (frontend can read user info from cookies)
        return res.redirect(`${process.env.PRODUCTION_FRONTEND_ORIGIN}`);

    } catch (error) {
        logger.error('Error during Google callback', { error: error.response?.data || error.message });
        return ResponseHandler.error(res, 500, 'Google token exchange failed');
    }
};

// Token exchange endpoint (if needed)
exports.exchangeToken = async (req, res) => {
    // Only accept the auth code from the client. Secrets/client_id come from env ONLY —
    // never trust these from the request body.
    const { code } = req.body;

    if (!code) return ResponseHandler.fail(res, 400, 'Authorization code is required.');

    try {
        const { data: tokenData } = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const decoded = jwt.decode(tokenData.id_token);
        const { email, name, picture, sub: googleId } = decoded;

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google' });
        }

        res.cookie('wandeazy.token', tokenData.id_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || "none",
        });

        res.cookie('wandeazy.sid', tokenData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokenData.expires_in * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || "none",
        });

        return ResponseHandler.token(res, tokenData);

    } catch (err) {
        logger.error('Error in /token route', { error: err.message });
        return ResponseHandler.error(res, 500, 'Internal Server Error during token exchange.');
    }
};

// Google One Tap / Sign-In with Google (receives credential = ID token directly)
exports.googleOneTap = async (req, res) => {
    const { credential } = req.body;
    if (!credential) return ResponseHandler.fail(res, 400, 'Google credential is required.');

    try {
        const { OAuth2Client } = require('google-auth-library');
        const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        const ticket = await oauthClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google' });
        }

        res.cookie('wandeazy.token', credential, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 1000,
            sameSite: process.env.COOKIE_SAME_SITE || 'none',
        });

        return ResponseHandler.success(res, { user: {
            _id: user._id,
            googleId: user.googleId,
            displayName: user.displayName,
            email: user.email,
            profilePicture: user.profilePicture,
            role: user.role,
        }}, 'Logged in successfully!');
    } catch (err) {
        logger.error('Google One Tap verification failed', { error: err.message });
        return ResponseHandler.fail(res, 401, 'Invalid Google credential');
    }
};

// Login failure
exports.loginFailure = (req, res) => {
    ResponseHandler.fail(res, 401, 'Authentication failed!');
};

// Logout
exports.logout = (req, res, next) => {
    const secure = process.env.NODE_ENV === 'production';
    const sameSite = process.env.COOKIE_SAME_SITE || (secure ? 'none' : 'lax');
    res.clearCookie('wandeazy.sid', { sameSite, secure, path: '/' });
    res.clearCookie('wandeazy.token', { sameSite, secure, path: '/' });
    if (req.session) {
        return req.session.destroy(() => ResponseHandler.success(res, null, 'Logged out successfully!'));
    }
    return ResponseHandler.success(res, null, 'Logged out successfully!');
};
