const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/email-service');

const { jwtSecret, tokenMaxAgeDays, oneTapMaxAgeMs, cookieName, sidCookieName, cookieSameSite } = config.auth;
const TOKEN_MAX_AGE_MS = tokenMaxAgeDays * 24 * 60 * 60 * 1000;

function setAuthCookie(res, user) {
    const token = jwt.sign(
        { sub: user._id.toString(), email: user.email, provider: 'local' },
        jwtSecret,
        { expiresIn: `${tokenMaxAgeDays}d` }
    );
    const isProd = config.app.nodeEnv === 'production';
    res.cookie(cookieName, token, {
        httpOnly: true,
        secure: isProd,
        maxAge: TOKEN_MAX_AGE_MS,
        sameSite: cookieSameSite,
    });
}

const { permissionsFor, ROLES } = require('../config/permissions');

function publicUser(user) {
    return {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        roleLabel: ROLES[user.role]?.label ?? user.role,
        permissions: permissionsFor(user.role),
        authProvider: user.authProvider,
        isEmailVerified: !!user.isEmailVerified || user.authProvider === 'google',
        createdAt: user.createdAt,
    };
}

// POST /auth/register
exports.register = async (req, res) => {
    try {
        const { displayName, email, password } = req.body || {};
        if (!displayName || !email || !password) {
            return ResponseHandler.fail(res, 400, 'Name, email and password are required.');
        }
        if (password.length < 6) {
            return ResponseHandler.fail(res, 400, 'Password must be at least 6 characters.');
        }

        const existing = await User.findByEmail(email);
        if (existing) {
            return ResponseHandler.fail(res, 409, 'An account with this email already exists.');
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

        const user = await User.insert({
            displayName: displayName.trim(),
            email: email.toLowerCase().trim(),
            password: await User.hashPassword(password),
            authProvider: 'local',
            emailVerificationToken: verificationToken,
            emailVerificationTokenExpiry: verificationExpiry,
        });

        const isProd = config.app.nodeEnv === 'production';
        const frontendOrigin = isProd ? config.cors.productionOrigin : config.cors.localOrigin;
        const verifyUrl = `${frontendOrigin}/verify-email/${verificationToken}`;
        sendVerificationEmail(user.email, verifyUrl).catch(() => {}); // fire-and-forget

        setAuthCookie(res, user);
        return ResponseHandler.success(res, { user: publicUser(user) }, 'Account created! Please check your email to verify your account.');
    } catch (err) {
        logger.error('Registration failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create account.');
    }
};

// POST /auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return ResponseHandler.fail(res, 400, 'Email and password are required.');
        }

        const user = await User.findByEmail(email, { secrets: true });
        if (!user || !user.password) {
            return ResponseHandler.fail(res, 401, 'Invalid email or password.');
        }

        const valid = await User.comparePassword(user, password);
        if (!valid) {
            return ResponseHandler.fail(res, 401, 'Invalid email or password.');
        }
        if (user.isSuspended) {
            return ResponseHandler.fail(res, 403, 'This account has been suspended. Contact support if you think this is a mistake.');
        }

        setAuthCookie(res, user);
        return ResponseHandler.success(res, { user: publicUser(user) }, 'Logged in successfully!');
    } catch (err) {
        logger.error('Login failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to log in.');
    }
};

// GET /auth/login — redirect to Google OAuth
exports.googleLogin = (req, res) => {
    const redirectUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    redirectUrl.searchParams.set('response_type', 'code');
    redirectUrl.searchParams.set('client_id', config.google.clientId);
    redirectUrl.searchParams.set('redirect_uri', config.google.callbackUrl);
    redirectUrl.searchParams.set('scope', 'openid profile email');
    redirectUrl.searchParams.set('access_type', 'offline');
    redirectUrl.searchParams.set('prompt', 'consent');
    res.redirect(redirectUrl.toString());
};

