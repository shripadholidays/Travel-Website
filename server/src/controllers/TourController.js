const { all, run } = require('../db');
const { isId } = require('../db/ids');
const { Where, containsAny, wordMatch, populate } = require('../db/sql');
const { validationText } = require('../db/errors');
const TravelDestination = require('../models/TravelDestination');
const Destination = require('../models/Destination');
const User = require('../models/User');
const { destinationTourQuery } = require('../services/destination-match');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { hasPermission, PERMISSIONS } = require('../config/permissions');
const { getCurrencyConfig, convert, isSupported, normalizeCode } = require('../services/currency');

// Catalog staff can list and preview tours that are not live yet
const canSeeAll = (user) => hasPermission(user, PERMISSIONS.CATALOG);

const SEARCH_COLUMNS = ['title', 'location', 'categories', 'overview_about'];

// Every word must appear in at least one field (title, location, category or description),
// so "Japan", "Nepal trek" and partial words like "Toky" all find their tours.
function addSearch(where, search) {
    const words = String(search).trim().split(/\s+/).filter(Boolean).slice(0, 8);
    for (const word of words) {
        const { sql, args } = containsAny(SEARCH_COLUMNS, word);
        where.add(sql, ...args);
    }
    return where;
}
exports.addSearch = addSearch;

