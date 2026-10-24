const bcrypt = require('bcryptjs');
const { defineTable } = require('../db/table');
const { ROLE_NAMES } = require('../config/permissions');

// Google OAuth and email/password accounts. Password and token fields are hidden:
// they only load with { secrets: true }.
const User = defineTable({
    table: 'users',
    fields: {
        googleId: { type: 'text', unique: true },
        displayName: { type: 'text', required: true, label: 'Name' },
        email: { type: 'text', required: true, unique: true, lowercase: true, trim: true, label: 'Email' },
        password: { type: 'text', hidden: true },
        authProvider: { type: 'text', enum: ['google', 'local'], default: 'google' },
        profilePicture: 'text',
        role: { type: 'text', enum: ROLE_NAMES, default: 'user' },
        // A suspended account cannot sign in or use the API (bookings and history are kept)
        isSuspended: { type: 'bool', default: false },
        isEmailVerified: { type: 'bool', default: false },
        emailVerificationToken: { type: 'text', hidden: true },
        emailVerificationTokenExpiry: { type: 'date', hidden: true },
        resetPasswordToken: { type: 'text', hidden: true },
        resetPasswordExpiry: { type: 'date', hidden: true },
    },
});

User.hashPassword = (plain) => bcrypt.hash(String(plain), 10);

/** Compares a plaintext password with the stored hash (the user must be loaded with secrets). */
User.comparePassword = (user, candidate) => (user?.password ? bcrypt.compare(String(candidate), user.password) : Promise.resolve(false));

User.findByEmail = (email, opts) => User.findOne('email = ?', [String(email || '').toLowerCase().trim()], opts);

module.exports = User;
