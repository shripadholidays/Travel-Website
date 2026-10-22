const Review = require('../models/Review');
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
        const existingReview = await Review.findOne({ tour: tourId, user: req.user._id });
        if (existingReview) return ResponseHandler.fail(res, 400, 'You have already reviewed this tour');

        // Check if user has a confirmed booking
        const hasBooking = await Booking.findOne({
            user: req.user._id,
            tour: tourId,
            status: { $in: ['confirmed', 'completed'] }
        });

        const review = await Review.create({
            tour: tourId,
            user: req.user._id,
            rating,
            title,
            content,
            isVerifiedBooking: !!hasBooking
        });

        await recomputeTourRating(tourId);

        const populatedReview = await Review.findById(review._id)
            .populate('user', 'displayName profilePicture');

        return ResponseHandler.success(res, { review: populatedReview }, 'Review submitted successfully');
    } catch (err) {
        if (err.code === 11000) return ResponseHandler.fail(res, 400, 'You have already reviewed this tour');
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        logger.error('Error creating review', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to submit review');
    }
};

// GET /tours/:tourId/reviews
exports.getTourReviews = async (req, res) => {
    try {
        const { tourId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ tour: tourId })
            .populate('user', 'displayName profilePicture')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Review.countDocuments({ tour: tourId });

        return ResponseHandler.success(res, {
            reviews,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Reviews fetched successfully');
    } catch (err) {
        logger.error('Error fetching reviews', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch reviews');
    }
};
