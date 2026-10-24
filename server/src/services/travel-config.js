const SiteSettings = require('../models/SiteSettings');

// Flights/hotels switches and markup, read from SiteSettings with a short cache.
// SettingsController clears the cache on every admin save so toggles apply at once.
const TTL_MS = 30_000;
const KIND_TO_FEATURE = { flight: 'flights', hotel: 'hotels', flights: 'flights', hotels: 'hotels' };

let cached = null;
let cachedAt = 0;

function envPct(name, fallback) {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && process.env[name] !== '' && process.env[name] !== undefined ? n : fallback;
}

async function getTravelConfig() {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    const settings = await SiteSettings.find();
    cached = {
        features: {
            flights: settings?.features?.flights === true,
            hotels: settings?.features?.hotels === true,
        },
        markup: {
            flight: settings?.travelMarkup?.flightPct ?? envPct('FLIGHT_MARKUP_PCT', 5),
            hotel: settings?.travelMarkup?.hotelPct ?? envPct('HOTEL_MARKUP_PCT', 8),
        },
    };
    cachedAt = Date.now();
    return cached;
}

async function getFeatures() {
    return (await getTravelConfig()).features;
}

function featureName(kindOrFeature) {
    return KIND_TO_FEATURE[kindOrFeature] || null;
}

async function isKindEnabled(kindOrFeature) {
    const name = featureName(kindOrFeature);
    if (!name) return false;
    return (await getFeatures())[name];
}

async function enabledKinds() {
    const f = await getFeatures();
    return [f.flights && 'flight', f.hotels && 'hotel'].filter(Boolean);
}

async function getMarkupPct(kind) {
    return (await getTravelConfig()).markup[kind];
}

function clearTravelConfigCache() {
    cached = null;
    cachedAt = 0;
}

module.exports = {
    getTravelConfig, getFeatures, isKindEnabled, enabledKinds, getMarkupPct, featureName, clearTravelConfigCache,
};
