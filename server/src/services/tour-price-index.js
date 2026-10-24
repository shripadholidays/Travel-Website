const { run } = require('../db');
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
        await run('UPDATE tours SET currency = ? WHERE currency = ?', [normalizeCode(symbol), symbol]);
    }
    for (const code of SUPPORTED) {
        await run('UPDATE tours SET price_usd = round(coalesce(price, 0) / ?, 2) WHERE currency = ?', [rates[code] || 1, code]);
    }
}

module.exports = { refreshTourPriceIndex };
