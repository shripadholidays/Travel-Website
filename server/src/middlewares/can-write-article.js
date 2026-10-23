const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ResponseHandler = require('../utils/response-handler');
const { completePastBookings } = require('../services/booking-service');
const { isStaff } = require('../config/permissions');

const REQUIRED_REVIEWS = 5;
const REQUIRED_ACCOUNT_AGE_DAYS = 30;

module.exports = async function canWriteArticle(req, res, next) {
    const user = req.user;
    if (!user) return ResponseHandler.fail(res, 401, 'Unauthorized');

    // Staff are always allowed
    if (isStaff(user)) return next();

    const accountAgeDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < REQUIRED_ACCOUNT_AGE_DAYS) {
        return ResponseHandler.fail(res, 403, `Your account must be at least ${REQUIRED_ACCOUNT_AGE_DAYS} days old to write articles. (${Math.floor(accountAgeDays)} days so far)`);
    }

    await completePastBookings({ user: user._id });
    const [reviewCount, completedBookings] = await Promise.all([
        Review.countDocuments({ user: user._id }),
        Booking.countDocuments({ user: user._id, status: 'completed' }),
    ]);

    if (reviewCount >= REQUIRED_REVIEWS || completedBookings >= 1) return next();

    return ResponseHandler.fail(res, 403, `To write articles you need at least ${REQUIRED_REVIEWS} reviews or 1 completed booking. You have ${reviewCount} review(s) and ${completedBookings} completed booking(s).`);
};
