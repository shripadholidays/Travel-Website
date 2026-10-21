const { round2 } = require('./util');

function applyMarkup(supplierAmount, pct, currency = 'USD') {
    const markupAmount = round2((supplierAmount * pct) / 100);
    return {
        supplierAmount: round2(supplierAmount),
        markupPct: pct,
        markupAmount,
        total: round2(supplierAmount + markupAmount),
        currency,
    };
}

module.exports = { applyMarkup };
