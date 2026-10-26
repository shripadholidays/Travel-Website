const config = require('../config');

/**
 * Remembers the answers to the landing page's public requests (settings, highlights, featured tours,
 * destinations, collections) for a few minutes, so most visitors are served without a database trip.
 * Any successful change made through the API forgets everything at once (see clearOnChange below),
 * so edits still show straight away; the time limit only covers changes made outside the API.
 */
const cache = new Map();
const MAX_ENTRIES = 200;
const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

function clearPublicCache() {
    cache.clear();
}

function publicCache(req, res, next) {
    const { ttlMs } = config.publicCache;
    // Staff views (?scope=admin) depend on who is asking, so they are never shared
    if (req.method !== 'GET' || !ttlMs || req.query.scope) return next();
    const key = req.originalUrl;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
        res.set('X-Cache', 'HIT');
        return res.type('json').send(hit.body);
    }
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode === 200) {
            if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
            cache.set(key, { body: JSON.stringify(body), expires: Date.now() + ttlMs });
        }
        res.set('X-Cache', 'MISS');
        return json(body);
    };
    next();
}

// Mounted on the whole API: a successful change anywhere (except sign-in) forgets the remembered answers
function clearOnChange(req, res, next) {
    if (READS.has(req.method) || req.originalUrl.startsWith('/api/v1/auth/')) return next();
    res.on('finish', () => {
        if (res.statusCode < 400) clearPublicCache();
    });
    next();
}

module.exports = { publicCache, clearOnChange, clearPublicCache };
