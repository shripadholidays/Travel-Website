const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');

const SEARCH_FIELDS = ['title', 'location', 'categories', 'overview.about'];
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every word must appear in at least one field (title, location, category or description),
// so "Japan", "Nepal trek" and partial words like "Toky" all find their tours.
function buildSearchQuery(search) {
    const words = String(search).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    if (words.length === 0) return {};
    return {
        $and: words.map((word) => {
            const re = new RegExp(escapeRegex(word), 'i');
            return { $or: SEARCH_FIELDS.map((field) => ({ [field]: re })) };
        }),
    };
}
exports.buildSearchQuery = buildSearchQuery;

// GET /tours - List with filters & pagination
exports.getTours = async (req, res) => {
    try {
        const {
            page = 1,
            limit = config.pagination.defaultLimit,
            category,
            country,
            minPrice,
            maxPrice,
            minDays,
            maxDays,
            minRating,
            validFrom,
            validTo,
            search,
            sort: sortParam,
            isFeatured,
            status
        } = req.query;

        const query = {};

        if (category) {
            query.categories = { $in: category.split(',') };
        }
        if (country) {
            query.location = { $in: country.split(',') };
        }
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (minDays || maxDays) {
            query['duration.days'] = {};
            if (minDays) query['duration.days'].$gte = Number(minDays);
            if (maxDays) query['duration.days'].$lte = Number(maxDays);
        }
        if (minRating) {
            query['reviews.rating'] = { $gte: Number(minRating) };
        }
        if (validFrom || validTo) {
            query.validity = {};
            if (validFrom) query.validity.$gte = new Date(validFrom);
            if (validTo) query.validity.$lte = new Date(validTo);
        }
        if (search) {
            Object.assign(query, buildSearchQuery(search));
        }
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }
        if (status) {
            query.status = status;
        }

        let sortOptions = { 'reviews.rating': -1, price: 1 };
        if (sortParam === 'price_low') sortOptions = { price: 1 };
        else if (sortParam === 'price_high') sortOptions = { price: -1 };
        else if (sortParam === 'rating') sortOptions = { 'reviews.rating': -1 };
        else if (sortParam === 'newest') sortOptions = { createdAt: -1 };

        const pageNum = Number(page);
        const limitNum = Number(limit);

        const tours = await TravelDestination.find(query)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .sort(sortOptions);

        const total = await TravelDestination.countDocuments(query);

        return ResponseHandler.success(res, {
            tours,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
        }, 'Tours fetched successfully');
    } catch (err) {
        logger.error('Error fetching tours', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch tours');
    }
};

// GET /tours/recommended — returns admin-featured tours first, falls back to top-rated
exports.getRecommendedTours = async (req, res) => {
    try {
        let tours = await TravelDestination.find({ isFeatured: true, status: 'active' })
            .sort({ 'reviews.rating': -1 })
            .limit(config.tours.recommendedFeaturedLimit);
        if (tours.length === 0) {
            tours = await TravelDestination.find({ status: { $ne: 'draft' } })
                .sort({ 'reviews.rating': -1 })
                .limit(config.tours.recommendedFallbackLimit);
        }
        return ResponseHandler.success(res, { tours }, 'Recommended tours fetched successfully');
    } catch (err) {
        logger.error('Error fetching recommended tours', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch recommended tours');
    }
};

// GET /tours/:id
exports.getTourById = async (req, res) => {
    try {
        const tour = await TravelDestination.findById(req.params.id);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        return ResponseHandler.success(res, { tour }, 'Tour fetched successfully');
    } catch (err) {
        logger.error('Error fetching tour', { error: err.message, id: req.params.id });
        return ResponseHandler.error(res, 500, 'Failed to fetch tour');
    }
};

// POST /tours
exports.createTour = async (req, res) => {
    try {
        const tour = await TravelDestination.create(req.body);
        return ResponseHandler.success(res, { tour }, 'Tour created successfully');
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        logger.error('Error creating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create tour');
    }
};

// PUT /tours/:id
exports.updateTour = async (req, res) => {
    try {
        const tour = await TravelDestination.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        return ResponseHandler.success(res, { tour }, 'Tour updated successfully');
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        logger.error('Error updating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update tour');
    }
};

// DELETE /tours/:id
exports.deleteTour = async (req, res) => {
    try {
        const tour = await TravelDestination.findByIdAndDelete(req.params.id);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        return ResponseHandler.success(res, null, 'Tour deleted successfully');
    } catch (err) {
        logger.error('Error deleting tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete tour');
    }
};

// POST /tours/bulk
exports.bulkCreateTours = async (req, res) => {
    try {
        const tours = req.body.tours;
        if (!Array.isArray(tours) || tours.length === 0) {
            return ResponseHandler.fail(res, 400, 'No tours provided for bulk upload');
        }
        const createdTours = await TravelDestination.insertMany(tours, { ordered: false });
        return ResponseHandler.success(res, { tours: createdTours }, 'Bulk upload successful');
    } catch (err) {
        logger.error('Error in bulk upload', { error: err.message });
        return ResponseHandler.error(res, 500, 'Bulk upload failed');
    }
};
