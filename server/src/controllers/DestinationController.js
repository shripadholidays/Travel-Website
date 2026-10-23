const Destination = require('../models/Destination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const TravelDestination = require('../models/TravelDestination');
const { destinationPatterns, tourMatchesDestination } = require('../services/destination-match');
const { hasPermission, PERMISSIONS } = require('../config/permissions');

// The admin list (?scope=admin) shows hidden destinations too; everyone else only sees live ones
const adminScope = (req) => req.query.scope === 'admin' && hasPermission(req.user, PERMISSIONS.CATALOG);
const COORD = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v));

// Validation and duplicate-slug errors in words an editor can act on
function saveError(res, err, action) {
    if (err.name === 'ValidationError') {
        return ResponseHandler.fail(res, 400, Object.values(err.errors).map((e) => e.message.replace('Path ', '').replace(/`/g, '')).join(', '));
    }
    if (err.code === 11000) return ResponseHandler.fail(res, 409, 'Another destination already uses this name or web address. Pick a different name.');
    logger.error(`Error ${action} destination`, { error: err.message });
    return ResponseHandler.error(res, 500, `Failed to ${action} destination`);
}

function cleanBody(body = {}) {
    const data = { ...body };
    delete data.tourCount;
    delete data.rating;
    if (data.coordinates) {
        const lat = COORD(data.coordinates.lat);
        const lng = COORD(data.coordinates.lng);
        if (lat === undefined || lng === undefined) {
            // Blank coordinates mean "no map pin", not a pin at 0,0 in the ocean
            delete data.coordinates;
            data.$unset = { coordinates: 1 };
        } else {
            data.coordinates = { lat, lng };
        }
    }
    return data;
}

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
        const admin = adminScope(req);
        const { page = 1, limit = admin ? 500 : 20, continent, search, active } = req.query;
        const query = {};

        if (continent) query.continent = continent;
        if (!admin) query.isActive = true;
        else if (active !== undefined) query.isActive = active === 'true';
        if (search) query.$text = { $search: search };

        const destinations = await Destination.find(query)
            .sort(admin ? { name: 1 } : { tourCount: -1, name: 1 })
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
        // A hidden destination only exists for catalog staff (who preview it)
        if (destination && !destination.isActive && !hasPermission(req.user, PERMISSIONS.CATALOG)) {
            return ResponseHandler.fail(res, 404, 'Destination not found');
        }
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
        const data = cleanBody(req.body);
        delete data.$unset;
        const destination = await Destination.create(data);
        return ResponseHandler.success(res, { destination }, 'Destination created successfully');
    } catch (err) {
        return saveError(res, err, 'create');
    }
};

// PUT /destinations/:id (admin)
exports.updateDestination = async (req, res) => {
    try {
        const destination = await Destination.findByIdAndUpdate(
            req.params.id, cleanBody(req.body), { new: true, runValidators: true }
        );
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, { destination }, 'Destination updated successfully');
    } catch (err) {
        return saveError(res, err, 'update');
    }
};

// DELETE /destinations/:id (admin)
exports.deleteDestination = async (req, res) => {
    try {
        const destination = await Destination.findByIdAndDelete(req.params.id);
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, { destination: { _id: destination._id, name: destination.name } }, 'Destination deleted successfully');
    } catch (err) {
        logger.error('Error deleting destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete destination');
    }
};
