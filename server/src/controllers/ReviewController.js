const { populate } = require('../db/sql');
const { isDuplicate, validationText } = require('../db/errors');
const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { recomputeTourRating } = require('../services/rating-service');

// POST /tours/:tourId/reviews
exports.createReview = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { rating, title, content } = req.body;

        const tour = await TravelDestination.findById(tourId);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');

        // Check for existing review
        const existingReview = await Review.findOne('tour_id = ? AND user_id = ?', [tour._id, req.user._id]);
        if (existingReview) return ResponseHandler.fail(res, 400, 'You have already reviewed this tour');

        // Check if user has a confirmed booking
        const hasBooking = await Booking.findOne("user_id = ? AND tour_id = ? AND status IN ('confirmed', 'completed')", [req.user._id, tour._id]);

        const review = await Review.insert({
            tour: tour._id,
            user: req.user._id,
            rating,
            title,
            content,
            isVerifiedBooking: !!hasBooking
        });

        await recomputeTourRating(tour._id);

        const populatedReview = await populate(review, 'user', User, 'displayName profilePicture');

        return ResponseHandler.success(res, { review: populatedReview }, 'Review submitted successfully');
    } catch (err) {
        if (isDuplicate(err)) return ResponseHandler.fail(res, 400, 'You have already reviewed this tour');
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error creating review', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to submit review');
    }
};

// GET /tours/:tourId/reviews
exports.getTourReviews = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const [reviews, total] = await Promise.all([
            Review.find({ where: 'tour_id = ?', args: [String(tourId)], order: 'created_at DESC', limit: Number(limit), offset: (Number(page) - 1) * Number(limit) }),
            Review.count('tour_id = ?', [String(tourId)]),
        ]);
        await populate(reviews, 'user', User, 'displayName profilePicture');

        return ResponseHandler.success(res, {
            reviews,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Reviews fetched successfully');
    } catch (err) {
        logger.error('Error fetching reviews', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch reviews');
    }
};
