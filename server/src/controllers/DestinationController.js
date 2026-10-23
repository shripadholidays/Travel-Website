const Destination = require('../models/Destination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const TravelDestination = require('../models/TravelDestination');
const { destinationPatterns, tourMatchesDestination } = require('../services/destination-match');

// Tour counts and ratings are worked out from the tours we actually sell
// (matched on location/title), never from hand-entered numbers.
async function withLiveStats(destinations) {
    const tours = await TravelDestination.find({ status: 'active' }, 'title location reviews').lean();
    return destinations.map((doc) => {
        const dest = doc.toObject ? doc.toObject() : doc;
        const patterns = destinationPatterns(dest);
        const matching = tours.filter((t) => tourMatchesDestination(t, patterns));
        const rated = matching.filter((t) => t.reviews?.basedOn > 0);
        const rating = rated.length ? Math.round((rated.reduce((s, t) => s + t.reviews.rating, 0) / rated.length) * 10) / 10 : 0;
        return { ...dest, tourCount: matching.length, rating };
    });
}

// GET /destinations
exports.getDestinations = async (req, res) => {
    try {
        const { page = 1, limit = 20, continent, search, active } = req.query;
        const query = {};

        if (continent) query.continent = continent;
        if (active !== undefined) query.isActive = active === 'true';
        if (search) query.$text = { $search: search };

        const destinations = await Destination.find(query)
            .sort({ tourCount: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Destination.countDocuments(query);

        return ResponseHandler.success(res, {
            destinations: await withLiveStats(destinations),
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Destinations fetched successfully');
    } catch (err) {
        logger.error('Error fetching destinations', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch destinations');
    }
};

// GET /destinations/:slug
exports.getDestinationBySlug = async (req, res) => {
    try {
        const destination = await Destination.findOne({ slug: req.params.slug });
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        const [withStats] = await withLiveStats([destination]);
        return ResponseHandler.success(res, { destination: withStats }, 'Destination fetched successfully');
    } catch (err) {
        logger.error('Error fetching destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch destination');
    }
};

// POST /destinations (admin)
exports.createDestination = async (req, res) => {
    try {
        const destination = await Destination.create(req.body);
        return ResponseHandler.success(res, { destination }, 'Destination created successfully');
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        if (err.code === 11000) return ResponseHandler.fail(res, 400, 'Destination with this slug already exists');
        logger.error('Error creating destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create destination');
    }
};

// PUT /destinations/:id (admin)
exports.updateDestination = async (req, res) => {
    try {
        const destination = await Destination.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, { destination }, 'Destination updated successfully');
    } catch (err) {
        logger.error('Error updating destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update destination');
    }
};

// DELETE /destinations/:id (admin)
exports.deleteDestination = async (req, res) => {
    try {
        const destination = await Destination.findByIdAndDelete(req.params.id);
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, null, 'Destination deleted successfully');
    } catch (err) {
        logger.error('Error deleting destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete destination');
    }
};
