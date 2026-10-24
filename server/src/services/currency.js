const SiteSettings = require('../models/SiteSettings');
const logger = require('../utils/logger');

// Currencies the site can price tours in, show prices in, and charge cards in.
// All of them use two decimal places, which is what Stripe expects for these codes.
const SUPPORTED = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

// Units of each currency per 1 US dollar. Admins can edit these (or fetch fresh ones) in Settings.
const DEFAULT_RATES = { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, AED: 3.67 };
const DEFAULT_BASE = 'INR';

const TTL_MS = 30_000;
let cached = null;
let cachedAt = 0;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** { base, enabled, rates, updatedAt } with every gap filled from the defaults. */
async function getCurrencyConfig() {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    const s = (await SiteSettings.find())?.currency || {};
    const rates = { ...DEFAULT_RATES };
    for (const code of SUPPORTED) {
        const r = Number(s.rates?.[code]);
        if (r > 0) rates[code] = r;
    }
    rates.USD = 1;
    const base = SUPPORTED.includes(s.base) ? s.base : DEFAULT_BASE;
    let enabled = (s.enabled || []).filter((c) => SUPPORTED.includes(c));
    if (enabled.length === 0) enabled = [...SUPPORTED];
    if (!enabled.includes(base)) enabled.unshift(base);
    cached = { base, enabled, supported: SUPPORTED, rates, updatedAt: s.ratesUpdatedAt || null };
    cachedAt = Date.now();
    return cached;
}

function clearCurrencyCache() {
    cached = null;
    cachedAt = 0;
}

/** Converts an amount between two supported currencies with the given rates (per 1 USD). */
function convert(amount, from, to, rates) {
    const f = rates[from] || 1;
    const t = rates[to] || 1;
    if (from === to) return round2(amount);
    return round2((Number(amount) / f) * t);
}

/** The rate that turns 1 unit of `from` into `to`, kept on bookings for the record. */
const rateBetween = (from, to, rates) => (from === to ? 1 : (rates[to] || 1) / (rates[from] || 1));

const isSupported = (code) => SUPPORTED.includes(String(code || '').toUpperCase());

// Older data saved symbols instead of codes
const SYMBOLS = { '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP' };
const normalizeCode = (value) => {
    const v = String(value || '').trim();
    return SYMBOLS[v] || v.toUpperCase();
};

/** "₹12,500.00", "$1,200.00" — for emails and messages. */
function formatMoney(amount, currency = 'USD') {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${round2(amount)}`;
    }
}

/** Latest market rates for the supported currencies (free, no key needed). */
async function fetchLatestRates() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
        const json = await res.json();
        if (json.result !== 'success' || !json.rates) throw new Error('Rate service returned no rates');
        const rates = {};
        for (const code of SUPPORTED) {
            const r = Number(json.rates[code]);
            if (!(r > 0)) throw new Error(`No rate for ${code}`);
            rates[code] = r;
        }
        return rates;
    } catch (err) {
        logger.error('Fetching exchange rates failed', { error: err.message });
        throw new Error('Could not reach the exchange-rate service. Try again, or enter the rates by hand.');
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    SUPPORTED, DEFAULT_RATES, DEFAULT_BASE, round2,
    getCurrencyConfig, clearCurrencyCache, convert, rateBetween, isSupported, normalizeCode, fetchLatestRates, formatMoney,
};
