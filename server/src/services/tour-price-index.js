const TravelDestination = require('../models/TravelDestination');
const { getCurrencyConfig, clearCurrencyCache, SUPPORTED, normalizeCode } = require('./currency');

/**
 * Recomputes every tour's USD price (used by the price filter and price sorting)
 * from the current exchange rates. Run after rates change.
 */
async function refreshTourPriceIndex() {
    clearCurrencyCache();
    const { rates } = await getCurrencyConfig();
    // Older tours stored a symbol ("$", "₹") instead of a code
    for (const symbol of ['$', '₹', '€', '£']) {
        await TravelDestination.updateMany({ currency: symbol }, { $set: { currency: normalizeCode(symbol) } });
    }
    for (const code of SUPPORTED) {
        const perUSD = rates[code] || 1;
        await TravelDestination.updateMany(
            { currency: code },
            [{ $set: { priceUSD: { $round: [{ $divide: ['$price', perUSD] }, 2] } } }],
            { updatePipeline: true },
        );
    }
}

module.exports = { refreshTourPriceIndex };