// GET /auth/callback — Google OAuth callback
exports.googleCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) return ResponseHandler.fail(res, 400, 'Authorization code is required.');

    const isProd = config.app.nodeEnv === 'production';
    const frontendOrigin = isProd ? config.cors.productionOrigin : config.cors.localOrigin;

    try {
        const { data: tokenData } = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                client_id:     config.google.clientId,
                client_secret: config.google.clientSecret,
                redirect_uri:  config.google.callbackUrl,
                grant_type:    'authorization_code',
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const decoded = jwt.decode(tokenData.id_token);
        const { email, name, picture, sub: googleId } = decoded;

        let user = await User.findByEmail(email);
        if (!user) {
            user = await User.insert({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google', isEmailVerified: true });
        }

        const cookieOpts = {
            httpOnly: true,
            secure: isProd,
            maxAge: tokenData.expires_in * 1000,
            sameSite: cookieSameSite,
        };
        res.cookie(cookieName,    tokenData.id_token,     cookieOpts);
        res.cookie(sidCookieName, tokenData.access_token, cookieOpts);

        return res.redirect(`${frontendOrigin}/dashboard`);
    } catch (error) {
        logger.error('Error during Google callback', { error: error.response?.data || error.message });
        return ResponseHandler.error(res, 500, 'Google token exchange failed');
    }
};

// POST /auth/token — token exchange (for SPA OAuth code flow)
exports.exchangeToken = async (req, res) => {
    const { code } = req.body;
    if (!code) return ResponseHandler.fail(res, 400, 'Authorization code is required.');

    const isProd = config.app.nodeEnv === 'production';

    try {
        const { data: tokenData } = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                grant_type:    'authorization_code',
                client_id:     config.google.clientId,
                client_secret: config.google.clientSecret,
                redirect_uri:  config.google.callbackUrl,
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const decoded = jwt.decode(tokenData.id_token);
        const { email, name, picture, sub: googleId } = decoded;

        let user = await User.findByEmail(email);
        if (!user) {
            user = await User.insert({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google', isEmailVerified: true });
        }

        const cookieOpts = {
            httpOnly: true,
            secure: isProd,
            maxAge: tokenData.expires_in * 1000,
            sameSite: cookieSameSite,
        };
        res.cookie(cookieName,    tokenData.id_token,     cookieOpts);
        res.cookie(sidCookieName, tokenData.access_token, cookieOpts);

        return ResponseHandler.token(res, tokenData);
    } catch (err) {
        logger.error('Error in /token route', { error: err.message });
        return ResponseHandler.error(res, 500, 'Internal Server Error during token exchange.');
    }
};

// POST /auth/google — Google One Tap (receives ID token directly)
exports.googleOneTap = async (req, res) => {
    const { credential } = req.body;
    if (!credential) return ResponseHandler.fail(res, 400, 'Google credential is required.');

    const isProd = config.app.nodeEnv === 'production';

    try {
        const { OAuth2Client } = require('google-auth-library');
        const oauthClient = new OAuth2Client(config.google.clientId);

        const ticket = await oauthClient.verifyIdToken({
            idToken: credential,
            audience: config.google.clientId,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findByEmail(email);
        if (!user) {
            user = await User.insert({ googleId, displayName: name, email, profilePicture: picture, authProvider: 'google', isEmailVerified: true });
        }

        res.cookie(cookieName, credential, {
            httpOnly: true,
            secure: isProd,
            maxAge: oneTapMaxAgeMs,
            sameSite: cookieSameSite,
        });

        return ResponseHandler.success(res, {
            user: {
                _id: user._id, googleId: user.googleId, displayName: user.displayName,
                email: user.email, profilePicture: user.profilePicture, role: user.role,
            }
        }, 'Logged in successfully!');
    } catch (err) {
        logger.error('Google One Tap verification failed', { error: err.message });
        return ResponseHandler.fail(res, 401, 'Invalid Google credential');
    }
};

exports.loginFailure = (req, res) => {
    ResponseHandler.fail(res, 401, 'Authentication failed!');
};

exports.logout = (req, res) => {
    const isProd = config.app.nodeEnv === 'production';
    const sameSite = cookieSameSite;
    res.clearCookie(sidCookieName, { sameSite, secure: isProd, path: '/' });
    res.clearCookie(cookieName,    { sameSite, secure: isProd, path: '/' });
    return ResponseHandler.success(res, null, 'Logged out successfully!');
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return ResponseHandler.fail(res, 400, 'Email is required.');

        const user = await User.findByEmail(email, { secrets: true });
        // Always respond the same way — don't reveal whether the account exists
        if (!user || user.authProvider !== 'local') {
            return ResponseHandler.success(res, null, 'If an account with that email exists, a reset link has been sent.');
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await User.save(user);

        const isProd = config.app.nodeEnv === 'production';
        const frontendOrigin = isProd ? config.cors.productionOrigin : config.cors.localOrigin;
        const resetUrl = `${frontendOrigin}/reset-password/${token}`;
        await sendPasswordResetEmail(user.email, resetUrl);

        return ResponseHandler.success(res, null, 'If an account with that email exists, a reset link has been sent.');
    } catch (err) {
        logger.error('Forgot password failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to process request.');
    }
};

// POST /auth/reset-password/:token
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body || {};
        if (!password) return ResponseHandler.fail(res, 400, 'New password is required.');
        if (password.length < 6) return ResponseHandler.fail(res, 400, 'Password must be at least 6 characters.');

        const user = await User.findOne('reset_password_token = ? AND reset_password_expiry > ?', [String(token), new Date().toISOString()], { secrets: true });

        if (!user) return ResponseHandler.fail(res, 400, 'Reset link is invalid or has expired.');

        user.password = await User.hashPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        await User.save(user);

        return ResponseHandler.success(res, null, 'Password reset successfully. You can now sign in.');
    } catch (err) {
        logger.error('Reset password failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to reset password.');
    }
};

// GET /auth/verify-email/:token
// POST /auth/resend-verification — a fresh link for the signed-in, unverified account
exports.resendVerification = async (req, res) => {
    try {
        const user = await User.findById(req.user._id, { secrets: true });
        if (!user) return ResponseHandler.fail(res, 404, 'Account not found.');
        if (user.isEmailVerified || user.authProvider === 'google') {
            return ResponseHandler.success(res, { alreadyVerified: true }, 'Your email is already verified.');
        }

        user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await User.save(user);

        const isProd = config.app.nodeEnv === 'production';
        const frontendOrigin = isProd ? config.cors.productionOrigin : config.cors.localOrigin;
        await sendVerificationEmail(user.email, `${frontendOrigin}/verify-email/${user.emailVerificationToken}`);

        return ResponseHandler.success(res, { sent: true }, `We've sent a new verification link to ${user.email}.`);
    } catch (err) {
        logger.error('Resend verification failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Could not send the verification email. Please try again.');
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne('email_verification_token = ? AND email_verification_token_expiry > ?', [String(token), new Date().toISOString()], { secrets: true });

        if (!user) return ResponseHandler.fail(res, 400, 'Verification link is invalid or has expired.');

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationTokenExpiry = null;
        await User.save(user);

        return ResponseHandler.success(res, { user: publicUser(user) }, 'Email verified successfully!');
    } catch (err) {
        logger.error('Email verification failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to verify email.');
    }
};