const SORTS = {
    price_low: 'price_usd ASC',
    price_high: 'price_usd DESC',
    rating: 'reviews_rating DESC',
    newest: 'created_at DESC',
    updated: 'updated_at DESC',
    title: 'title COLLATE NOCASE ASC',
};
const DEFAULT_SORT = 'reviews_rating DESC, price_usd ASC';
const csv = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);

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

        const where = new Where();

        if (category) {
            const list = csv(category);
            where.add(`EXISTS (SELECT 1 FROM json_each(tours.categories) WHERE json_each.value IN (${list.map(() => '?').join(', ')}))`, ...list);
        }
        if (country) where.in('location', csv(country));
        // A whole place name inside the location ("Japan" matches "Tokyo, Japan")
        if (place) {
            const { sql, args } = wordMatch('location', String(place));
            where.add(sql, ...args);
        }
        // Price filters arrive in USD (or ?priceCurrency=) and are compared on the USD price index
        if (minPrice || maxPrice) {
            const { rates } = await getCurrencyConfig();
            const from = isSupported(req.query.priceCurrency) ? String(req.query.priceCurrency).toUpperCase() : 'USD';
            if (minPrice) where.add('price_usd >= ?', convert(Number(minPrice), from, 'USD', rates));
            if (maxPrice) where.add('price_usd <= ?', convert(Number(maxPrice), from, 'USD', rates));
        }
        if (minDays) where.add('duration_days >= ?', Number(minDays));
        if (maxDays) where.add('duration_days <= ?', Number(maxDays));
        if (minRating) where.add('reviews_rating >= ?', Number(minRating));
        if (validFrom) where.add('validity >= ?', new Date(validFrom).toISOString());
        if (validTo) where.add('validity <= ?', new Date(validTo).toISOString());
        if (search) addSearch(where, search);
        // Specific tours by id (e.g. a visitor's recently viewed list), always with current data
        if (req.query.ids) where.in('id', csv(req.query.ids).filter(isId).slice(0, 50));
        // The tours of one destination, by the same rule as its tour count
        if (req.query.destination) {
            const destination = await Destination.findOne('slug = ?', [String(req.query.destination)]);
            const { sql, args } = destination ? destinationTourQuery(destination) : { sql: '0', args: [] };
            where.add(sql, ...args);
        }
        if (isFeatured === 'true') where.add('is_featured = 1');

        // Everyone sees live tours only; the admin list (?scope=admin) also shows drafts and hidden ones
        const admin = req.query.scope === 'admin' && canSeeAll(req.user);
        // Tab counts for the admin list (same filters, every status)
        const statusCounts = admin ? await TravelDestination.countBy('status', where.sql, where.args) : undefined;
        if (!admin) where.add("status = 'active'");
        else if (status && status !== 'all') where.add('status = ?', status);

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || config.pagination.defaultLimit);
        const [tours, total] = await Promise.all([
            TravelDestination.find({ where: where.sql, args: where.args, order: SORTS[sortParam] || DEFAULT_SORT, limit: limitNum, offset: (pageNum - 1) * limitNum }),
            TravelDestination.count(where.sql, where.args),
        ]);
        if (admin) await populate(tours, 'updatedBy', User, 'displayName');

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
        let tours = await TravelDestination.find({ where: "is_featured = 1 AND status = 'active'", order: 'reviews_rating DESC', limit: config.tours.recommendedFeaturedLimit });
        if (tours.length === 0) {
            tours = await TravelDestination.find({ where: "status = 'active'", order: 'reviews_rating DESC', limit: config.tours.recommendedFallbackLimit });
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
        const rows = await all("SELECT categories, location FROM tours WHERE status = 'active'");
        const tally = (values) => {
            const counts = new Map();
            for (const v of values) {
                const key = String(v || '').trim();
                if (key) counts.set(key, (counts.get(key) || 0) + 1);
            }
            return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        };
        const parse = (json) => { try { return JSON.parse(json || '[]'); } catch { return []; } };
        return ResponseHandler.success(res, {
            categories: tally(rows.flatMap((t) => parse(t.categories))),
            // "Tokyo, Japan" → "Japan": the country (or the place itself when there is no comma)
            places: tally(rows.map((t) => (t.location || '').split(',').pop())),
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

// Turns an editor's form (or an import row) into a clean tour record
function normalizeTour(input = {}, { partial = false, baseCurrency = 'INR' } = {}) {
    const data = { ...input };
    // Ratings come from real reviews and the audit fields from the session, never from the form
    delete data.reviews;
    delete data.createdBy;
    delete data.updatedBy;
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;

    // Codes only; a missing or unknown currency falls back to the site's base currency
    if ('currency' in data || !partial) {
        const code = normalizeCode(data.currency);
        data.currency = isSupported(code) ? code : baseCurrency;
    }
    delete data.priceUSD;
    if (typeof data.title === 'string') data.title = data.title.trim();
    if (typeof data.location === 'string') data.location = data.location.trim();
    if ('price' in data) data.price = Number(data.price) || 0;
    if (!partial && !data.duration) data.duration = { days: 1 };
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
    if (Array.isArray(data.inclusions)) {
        data.inclusions = data.inclusions
            .filter((x) => x && String(x.title || '').trim())
            .map((x) => ({ ...x, title: String(x.title).trim(), included: x.included !== false && x.included !== 'false' }));
    }
    if (Array.isArray(data.itinerary)) {
        const fallbackPlace = String(data.location || '').trim() || 'See itinerary';
        data.itinerary = data.itinerary
            .filter((d) => d && (String(d.activity || '').trim() || String(d.location || '').trim()))
            .map((d, i) => ({
                ...(d._id ? { _id: d._id } : {}),
                day: i + 1,
                activity: String(d.activity || '').trim() || 'Free time',
                location: String(d.location || '').trim() || fallbackPlace,
            }));
    }
    if (data.overview) {
        data.overview = {
            about: data.overview.about,
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

// A partial update replaces whole sections (duration, overview…), keeping the parts the form didn't send
function applyChanges(tour, data) {
    for (const [key, value] of Object.entries(data)) {
        if (key === 'overview' && value) tour.overview = { ...tour.overview, ...Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) };
        else tour[key] = value;
    }
    return tour;
}

// POST /tours
exports.createTour = async (req, res) => {
    try {
        const { base } = await getCurrencyConfig();
        const data = normalizeTour(req.body, { baseCurrency: base });
        const tour = await TravelDestination.insert({ ...data, createdBy: req.user._id, updatedBy: req.user._id });
        return ResponseHandler.success(res, { tour }, 'Tour created successfully');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error creating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create tour');
    }
};

// PUT /tours/:id
exports.updateTour = async (req, res) => {
    try {
        // Loaded and saved whole, so "required once live" rules see the tour's real status
        const tour = await TravelDestination.findById(req.params.id);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        const { base } = await getCurrencyConfig();
        applyChanges(tour, { ...normalizeTour(req.body, { partial: true, baseCurrency: base }), updatedBy: req.user._id });
        await TravelDestination.save(tour);
        await populate(tour, 'updatedBy', User, 'displayName');
        return ResponseHandler.success(res, { tour }, 'Tour updated successfully');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error updating tour', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update tour');
    }
};

// A tour with bookings is part of someone's trip history: hide it instead of deleting it
async function bookingCounts(ids) {
    if (ids.length === 0) return new Map();
    const rows = await all(`SELECT tour_id, COUNT(*) AS n FROM bookings WHERE tour_id IN (${ids.map(() => '?').join(',')}) GROUP BY tour_id`, ids);
    return new Map(rows.map((r) => [r.tour_id, Number(r.n)]));
}

async function removeTours(ids) {
    if (ids.length === 0) return;
    const marks = ids.map(() => '?').join(',');
    await run(`DELETE FROM tours WHERE id IN (${marks})`, ids);
    // Collections should not keep pointing at tours that no longer exist
    await run(
        `UPDATE collections SET tours = (SELECT json_group_array(value) FROM json_each(collections.tours) WHERE value NOT IN (${marks}))
         WHERE EXISTS (SELECT 1 FROM json_each(collections.tours) WHERE value IN (${marks}))`,
        [...ids, ...ids],
    );
}

// DELETE /tours/:id
exports.deleteTour = async (req, res) => {
    try {
        const tour = await TravelDestination.findById(req.params.id);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');
        const booked = (await bookingCounts([tour._id])).get(tour._id) || 0;
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
        const source = await TravelDestination.findById(req.params.id);
        if (!source) return ResponseHandler.fail(res, 404, 'Tour not found');
        const { _id, createdAt, updatedAt, reviews, ...rest } = source;
        const strip = (list = []) => list.map(({ _id: ignored, ...item }) => item);
        const tour = await TravelDestination.insert({
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
        const ids = [...new Set((req.body?.ids || []).map(String).filter(isId))].slice(0, 500);
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

        // Publishing checks each tour has what a live listing needs
        if (action === 'active') {
            const tours = await TravelDestination.findByIds(ids);
            const incomplete = [];
            let affected = 0;
            for (const tour of tours) {
                if (tour.status === 'active') continue;
                const next = { ...tour, status: 'active', updatedBy: req.user._id };
                const err = await TravelDestination.check(next, { isNew: false });
                if (err) { incomplete.push({ _id: tour._id, title: tour.title, error: validationText(err) }); continue; }
                await TravelDestination.save(next);
                affected += 1;
            }
            const message = incomplete.length
                ? `Published ${affected}. ${incomplete.length} still need details: ${incomplete.map((t) => t.title).join(', ')}.`
                : `Published ${affected} tour(s).`;
            return ResponseHandler.success(res, { affected, skipped: incomplete.length, incomplete }, message);
        }

        const affected = await TravelDestination.setWhere({ ...update, updatedBy: req.user._id }, `id IN (${ids.map(() => '?').join(',')})`, ids);
        return ResponseHandler.success(res, { affected, skipped: 0 }, `Updated ${affected} tour(s).`);
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

        const { base } = await getCurrencyConfig();
        const valid = [];
        const failed = [];
        for (const [index, row] of rows.entries()) {
            const data = { ...normalizeTour(row, { baseCurrency: base }), createdBy: req.user._id, updatedBy: req.user._id };
            const err = await TravelDestination.check(data);
            if (err) failed.push({ row: index + 1, title: row?.title || '(no title)', error: validationText(err) });
            else valid.push(data);
        }
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
