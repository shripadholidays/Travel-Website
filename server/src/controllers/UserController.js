const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// GET /users/profile
exports.getProfile = (req, res) => {
    ResponseHandler.success(res, { user: req.user }, 'Profile data retrieved successfully.');
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
