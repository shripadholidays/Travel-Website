const SiteSettings = require('../models/SiteSettings');
const TravelDestination = require('../models/TravelDestination');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const { hasPermission, PERMISSIONS } = require('../config/permissions');
const logger = require('../utils/logger');
const { clearTravelConfigCache } = require('../services/travel-config');
const { getCurrencyConfig, clearCurrencyCache, fetchLatestRates, SUPPORTED } = require('../services/currency');
const { refreshTourPriceIndex } = require('../services/tour-price-index');

// Helper: get or create singleton settings doc
async function getSettings() {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = await SiteSettings.create({
            contentSections: [
                { sectionId: 'hero',         name: 'Hero Banner',          description: 'Main banner section on the homepage.', isVisible: true },
                { sectionId: 'promo',        name: 'Special Offers',       description: 'Promotional carousel with partner deals.', isVisible: true },
                { sectionId: 'featured',     name: 'Featured Tours',       description: 'Showcase hand-picked tours on the homepage.', isVisible: true },
                { sectionId: 'testimonials', name: 'Testimonials',         description: 'Customer reviews and testimonials section.', isVisible: true },
                { sectionId: 'plantrip',     name: 'Plan Your Trip',       description: 'Step-by-step trip planning guide.', isVisible: true },
                { sectionId: 'support',      name: 'Support Section',      description: '24/7 support concierge feature display.', isVisible: true },
                { sectionId: 'faq',          name: 'FAQ Section',          description: 'Frequently asked questions preview.', isVisible: true },
            ],
        });
    }
    return settings;
}

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
        const staffIds = await User.find({ role: { $in: ['admin', 'moderator'] } }).distinct('_id');
        const travellerReviews = { user: { $nin: staffIds } };
        const [tours, bookingTotals, reviewTotals, reviews] = await Promise.all([
            TravelDestination.find({ status: 'active' }, 'location').lean(),
            Booking.aggregate([
                { $match: { status: { $in: ['confirmed', 'completed'] } } },
                { $group: { _id: null, travellers: { $sum: '$numberOfTravelers' } } },
            ]),
            Review.aggregate([{ $match: travellerReviews }, { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } }]),
            Review.find({ ...travellerReviews, rating: { $gte: 4 }, content: { $exists: true, $ne: '' } })
                .sort({ rating: -1, createdAt: -1 })
                .limit(6)
                .populate('user', 'displayName profilePicture')
                .populate({ path: 'tour', select: 'title location status' })
                .lean(),
        ]);

        // One destination per country/place a live tour goes to ("Tokyo, Japan" → "Japan")
        const places = new Set(tours.map((t) => (t.location || '').split(',').pop().trim().toLowerCase()).filter(Boolean));

        return ResponseHandler.success(res, {
            stats: {
                tours: tours.length,
                destinations: places.size,
                travellers: bookingTotals[0]?.travellers ?? 0,
                reviews: reviewTotals[0]?.count ?? 0,
                rating: reviewTotals[0]?.avg ? Math.round(reviewTotals[0].avg * 10) / 10 : 0,
            },
            reviews: reviews
                .filter((r) => r.user && r.tour && r.tour.status === 'active')
                .map((r) => ({
                    _id: r._id,
                    name: r.user.displayName,
                    image: r.user.profilePicture || '',
                    rating: r.rating,
                    title: r.title || '',
                    quote: r.content,
                    tourId: r.tour._id,
                    tourTitle: r.tour.title,
                    location: r.tour.location,
                    verified: !!r.isVerifiedBooking,
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
        return ResponseHandler.success(res, { settings });
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
    'socialLinks', 'footer', 'features', 'travelMarkup', 'currency',
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
        settings.currency = { ...(settings.currency?.toObject?.() ?? settings.currency ?? {}), rates, ratesUpdatedAt: new Date() };
        await settings.save();
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
        if (req.body.currency) {
            const problem = checkCurrency(req.body.currency);
            if (problem) return ResponseHandler.fail(res, 400, problem);
            if (req.body.currency.rates) req.body.currency.ratesUpdatedAt = new Date();
        }
        const settings = await getSettings();
        for (const key of UPDATABLE) {
            if (req.body[key] !== undefined) {
                // For nested objects (not arrays), merge instead of replace
                if (
                    !Array.isArray(req.body[key]) &&
                    typeof req.body[key] === 'object' &&
                    !Array.isArray(settings[key])
                ) {
                    const current = settings[key]?.toObject?.() ?? settings[key] ?? {};
                    settings[key] = { ...current, ...req.body[key] };
                } else {
                    settings[key] = req.body[key];
                }
            }
        }
        await settings.save();
        clearTravelConfigCache();
        clearCurrencyCache();
        // Price filters and sorting use each tour's USD price, which depends on the rates
        if (req.body.currency?.rates) await refreshTourPriceIndex();
        return ResponseHandler.success(res, { settings }, 'Settings updated');
    } catch (err) {
        if (err.name === 'ValidationError') {
            return ResponseHandler.fail(res, 400, Object.values(err.errors).map((e) => e.message.replace('Path ', '').replace(/`/g, '')).join(', '));
        }
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
        section.isVisible = isVisible;
        await settings.save();
        return ResponseHandler.success(res, { settings }, 'Section updated');
    } catch (err) {
        logger.error('Failed to toggle section', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update section');
    }
};
