/**
 * Site-wide settings and page content: one record, stored as JSON in the site_settings table.
 * Every gap is filled from site-settings-defaults.json (the defaults the site has always used),
 * and every list item gets its own _id so the admin editors can track rows.
 */
const { get, run } = require('../db');
const { newId, isId } = require('../db/ids');
const { getPath, setPath } = require('../db/table');
const { ValidationError } = require('../db/errors');
const { defaults: DEFAULTS, items: ITEM_DEFAULTS } = require('./site-settings-defaults.json');

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const DEFAULT_SECTIONS = [
    { sectionId: 'hero',         name: 'Hero Banner',    description: 'Main banner section on the homepage.', isVisible: true },
    { sectionId: 'promo',        name: 'Special Offers', description: 'Promotional carousel with partner deals.', isVisible: true },
    { sectionId: 'featured',     name: 'Featured Tours', description: 'Showcase hand-picked tours on the homepage.', isVisible: true },
    { sectionId: 'testimonials', name: 'Testimonials',   description: 'Customer reviews and testimonials section.', isVisible: true },
    { sectionId: 'plantrip',     name: 'Plan Your Trip', description: 'Step-by-step trip planning guide.', isVisible: true },
    { sectionId: 'support',      name: 'Support Section', description: '24/7 support concierge feature display.', isVisible: true },
    { sectionId: 'faq',          name: 'FAQ Section',    description: 'Frequently asked questions preview.', isVisible: true },
];

const clone = (v) => JSON.parse(JSON.stringify(v));
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

// Stored values win; objects merge with their defaults, lists replace them
function withDefaults(stored, defaults) {
    if (!isPlainObject(defaults)) return stored === undefined ? clone(defaults) : stored;
    const out = clone(defaults);
    for (const [k, v] of Object.entries(stored || {})) {
        out[k] = isPlainObject(v) && isPlainObject(defaults[k]) ? withDefaults(v, defaults[k]) : v;
    }
    return out;
}

// Each list row gets the fields its editor expects, plus an _id
function normalizeLists(s) {
    for (const [path, itemDefaults] of Object.entries(ITEM_DEFAULTS)) {
        const list = getPath(s, path);
        if (!Array.isArray(list)) continue;
        setPath(s, path, list.map((item) => ({
            ...itemDefaults,
            ...(isPlainObject(item) ? item : {}),
            _id: isId(String(item?._id || '')) ? String(item._id) : newId(),
        })));
    }
    return s;
}

function check(s) {
    const errors = {};
    const c = s.currency || {};
    if (!CURRENCIES.includes(c.base)) errors['currency.base'] = { message: 'Unknown base currency.' };
    for (const code of CURRENCIES) {
        if (c.rates && c.rates[code] !== undefined && !(Number(c.rates[code]) > 0)) errors[`currency.rates.${code}`] = { message: `Enter a rate above 0 for ${code}.` };
    }
    for (const k of ['flightPct', 'hotelPct']) {
        const v = Number(s.travelMarkup?.[k]);
        if (!Number.isFinite(v) || v < 0 || v > 50) errors[`travelMarkup.${k}`] = { message: 'Markup must be between 0 and 50%.' };
    }
    if ((s.testimonials || []).some((t) => !(Number(t.rating) >= 1 && Number(t.rating) <= 5))) errors.testimonials = { message: 'Testimonial ratings go from 1 to 5.' };
    if ((s.supportSection?.chatMessages || []).some((m) => !['user', 'assistant'].includes(m.sender))) errors['supportSection.chatMessages'] = { message: 'Chat messages come from the user or the assistant.' };
    if ((s.contentSections || []).some((x) => !x.sectionId || !x.name)) errors.contentSections = { message: 'Every section needs an id and a name.' };
    if (s.offerBar?.countdownEnd && Number.isNaN(new Date(s.offerBar.countdownEnd).getTime())) errors['offerBar.countdownEnd'] = { message: 'The countdown end is not a valid date.' };
    if (Object.keys(errors).length) throw new ValidationError(errors);
}

function fromRow(row) {
    const stored = JSON.parse(row.data || '{}');
    const s = normalizeLists(withDefaults(stored, DEFAULTS));
    s._id = 'site';
    s.createdAt = new Date(row.created_at);
    s.updatedAt = new Date(row.updated_at);
    return s;
}

/** The settings, or null when the site has none saved yet. */
async function find() {
    const row = await get('SELECT data, created_at, updated_at FROM site_settings WHERE id = 1');
    return row ? fromRow(row) : null;
}

/** Validates and writes the whole settings record. */
async function save(settings) {
    const s = normalizeLists(withDefaults(settings, DEFAULTS));
    for (const [k, v] of Object.entries(s.currency.rates || {})) s.currency.rates[k] = Number(v);
    check(s);
    const { _id, createdAt, updatedAt, ...data } = s;
    const now = new Date().toISOString();
    await run(
        `INSERT INTO site_settings (id, data, created_at, updated_at) VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        [JSON.stringify(data), now, now],
    );
    return find();
}

/** The settings, created with the default page sections on first use. */
async function load() {
    return (await find()) || save({ contentSections: DEFAULT_SECTIONS });
}

/** Changes top-level keys (objects merge into what is there) and saves. */
async function update(changes) {
    const current = (await find()) || { contentSections: DEFAULT_SECTIONS };
    for (const [key, value] of Object.entries(changes)) {
        current[key] = isPlainObject(value) && isPlainObject(current[key]) ? { ...current[key], ...value } : value;
    }
    return save(current);
}

async function remove() {
    await run('DELETE FROM site_settings');
}

module.exports = { DEFAULTS, DEFAULT_SECTIONS, find, load, save, update, remove };
