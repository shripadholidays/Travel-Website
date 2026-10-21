const SiteSettings = require('../models/SiteSettings');
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
