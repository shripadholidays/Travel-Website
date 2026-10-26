const { all, get } = require('../db');
const { validationText } = require('../db/errors');
const SiteSettings = require('../models/SiteSettings');
const payments = require('../services/payments');
const ResponseHandler = require('../utils/response-handler');
const { hasPermission, PERMISSIONS, STAFF_ROLES } = require('../config/permissions');
const logger = require('../utils/logger');
const { clearTravelConfigCache } = require('../services/travel-config');
const { getCurrencyConfig, clearCurrencyCache, fetchLatestRates, SUPPORTED } = require('../services/currency');
const { refreshTourPriceIndex } = require('../services/tour-price-index');

// The settings record, created with the default page sections on first use
const getSettings = () => SiteSettings.load();

// Fields exposed publicly (no auth needed)
const PUBLIC_FIELDS = [
    'companyName', 'contactEmail', 'contactPhone', 'address',
    'socialLinks', 'footer', 'footerExploreLinks', 'footerCompanyLinks',
    'navLinks', 'offerBar', 'heroSlides', 'promoSlides', 'planTrip',
    'testimonials', 'supportSection', 'faqs', 'aboutPage', 'features',
];

// GET /settings (public)
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await getSettings();
        const pub = {};
        for (const f of PUBLIC_FIELDS) pub[f] = settings[f];
        // Rates and the currencies travellers can choose, for showing prices
        pub.currency = await getCurrencyConfig();
        pub.contentSections = (settings.contentSections || []).map(s => ({
            sectionId: s.sectionId,
            isVisible: s.isVisible,
        }));
        return ResponseHandler.success(res, { settings: pub });
    } catch (err) {
        logger.error('Failed to fetch public settings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch settings');
    }
};

// GET /settings/highlights (public)
// Numbers and quotes worked out from real data, for the About page and homepage
// testimonials, so nothing has to be typed in (or made up) by hand.
exports.getHighlights = async (req, res) => {
    try {
        // Reviews by our own staff are not testimonials
        const byTravellers = `r.user_id NOT IN (SELECT id FROM users WHERE role IN (${STAFF_ROLES.map((x) => `'${x}'`).join(', ')}))`;
        const [tours, bookingTotals, reviewTotals, reviews] = await Promise.all([
            all("SELECT location FROM tours WHERE status = 'active'"),
            get("SELECT SUM(number_of_travelers) AS travellers FROM bookings WHERE status IN ('confirmed', 'completed')"),
            get(`SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews r WHERE ${byTravellers}`),
            all(`SELECT r.id, r.rating, r.title, r.content, r.is_verified_booking, u.display_name, u.profile_picture, t.id AS tour_id, t.title AS tour_title, t.location
                 FROM reviews r JOIN users u ON u.id = r.user_id JOIN tours t ON t.id = r.tour_id
                 WHERE ${byTravellers} AND r.rating >= 4 AND coalesce(r.content, '') <> '' AND t.status = 'active'
                 ORDER BY r.rating DESC, r.created_at DESC LIMIT 6`),
        ]);

        // One destination per country/place a live tour goes to ("Tokyo, Japan" → "Japan")
        const places = new Set(tours.map((t) => (t.location || '').split(',').pop().trim().toLowerCase()).filter(Boolean));

        return ResponseHandler.success(res, {
            stats: {
                tours: tours.length,
                destinations: places.size,
                travellers: Number(bookingTotals?.travellers || 0),
                reviews: Number(reviewTotals?.count || 0),
                rating: reviewTotals?.avg ? Math.round(reviewTotals.avg * 10) / 10 : 0,
            },
            reviews: reviews.map((r) => ({
                _id: r.id,
                name: r.display_name,
                image: r.profile_picture || '',
                rating: r.rating,
                title: r.title || '',
                quote: r.content,
                tourId: r.tour_id,
                tourTitle: r.tour_title,
                location: r.location,
                verified: !!r.is_verified_booking,
            })),
        });
    } catch (err) {
        logger.error('Failed to fetch highlights', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch highlights');
    }
};

// GET /admin/settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await getSettings();
        // Which gateways have keys and which one checkout uses now (keys themselves never leave the server)
        return ResponseHandler.success(res, { settings, paymentGateways: await payments.status() });
    } catch (err) {
        logger.error('Failed to fetch settings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch settings');
    }
};

