const SiteSettings = require('../models/SiteSettings');
const TravelDestination = require('../models/TravelDestination');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { clearTravelConfigCache } = require('../services/travel-config');

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
exports.updateSettings = async (req, res) => {
    try {
        const settings = await getSettings();
        const UPDATABLE = [
            'companyName', 'contactEmail', 'contactPhone', 'address',
            'socialLinks', 'footer', 'footerExploreLinks', 'footerCompanyLinks',
            'navLinks', 'offerBar', 'heroSlides', 'promoSlides', 'planTrip',
            'testimonials', 'supportSection', 'faqs', 'aboutPage',
            'features', 'travelMarkup',
        ];
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
        return ResponseHandler.success(res, { settings }, 'Settings updated');
    } catch (err) {
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
