const { defineTable } = require('../db/table');
const { packageOptionsErrors, applyCheapestChoice } = require('../services/package-options');

// Drafts may be saved half-finished; a live tour needs a price, a cover image and a description
const isLive = (doc) => (doc.status ?? 'active') === 'active';

// Codes only (older data used symbols)
const SYMBOLS = { '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP' };

const TravelDestination = defineTable({
    table: 'tours',
    fields: {
        title: { type: 'text', required: 'Title is required', trim: true, label: 'Title' },
        location: { type: 'text', required: 'Location is required', trim: true, label: 'Location' },
        price: {
            type: 'number', default: 0, label: 'Price', required: isLive, requiredMessage: 'Price is required',
            validate: (v, doc) => (isLive(doc) && v < 1 ? `Price must be at least 1 ${doc.currency || 'INR'}` : null),
        },
        // The currency the operator priced the tour in; travellers see and pay in their own (converted at checkout)
        currency: { type: 'text', required: true, enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'], enumMessage: 'Pick a supported currency', default: 'INR' },
        // The price in US dollars at current rates, so filters and sorting compare like with like (kept up to date by the server)
        priceUSD: { type: 'number', default: 0, col: 'price_usd' },
        'duration.days': { type: 'int', required: true, min: 1, label: 'Days' },
        'duration.nights': { type: 'int', required: true, min: 0, label: 'Nights' },
        validity: { type: 'date', required: 'The last available date is required', label: 'Last available date' },
        inclusions: { type: 'json', default: [], itemIds: true },          // [{ title, included }]
        itinerary: { type: 'json', default: [], itemIds: true },           // [{ day, activity, location }]
        imageURL: { type: 'text', col: 'image_url', required: isLive, requiredMessage: 'A cover image is required' },
        images: { type: 'json', default: [] },
        categories: { type: 'json', default: [] },
        emi: 'text',   // short card highlight, e.g. "Best seller" (never a price claim)
        'overview.about': { type: 'text', required: isLive, requiredMessage: 'The "About this tour" description is required' },
        'overview.gallery': { type: 'json', default: [], itemIds: true },  // [{ imageURL, altText }]
        'reviews.rating': { type: 'number', default: 0 },
        'reviews.basedOn': { type: 'int', default: 0 },
        'reviews.individualReviews': { type: 'json', default: [], itemIds: true },
        maxGroupSize: { type: 'int', default: null, min: 1, label: 'Max group size' },
        // Optional trip lengths and hotel classes the traveller picks from (see services/package-options)
        packageOptions: { type: 'json', default: null },
        bestTime: 'text',
        isFeatured: { type: 'bool', default: false },
        status: { type: 'text', enum: ['active', 'inactive', 'draft'], default: 'active', label: 'Status' },
        'coordinates.lat': { type: 'number', default: null, label: 'Latitude' },
        'coordinates.lng': { type: 'number', default: null, label: 'Longitude' },
        // Who created and last changed the listing (shown in the tour editor)
        createdBy: 'ref',
        updatedBy: 'ref',
    },
    validate(doc) {
        const errors = {};
        if ((doc.inclusions || []).some((x) => !x || !String(x.title || '').trim())) errors.inclusions = 'Every inclusion needs a title';
        if ((doc.itinerary || []).some((d) => !d || !String(d.activity || '').trim() || !String(d.location || '').trim())) errors.itinerary = 'Every itinerary day needs an activity and a place';
        const optionsError = isLive(doc) ? packageOptionsErrors(doc.packageOptions) : null;
        if (optionsError) errors.packageOptions = optionsError;
        if ((doc.overview?.gallery || []).some((g) => !g || !String(g.imageURL || '').trim())) errors['overview.gallery'] = 'Every gallery photo needs an image';
        return errors;
    },
    async beforeSave(doc) {
        if (SYMBOLS[doc.currency]) doc.currency = SYMBOLS[doc.currency];
        // Price, duration and itinerary follow the cheapest trip length when the tour has choices
        applyCheapestChoice(doc);
        // The USD price index always follows the price. Required here to avoid a load-order cycle with settings.
        const { getCurrencyConfig, convert } = require('../services/currency');
        const { rates } = await getCurrencyConfig();
        doc.priceUSD = convert(Number(doc.price) || 0, rates[doc.currency] ? doc.currency : 'USD', 'USD', rates);
    },
});

TravelDestination.isLive = isLive;

module.exports = TravelDestination;
