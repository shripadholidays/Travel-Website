const TravelDestination = require('../models/TravelDestination');
const Destination = require('../models/Destination');
const { destinationTourQuery } = require('../services/destination-match');
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
            status,
            place
        } = req.query;

        const query = {};

        if (category) {
            query.categories = { $in: category.split(',') };
        }
        if (country) {
            query.location = { $in: country.split(',') };
        }
        // A whole place name inside the location ("Japan" matches "Tokyo, Japan")
        if (place) {
            query.location = { $regex: `\\b${escapeRegex(String(place))}\\b`, $options: 'i' };
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
        // Specific tours by id (e.g. a visitor's recently viewed list), always with current data
        if (req.query.ids) {
            const ids = String(req.query.ids).split(',').filter((id) => /^[a-f0-9]{24}$/i.test(id)).slice(0, 50);
            query._id = { $in: ids };
        }
        // The tours of one destination, by the same rule as its tour count
        if (req.query.destination) {
            const destination = await Destination.findOne({ slug: String(req.query.destination) }).lean();
            query.$and = [...(query.$and || []), destination ? destinationTourQuery(destination) : { _id: null }];
        }
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }
        // Travellers only ever see live tours; admins can list drafts and hidden ones too
        if (req.user?.role === 'admin') {
            if (status) query.status = status;
        } else {
            query.status = 'active';
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
            tours = await TravelDestination.find({ status: 'active' })
                .sort({ 'reviews.rating': -1 })
                .limit(config.tours.recommendedFallbackLimit);
        }
        return ResponseHandler.success(res, { tours }, 'Recommended tours fetched successfully');
    } catch (err) {
        logger.error('Error fetching recommended tours', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch recommended tours');
    }
};

// GET /tours/facets
// The categories and places live tours actually cover, with counts, for the search filters
exports.getTourFacets = async (req, res) => {
    try {
        const tours = await TravelDestination.find({ status: 'active' }, 'categories location').lean();
        const tally = (values) => {
            const counts = new Map();
            for (const v of values) {
                const key = String(v || '').trim();
                if (key) counts.set(key, (counts.get(key) || 0) + 1);
            }
            return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        };
        return ResponseHandler.success(res, {
            categories: tally(tours.flatMap((t) => t.categories || [])),
            // "Tokyo, Japan" → "Japan": the country (or the place itself when there is no comma)
            places: tally(tours.map((t) => (t.location || '').split(',').pop())),
        }, 'Tour facets fetched successfully');
    } catch (err) {
        logger.error('Error fetching tour facets', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch tour facets');
    }
};

// GET /tours/:id
exports.getTourById = async (req, res) => {
    try {
        const tour = await TravelDestination.findById(req.params.id);
        // A draft or hidden tour does not exist for anyone but admins (who preview it)
        if (!tour || (tour.status !== 'active' && req.user?.role !== 'admin')) {
            return ResponseHandler.fail(res, 404, 'Tour not found');
        }
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
