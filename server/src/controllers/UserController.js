const User = require('../models/User');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ResponseHandler = require('../utils/response-handler');
const { completePastBookings } = require('../services/booking-service');
const logger = require('../utils/logger');

const REQUIRED_REVIEWS = 5;
const REQUIRED_ACCOUNT_AGE_DAYS = 30;

// GET /users/profile
exports.getProfile = (req, res) => {
    const user = req.user.toObject ? req.user.toObject() : { ...req.user };
    // Google has already verified these addresses (older accounts were saved without the flag)
    if (user.authProvider === 'google') user.isEmailVerified = true;
    ResponseHandler.success(res, { user }, 'Profile data retrieved successfully.');
};

// GET /users/write-eligibility
exports.getWriteEligibility = async (req, res) => {
    try {
        const user = req.user;
        const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const isPrivileged = user.role === 'admin' || user.role === 'moderator';

        if (isPrivileged) {
            return ResponseHandler.success(res, {
                eligible: true,
                reviewCount: null,
                completedBookings: null,
                accountAgeDays,
                requirements: { reviews: REQUIRED_REVIEWS, accountAgeDays: REQUIRED_ACCOUNT_AGE_DAYS },
                reason: 'privileged',
            });
        }

        await completePastBookings({ user: user._id });
        const [reviewCount, completedBookings] = await Promise.all([
            Review.countDocuments({ user: user._id }),
            Booking.countDocuments({ user: user._id, status: 'completed' }),
        ]);

        const ageOk = accountAgeDays >= REQUIRED_ACCOUNT_AGE_DAYS;
        const engagementOk = reviewCount >= REQUIRED_REVIEWS || completedBookings >= 1;
        const eligible = ageOk && engagementOk;

        return ResponseHandler.success(res, {
            eligible,
            reviewCount,
            completedBookings,
            accountAgeDays,
            requirements: { reviews: REQUIRED_REVIEWS, accountAgeDays: REQUIRED_ACCOUNT_AGE_DAYS },
        });
    } catch (err) {
        logger.error('Error fetching write eligibility', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch eligibility.');
    }
};

// PATCH /users/profile
exports.updateProfile = async (req, res) => {
    try {
        const { displayName, profilePicture } = req.body;
        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (profilePicture) updates.profilePicture = profilePicture;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        return ResponseHandler.success(res, { user }, 'Profile updated successfully');
    } catch (err) {
        logger.error('Error updating profile', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update profile');
    }
};
