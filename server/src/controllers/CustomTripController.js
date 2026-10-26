const { validationText } = require('../db/errors');
const { Where, containsAny, paging: pageFrom } = require('../db/sql');
const CustomTrip = require('../models/CustomTrip');
const SiteSettings = require('../models/SiteSettings');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { sendCustomTripEmail, sendAdminAlert } = require('../services/email-service');
const { DEFAULTS, TripError, getCatalogue, normalizeCatalogue, normalizeTrip } = require('../services/trip-builder');

const frontendOrigin = () => (process.env.NODE_ENV === 'production' ? config.cors.productionOrigin : config.cors.localOrigin);
const STATUSES = ['new', 'quoted', 'booked', 'closed'];

// What the traveller may see of their own trip (the team's private note stays out)
const forTraveller = ({ staffNote, ...trip }) => trip;

// GET /trip-builder — the places, hotel classes and extras travellers build from
exports.getBuilder = async (req, res) => {
    try {
        const catalogue = await getCatalogue();
        return ResponseHandler.success(res, { builder: { ...catalogue, places: catalogue.places.filter((p) => !p.hidden) } });
    } catch (err) {
        logger.error('Failed to load the trip builder', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load the trip builder');
    }
};

// POST /custom-trips — a traveller sends the trip they built (signed in or not)
exports.createTrip = async (req, res) => {
    try {
        const body = req.body || {};
        const trip = normalizeTrip(await getCatalogue(), body);
        const saved = await CustomTrip.insert({
            ...trip,
            user: req.user?._id,
            fullName: body.fullName || req.user?.displayName,
            email: body.email || req.user?.email,
            phoneNumber: body.phoneNumber,
        });

        const url = saved.user ? `${frontendOrigin()}/dashboard?tab=trips` : undefined;
        Promise.allSettled([
            sendCustomTripEmail(saved, { kind: 'received', url }),
            sendAdminAlert(`New custom trip from ${saved.fullName}`, [
                ['Trip', saved.title],
                ['Places', saved.stops.map((s) => `${s.name} (${s.nights}N)`).join(' → ')],
                ['Hotels', saved.estimate.hotelLabel],
                ['Extras', saved.extras.map((x) => x.label).join(', ')],
                ['Travellers', `${saved.adults} adults, ${saved.children} children`],
                ['Start date', saved.startDate ? new Date(saved.startDate).toDateString() : 'Flexible'],
                ['Estimate', `${saved.estimate.low} – ${saved.estimate.high} ${saved.estimate.currency}`],
                ['Email', saved.email],
                ['Phone', saved.phoneNumber],
                ['Notes', saved.notes],
                ['Open it', `${frontendOrigin()}/admin/custom-trips?trip=${saved._id}`],
            ]),
        ]).catch(() => {});

        return ResponseHandler.success(res, { trip: forTraveller(saved) }, 'Trip sent! We will email you a final price within 24 hours.');
    } catch (err) {
        if (err instanceof TripError) return ResponseHandler.fail(res, 400, err.message);
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Failed to save a custom trip', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to send your trip. Please try again.');
    }
};

// GET /custom-trips/mine — the signed-in traveller's trips
exports.myTrips = async (req, res) => {
    try {
        const trips = await CustomTrip.find({ where: 'user_id = ?', args: [req.user._id], order: 'created_at DESC', limit: 50 });
        return ResponseHandler.success(res, { trips: trips.map(forTraveller) });
    } catch (err) {
        logger.error('Failed to load custom trips', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load your trips');
    }
};

// GET /admin/custom-trips?status=&search=&page=
exports.adminList = async (req, res) => {
    try {
        const pg = pageFrom(req.query, 100);
        const where = new Where();
        const q = req.query.search && String(req.query.search).trim();
        if (q) { const m = containsAny(['full_name', 'email', 'title', 'notes'], q); where.add(m.sql, ...m.args); }
        const statusCounts = await CustomTrip.countBy('status', where.sql, where.args);
        if (STATUSES.includes(req.query.status)) where.add('status = ?', req.query.status);
        const [trips, total] = await Promise.all([
            CustomTrip.find({ where: where.sql, args: where.args, order: 'updated_at DESC', limit: pg.limit, offset: pg.offset }),
            CustomTrip.count(where.sql, where.args),
        ]);
        return ResponseHandler.success(res, {
            trips,
            statusCounts,
            pagination: { total, page: pg.page, limit: pg.limit, pages: Math.max(1, Math.ceil(total / pg.limit)) },
        });
    } catch (err) {
        logger.error('Failed to list custom trips', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load custom trips');
    }
};

// PATCH /admin/custom-trips/:id — move it along the board, set the final price, add notes
exports.adminUpdate = async (req, res) => {
    try {
        const trip = await CustomTrip.findById(req.params.id);
        if (!trip) return ResponseHandler.fail(res, 404, 'Trip not found');
        const body = req.body || {};
        const before = { status: trip.status, quote: trip.quote };

        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) return ResponseHandler.fail(res, 400, 'Unknown status');
            trip.status = body.status;
        }
        if (body.quote !== undefined) trip.quote = body.quote === '' || body.quote === null ? null : body.quote;
        for (const key of ['quoteNote', 'staffNote']) if (body[key] !== undefined) trip[key] = body[key];
        if (trip.status === 'quoted' && !(Number(trip.quote) > 0)) {
            return ResponseHandler.fail(res, 400, 'Enter the final price before marking the trip as priced.');
        }
        const saved = await CustomTrip.save(trip);

        // Tell the traveller when they get a price (or a new one)
        const priced = saved.status === 'quoted' && (before.status !== 'quoted' || before.quote !== saved.quote);
        if (priced && body.notify !== false) {
            const url = saved.user ? `${frontendOrigin()}/dashboard?tab=trips` : undefined;
            sendCustomTripEmail(saved, { kind: 'quoted', url }).catch(() => {});
        }
        return ResponseHandler.success(res, { trip: saved }, 'Trip updated');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Failed to update a custom trip', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update the trip');
    }
};

// GET /admin/trip-builder — the full price list, hidden places included
exports.adminGetBuilder = async (req, res) => {
    try {
        const settings = await SiteSettings.load();
        const saved = settings.tripBuilder?.places?.length ? settings.tripBuilder : null;
        return ResponseHandler.success(res, { builder: saved || DEFAULTS, isStartingList: !saved });
    } catch (err) {
        logger.error('Failed to load the trip builder settings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load the trip builder settings');
    }
};

// PUT /admin/trip-builder
exports.adminSaveBuilder = async (req, res) => {
    try {
        const builder = normalizeCatalogue(req.body?.builder);
        await SiteSettings.update({ tripBuilder: builder });
        return ResponseHandler.success(res, { builder, isStartingList: false }, 'Trip builder saved');
    } catch (err) {
        if (err instanceof TripError) return ResponseHandler.fail(res, 400, err.message);
        logger.error('Failed to save the trip builder settings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to save the trip builder settings');
    }
};