// PUT /admin/settings  — generic partial update for all top-level fields
// Page content, including the menu and footer links, belongs to content editors
const CONTENT_KEYS = [
    'offerBar', 'heroSlides', 'promoSlides', 'planTrip', 'testimonials', 'supportSection', 'faqs', 'aboutPage',
    'navLinks', 'footerExploreLinks', 'footerCompanyLinks',
];
const SYSTEM_KEYS = [
    'companyName', 'contactEmail', 'contactPhone', 'address',
    'socialLinks', 'footer', 'features', 'travelMarkup', 'currency', 'payments',
];
const UPDATABLE = [...SYSTEM_KEYS, ...CONTENT_KEYS];

function checkCurrency(c) {
    if (c.base !== undefined && !SUPPORTED.includes(c.base)) return 'Unknown base currency.';
    if (c.enabled !== undefined) {
        if (!Array.isArray(c.enabled) || c.enabled.length === 0) return 'Keep at least one currency switched on.';
        if (c.enabled.some((x) => !SUPPORTED.includes(x))) return 'Unknown currency in the list.';
        if (c.base && !c.enabled.includes(c.base)) return 'The base currency must stay switched on.';
    }
    if (c.rates) {
        for (const [code, rate] of Object.entries(c.rates)) {
            if (!SUPPORTED.includes(code)) return `Unknown currency ${code}.`;
            if (!(Number(rate) > 0)) return `Enter a rate above 0 for ${code}.`;
        }
        c.rates.USD = 1;
    }
    return null;
}

// POST /admin/settings/currency/refresh — pulls today's market rates
exports.refreshRates = async (req, res) => {
    try {
        const rates = await fetchLatestRates();
        const settings = await getSettings();
        settings.currency = { ...settings.currency, rates, ratesUpdatedAt: new Date() };
        await SiteSettings.save(settings);
        await refreshTourPriceIndex();
        return ResponseHandler.success(res, { currency: await getCurrencyConfig() }, 'Exchange rates updated');
    } catch (err) {
        return ResponseHandler.fail(res, 502, err.message);
    }
};

exports.updateSettings = async (req, res) => {
    try {
        // Content editors change page content; company details, menus and services stay with administrators
        const keys = Object.keys(req.body || {}).filter((k) => UPDATABLE.includes(k));
        const denied = keys.filter((k) => !hasPermission(req.user, CONTENT_KEYS.includes(k) ? PERMISSIONS.CONTENT : PERMISSIONS.SETTINGS));
        if (denied.length) {
            return ResponseHandler.fail(res, 403, `Your role can't change: ${denied.join(', ')}. Ask an administrator.`);
        }
        if (req.body.payments !== undefined && !payments.CHOICES.includes(req.body.payments?.gateway)) {
            return ResponseHandler.fail(res, 400, 'Pick Automatic, Razorpay or Stripe.');
        }
        if (req.body.currency) {
            const problem = checkCurrency(req.body.currency);
            if (problem) return ResponseHandler.fail(res, 400, problem);
            if (req.body.currency.rates) req.body.currency.ratesUpdatedAt = new Date();
        }
        await getSettings();
        // Objects merge into what is saved (so one card can change part of a section); lists replace
        const settings = await SiteSettings.update(Object.fromEntries(keys.map((k) => [k, req.body[k]])));
        clearTravelConfigCache();
        clearCurrencyCache();
        // Price filters and sorting use each tour's USD price, which depends on the rates
        if (req.body.currency?.rates) await refreshTourPriceIndex();
        return ResponseHandler.success(res, { settings }, 'Settings updated');
    } catch (err) {
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Failed to update settings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update settings');
    }
};

// PATCH /admin/settings/sections/:sectionId
exports.toggleSection = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { isVisible } = req.body;
        const settings = await getSettings();
        const section = settings.contentSections.find(s => s.sectionId === sectionId);
        if (!section) return ResponseHandler.fail(res, 404, 'Section not found');
        section.isVisible = isVisible !== false && isVisible !== 'false';
        return ResponseHandler.success(res, { settings: await SiteSettings.save(settings) }, 'Section updated');
    } catch (err) {
        logger.error('Failed to toggle section', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update section');
    }
};
