const { all } = require('../db');
const { Where, containsAny } = require('../db/sql');
const { isDuplicate, validationText } = require('../db/errors');
const Destination = require('../models/Destination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { destinationNames, tourMatchesDestination } = require('../services/destination-match');
const { hasPermission, PERMISSIONS } = require('../config/permissions');

// The admin list (?scope=admin) shows hidden destinations too; everyone else only sees live ones
const adminScope = (req) => req.query.scope === 'admin' && hasPermission(req.user, PERMISSIONS.CATALOG);
const COORD = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v));

// Validation and duplicate-slug errors in words an editor can act on
function saveError(res, err, action) {
    if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
    if (isDuplicate(err)) return ResponseHandler.fail(res, 409, 'Another destination already uses this name or web address. Pick a different name.');
    logger.error(`Error ${action} destination`, { error: err.message });
    return ResponseHandler.error(res, 500, `Failed to ${action} destination`);
}

function cleanBody(body = {}) {
    const data = { ...body };
    for (const k of ['_id', 'tourCount', 'rating', 'createdAt', 'updatedAt']) delete data[k];
    if (data.coordinates) {
        const lat = COORD(data.coordinates.lat);
        const lng = COORD(data.coordinates.lng);
        // Blank coordinates mean "no map pin", not a pin at 0,0 in the ocean
        data.coordinates = lat === undefined || lng === undefined ? { lat: null, lng: null } : { lat, lng };
    }
    return data;
}

// Tour counts and ratings are worked out from the tours we actually sell
// (matched on location/title), never from hand-entered numbers.
async function withLiveStats(destinations) {
    const tours = await all("SELECT title, location, reviews_rating AS rating, reviews_based_on AS based_on FROM tours WHERE status = 'active'");
    return destinations.map((dest) => {
        const names = destinationNames(dest);
        const matching = tours.filter((t) => tourMatchesDestination(t, names));
        const rated = matching.filter((t) => t.based_on > 0);
        const rating = rated.length ? Math.round((rated.reduce((s, t) => s + t.rating, 0) / rated.length) * 10) / 10 : 0;
        return { ...dest, tourCount: matching.length, rating };
    });
}

// GET /destinations
exports.getDestinations = async (req, res) => {
    try {
        const admin = adminScope(req);
        const { page = 1, limit = admin ? 500 : 20, continent, search, active } = req.query;
        const where = new Where();

        if (continent) where.add('continent = ?', continent);
        if (!admin) where.add('is_active = 1');
        else if (active !== undefined) where.add('is_active = ?', active === 'true' ? 1 : 0);
        for (const word of String(search || '').trim().split(/\s+/).filter(Boolean).slice(0, 8)) {
            const m = containsAny(['name', 'country', 'description'], word);
            where.add(m.sql, ...m.args);
        }

        const [destinations, total] = await Promise.all([
            Destination.find({ where: where.sql, args: where.args, order: 'name COLLATE NOCASE ASC' }),
            Destination.count(where.sql, where.args),
        ]);
        // Public lists lead with the places that have the most tours
        let list = await withLiveStats(destinations);
        if (!admin) list.sort((a, b) => b.tourCount - a.tourCount || a.name.localeCompare(b.name));
        const perPage = Number(limit);
        list = list.slice((Number(page) - 1) * perPage, Number(page) * perPage);

        return ResponseHandler.success(res, {
            destinations: list,
            pagination: { total, page: Number(page), limit: perPage, pages: Math.ceil(total / perPage) }
        }, 'Destinations fetched successfully');
    } catch (err) {
        logger.error('Error fetching destinations', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch destinations');
    }
};

// GET /destinations/:slug
exports.getDestinationBySlug = async (req, res) => {
    try {
        const destination = await Destination.findOne('slug = ?', [req.params.slug]);
        // A hidden destination only exists for catalog staff (who preview it)
        if (!destination || (!destination.isActive && !hasPermission(req.user, PERMISSIONS.CATALOG))) {
            return ResponseHandler.fail(res, 404, 'Destination not found');
        }
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
        const destination = await Destination.insert(cleanBody(req.body));
        return ResponseHandler.success(res, { destination }, 'Destination created successfully');
    } catch (err) {
        return saveError(res, err, 'create');
    }
};

// PUT /destinations/:id (admin)
exports.updateDestination = async (req, res) => {
    try {
        const destination = await Destination.update(req.params.id, cleanBody(req.body));
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, { destination }, 'Destination updated successfully');
    } catch (err) {
        return saveError(res, err, 'update');
    }
};

// DELETE /destinations/:id (admin)
exports.deleteDestination = async (req, res) => {
    try {
        const destination = await Destination.remove(req.params.id);
        if (!destination) return ResponseHandler.fail(res, 404, 'Destination not found');
        return ResponseHandler.success(res, { destination: { _id: destination._id, name: destination.name } }, 'Destination deleted successfully');
    } catch (err) {
        logger.error('Error deleting destination', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete destination');
    }
};
