const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema — supports both Google OAuth and manual email/password accounts.
const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true, // allow multiple docs without googleId (manual signups)
    },
    displayName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        select: false, // never returned by default
    },
    authProvider: {
        type: String,
        enum: ['google', 'local'],
        default: 'google',
    },
    profilePicture: String,
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
}, { timestamps: true });

// Hash password before saving when it has been set/changed.
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Compare a plaintext password against the stored hash.
userSchema.methods.comparePassword = function (candidate) {
    if (!this.password) return Promise.resolve(false);
    return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
