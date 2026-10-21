const { applyMarkup } = require('./pricing');
const { round2 } = require('./util');
const { ProviderError } = require('./errors');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// What travellers may see: marked-up prices only, never the supplier's amounts.

function toPublicFlight(offer, pct) {
    const { supplierAmount, supplierPerAdult, provider, ...rest } = offer;
    const pricing = applyMarkup(supplierAmount, pct, offer.currency);
    return { ...rest, price: pricing.total, pricePerAdult: round2(pricing.total / offer.adults) };
}

function toPublicHotelOffer(offer, pct) {
    const { supplierAmount, supplierPerNight, provider, ...rest } = offer;
    const pricing = applyMarkup(supplierAmount, pct, offer.currency);
    return { ...rest, price: pricing.total, pricePerNight: round2(pricing.total / offer.nights) };
}

function toPublicOffer(kind, offer, pct) {
    return kind === 'flight' ? toPublicFlight(offer, pct) : toPublicHotelOffer(offer, pct);
}

function sendProviderError(res, err, fallbackMessage) {
    if (err instanceof ProviderError) return ResponseHandler.fail(res, err.status, err.message);
    logger.error(fallbackMessage, { error: err.message });
    return ResponseHandler.error(res, 500, fallbackMessage);
}

module.exports = { toPublicFlight, toPublicHotelOffer, toPublicOffer, sendProviderError };
