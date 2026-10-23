const mongoose = require('mongoose');
const TravelDestination = require('../models/TravelDestination');
const Booking = require('../models/Booking');
const Collection = require('../models/Collection');
const Destination = require('../models/Destination');
const { destinationTourQuery } = require('../services/destination-match');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { hasPermission, PERMISSIONS } = require('../config/permissions');

// Catalog staff can list and preview tours that are not live yet
const canSeeAll = (user) => hasPermission(user, PERMISSIONS.CATALOG);

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
        // Everyone sees live tours only; the admin list (?scope=admin) also shows drafts and hidden ones
        const admin = req.query.scope === 'admin' && canSeeAll(req.user);
        if (admin) {
            if (status && status !== 'all') query.status = status;
        } else {
            query.status = 'active';
        }

        let sortOptions = { 'reviews.rating': -1, price: 1 };
        if (sortParam === 'price_low') sortOptions = { price: 1 };
        else if (sortParam === 'price_high') sortOptions = { price: -1 };
        else if (sortParam === 'rating') sortOptions = { 'reviews.rating': -1 };
        else if (sortParam === 'newest') sortOptions = { createdAt: -1 };
        else if (sortParam === 'updated') sortOptions = { updatedAt: -1 };
        else if (sortParam === 'title') sortOptions = { title: 1 };

        const pageNum = Number(page);
        const limitNum = Number(limit);

        const tours = await TravelDestination.find(query)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .sort(sortOptions)
            .populate(admin ? { path: 'updatedBy', select: 'displayName' } : []);

        const total = await TravelDestination.countDocuments(query);

        // Tab counts for the admin list (same filters, every status)
        let statusCounts;
        if (admin) {
            const { status: ignored, ...rest } = query;
            const rows = await TravelDestination.aggregate([{ $match: rest }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
            statusCounts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
        }

        return ResponseHandler.success(res, {
            tours,
            statusCounts,
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
        if (!tour || (tour.status !== 'active' && !canSeeAll(req.user))) {
            return ResponseHandler.fail(res, 404, 'Tour not found');
        }
        return ResponseHandler.success(res, { tour }, 'Tour fetched successfully');
    } catch (err) {
        logger.error('Error fetching tour', { error: err.message, id: req.params.id });
        return ResponseHandler.error(res, 500, 'Failed to fetch tour');
    }
};

// Turns an editor's form (or an import row) into a clean tour document
function normalizeTour(input = {}, { partial = false } = {}) {
    const data = { ...input };
    // Ratings come from real reviews and the audit fields from the session, never from the form
    delete data.reviews;
    delete data.createdBy;
    delete data.updatedBy;
    delete data._id;

    if (!partial || 'currency' in data) data.currency = 'USD';
    if (typeof data.title === 'string') data.title = data.title.trim();
    if (typeof data.location === 'string') data.location = data.location.trim();
    if ('price' in data) data.price = Number(data.price);
    if (data.duration) {
        const days = Math.max(1, Math.round(Number(data.duration.days) || 1));
        const rawNights = data.duration.nights;
        const nights = rawNights === undefined || rawNights === '' ? days - 1 : Math.max(0, Math.round(Number(rawNights) || 0));
        data.duration = { days, nights };
    }
    if (!partial && !data.validity) data.validity = new Date(Date.now() + 365 * 864e5);
    if (typeof data.categories === 'string') data.categories = data.categories.split(',');
    if (Array.isArray(data.categories)) data.categories = [...new Set(data.categories.map((c) => String(c).trim()).filter(Boolean))];
    if (Array.isArray(data.images)) data.images = data.images.map((u) => String(u || '').trim()).filter(Boolean);
    // Half-filled rows are dropped instead of failing the whole save
    if (Array.isArray(data.inclusions)) data.inclusions = data.inclusions.filter((x) => x && String(x.title || '').trim());
    if (Array.isArray(data.itinerary)) {
        const fallbackPlace = String(data.location || '').trim() || 'See itinerary';
        data.itinerary = data.itinerary
            .filter((d) => d && (String(d.activity || '').trim() || String(d.location || '').trim()))
            .map((d, i) => ({
                day: i + 1,
                activity: String(d.activity || '').trim() || 'Free time',
                location: String(d.location || '').trim() || fallbackPlace,
            }));
    }
    if (data.overview) {
        data.overview = {
            ...data.overview,
            gallery: (data.overview.gallery || []).filter((g) => g && String(g.imageURL || '').trim()),
        };
    }
    if ('isFeatured' in data) data.isFeatured = data.isFeatured === true || data.isFeatured === 'true';
    if ('maxGroupSize' in data) {
        const max = Number(data.maxGroupSize);
        data.maxGroupSize = data.maxGroupSize !== null && data.maxGroupSize !== '' && Number.isFinite(max) && max >= 1 ? Math.round(max) : null;
    }
    if (data.coordinates) {
        const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
        data.coordinates = { lat: num(data.coordinates.lat), lng: num(data.coordinates.lng) };
    }
    return data;
}
exports.normalizeTour = normalizeTour;

const FIELD_NAMES = {
    'duration.days': 'Days', 'duration.nights': 'Nights', price: 'Price', validity: 'Last available date',
    maxGroupSize: 'Max group size', 'coordinates.lat': 'Latitude', 'coordinates.lng': 'Longitude',
};

function validationMessage(err) {
    return Object.values(err.errors).map((e) => {
        if (e.name === 'CastError') return `${FIELD_NAMES[e.path] || e.path} has an invalid value`;
        return e.message.replace(/^Path `([^`]+)` is required\.$/, (m, path) => `${FIELD_NAMES[path] || path} is required`);
    }).join(', ');
}

// POST /tours
exports.createTour = async (req, res) => {
    try {
        const tour = await TravelDestination.create({ ...normalizeTour(req.body), createdBy: req.user._id, updatedBy: req.user._id });
        return ResponseHandler.success(res, { tour }, 'Tour created successfully');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationMessage(err));
        logger.error('Error creating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create tour');
    }
};

// PUT /tours/:id
exports.updateTour = async (req, res) => {
    try {
        const tour = await TravelDestination.findByIdAndUpdate(
            req.params.id,
            { ...normalizeTour(req.body, { partial: true }), updatedBy: req.user._id },
            { new: true, runValidators: true }
        ).populate('updatedBy', 'displayName');
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        return ResponseHandler.success(res, { tour }, 'Tour updated successfully');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationMessage(err));
        if (err.name === 'CastError') return ResponseHandler.fail(res, 400, `${FIELD_NAMES[err.path] || err.path} has an invalid value`);
        logger.error('Error updating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update tour');
    }
};

// A tour with bookings is part of someone's trip history: hide it instead of deleting it
async function bookingCounts(ids) {
    const rows = await Booking.aggregate([
        { $match: { tour: { $in: ids.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
        { $group: { _id: '$tour', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.count]));
}

async function removeTours(ids) {
    if (ids.length === 0) return;
    await TravelDestination.deleteMany({ _id: { $in: ids } });
    // Collections should not keep pointing at tours that no longer exist
    await Collection.updateMany({ tours: { $in: ids } }, { $pull: { tours: { $in: ids } } });
}

// DELETE /tours/:id
exports.deleteTour = async (req, res) => {
    try {
        const tour = await TravelDestination.findById(req.params.id);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        const booked = (await bookingCounts([tour._id])).get(String(tour._id)) || 0;
        if (booked > 0) {
            return ResponseHandler.fail(res, 409, `"${tour.title}" has ${booked} booking${booked === 1 ? '' : 's'}, so it can't be deleted. Set its status to Hidden to take it off the site.`);
        }
        await removeTours([tour._id]);
        return ResponseHandler.success(res, { tour: { _id: tour._id, title: tour.title } }, 'Tour deleted successfully');
    } catch (err) {
        logger.error('Error deleting tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete tour');
    }
};

// POST /tours/:id/duplicate — a draft copy to build a similar listing from
exports.duplicateTour = async (req, res) => {
    try {
        const source = await TravelDestination.findById(req.params.id).lean();
        if (!source) return ResponseHandler.fail(res, 404, 'Tour not found');
        const { _id, createdAt, updatedAt, reviews, __v, ...rest } = source;
        const strip = (list = []) => list.map(({ _id: ignored, ...item }) => item);
        const tour = await TravelDestination.create({
            ...rest,
            title: `Copy of ${source.title}`,
            status: 'draft',
            isFeatured: false,
            inclusions: strip(rest.inclusions),
            itinerary: strip(rest.itinerary),
            overview: { about: rest.overview?.about || '', gallery: strip(rest.overview?.gallery) },
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });
        return ResponseHandler.success(res, { tour }, 'Draft copy created');
    } catch (err) {
        logger.error('Error duplicating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to duplicate tour');
    }
};

const BULK_ACTIONS = {
    active: { status: 'active' },
    draft: { status: 'draft' },
    inactive: { status: 'inactive' },
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
};

// POST /tours/bulk-action — { ids: [...], action: 'active' | 'draft' | 'inactive' | 'feature' | 'unfeature' | 'delete' }
exports.bulkTourAction = async (req, res) => {
    try {
        const ids = [...new Set((req.body?.ids || []).map(String).filter((id) => /^[a-f0-9]{24}$/i.test(id)))].slice(0, 500);
        const { action } = req.body || {};
        if (ids.length === 0) return ResponseHandler.fail(res, 400, 'Select at least one tour.');

        if (action === 'delete') {
            const booked = await bookingCounts(ids);
            const deletable = ids.filter((id) => !booked.get(id));
            await removeTours(deletable);
            const kept = ids.length - deletable.length;
            return ResponseHandler.success(res, { affected: deletable.length, skipped: kept },
                kept ? `Deleted ${deletable.length}. ${kept} with bookings were kept; hide them instead.` : `Deleted ${deletable.length} tour(s).`);
        }
        const update = BULK_ACTIONS[action];
        if (!update) return ResponseHandler.fail(res, 400, 'Unknown action.');
        const result = await TravelDestination.updateMany({ _id: { $in: ids } }, { ...update, updatedBy: req.user._id });
        return ResponseHandler.success(res, { affected: result.modifiedCount, skipped: 0 }, `Updated ${result.modifiedCount} tour(s).`);
    } catch (err) {
        logger.error('Error in bulk tour action', { error: err.message });
        return ResponseHandler.error(res, 500, 'Bulk action failed');
    }
};

// POST /tours/bulk — imports rows one by one and reports which ones failed and why
exports.bulkCreateTours = async (req, res) => {
    try {
        const rows = req.body.tours;
        if (!Array.isArray(rows) || rows.length === 0) {
            return ResponseHandler.fail(res, 400, 'No tours provided for bulk upload');
        }
        if (rows.length > 500) return ResponseHandler.fail(res, 400, 'Import at most 500 tours at a time.');

        const valid = [];
        const failed = [];
        rows.forEach((row, index) => {
            const doc = new TravelDestination({ ...normalizeTour(row), createdBy: req.user._id, updatedBy: req.user._id });
            const err = doc.validateSync();
            if (err) failed.push({ row: index + 1, title: row?.title || '(no title)', error: validationMessage(err) });
            else valid.push(doc);
        });
        const created = valid.length ? await TravelDestination.insertMany(valid) : [];

        return ResponseHandler.success(res, { created: created.length, failed, tours: created },
            failed.length
                ? `Imported ${created.length} of ${rows.length}. Fix the ${failed.length} failed row(s) and import them again.`
                : `Imported ${created.length} tour(s).`);
    } catch (err) {
        logger.error('Error in bulk upload', { error: err.message });
        return ResponseHandler.error(res, 500, 'Bulk upload failed');
    }
};
