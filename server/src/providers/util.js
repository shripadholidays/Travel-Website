const { ProviderError } = require('./errors');

// FNV-1a 32-bit
function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

// mulberry32: deterministic so the same search always returns the same mock offers
function seededRandom(seed) {
    let a = seed >>> 0;
    return function next() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const round2 = (n) => Math.round(n * 100) / 100;

function encodeOfferId(payload) {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeOfferId(id) {
    try {
        const payload = JSON.parse(Buffer.from(String(id), 'base64url').toString('utf8'));
        if (!payload || typeof payload !== 'object') throw new Error('bad');
        return payload;
    } catch {
        throw new ProviderError('INVALID_OFFER', 400, 'This offer is not valid');
    }
}

class TtlCache {
    constructor(ttlMs, maxEntries = 500) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
        this.map = new Map();
    }

    get(key) {
        const hit = this.map.get(key);
        if (!hit) return undefined;
        if (Date.now() > hit.expires) {
            this.map.delete(key);
            return undefined;
        }
        return hit.value;
    }

    set(key, value) {
        if (this.map.size >= this.maxEntries) this.map.delete(this.map.keys().next().value);
        this.map.set(key, { value, expires: Date.now() + this.ttlMs });
    }

    clear() {
        this.map.clear();
    }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function assertDate(value, field) {
    if (!DATE_RE.test(String(value || '')) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new ProviderError('INVALID_DATE', 400, `${field} must be a date (YYYY-MM-DD)`);
    }
}

function addDays(date, days) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
    return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

module.exports = {
    hashString, seededRandom, round2, encodeOfferId, decodeOfferId, TtlCache, assertDate, addDays, daysBetween,
};
