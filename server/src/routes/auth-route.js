const express = require('express');
const { googleLogin, googleCallback, exchangeToken, googleOneTap, loginFailure, logout, register, login, forgotPassword, resetPassword, verifyEmail } = require('../controllers/AuthController');

const router = express.Router();

// --- Manual email/password auth ---
router.post('/register', register);
router.post('/login', login);

// --- Password reset ---
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// --- Email verification ---
router.get('/verify-email/:token', verifyEmail);

// --- Google Login ---
router.get('/login', googleLogin);
router.get('/signup', googleLogin);

// --- Google OAuth callback ---
router.get('/callback', googleCallback);

// --- OAuth2 token exchange endpoint ---
router.post('/token', exchangeToken);

// --- Google One Tap / Sign-In with Google credential ---
router.post('/google', googleOneTap);

// --- Failed login ---
router.get('/login/failure', loginFailure);

// --- Logout ---
router.post('/logout', logout);

module.exports = router;
