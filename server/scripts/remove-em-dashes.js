/**
 * Swaps em dashes in the site's own content for ordinary punctuation:
 *   "Kashmir — Paradise on Earth"           → "Kashmir: Paradise on Earth"
 *   "Begin in A — a planned city — then B"  → "Begin in A, a planned city, then B"
 *   "Full day — Buddhist art."              → "Full day: Buddhist art."
 * Covers the seed/default JSON files and, with --apply, the live tours, destinations,
 * blog posts and site settings. Reviews and travellers' custom trips are left alone.
 *
 *   node scripts/remove-em-dashes.js           # files only, and a count of what the database would change
 *   node scripts/remove-em-dashes.js --apply   # also update the database
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const DASH = /\s*—\s*/;

function fixSentence(s) {
    const parts = s.split(DASH);
    if (parts.length === 1) return s;
    // A pair of dashes around an aside reads as commas; a single one introduces what follows
    if (parts.length === 3) return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
    if (parts.length === 2) {
        if (!parts[1].trim()) return parts[0];
        if (!parts[0].trim()) return parts[1];
        return `${parts[0]}: ${parts[1]}`;
    }
    return parts.join(', ');
}

// Day titles where a colon would read oddly
const EXACT = {
    'Arrival Leh — Rest': 'Arrive in Leh and rest',
    'Arrival — Rest': 'Arrival and rest',
    'Pangong — Hemis': 'Pangong to Hemis',
};

function fixText(text) {
    if (typeof text !== 'string' || !text.includes('—')) return text;
    if (EXACT[text]) return EXACT[text];
    if (text.trim() === '—') return '-';
    // Sentence by sentence, so a dash in one sentence never pairs with one in the next
    return text
        .split(/(?<=[.!?])(\s+)/)
        .map((piece) => (/^\s+$/.test(piece) ? piece : fixSentence(piece)))
        .join('');
}

function fixDeep(value) {
    if (typeof value === 'string') return fixText(value);
    if (Array.isArray(value)) return value.map(fixDeep);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [fixText(k), fixDeep(v)]));
    }
    return value;
}

const FILES = [
    'src/models/site-settings-defaults.json',
    'src/models/trip-builder-defaults.json',
    'scripts/data/packages.json',
    'scripts/data/legacy-settings-defaults.json',
    'scripts/data/trip-images.json',
];

function fixFiles() {
    for (const rel of FILES) {
        const file = path.join(__dirname, '..', rel);
        if (!fs.existsSync(file)) continue;
        const raw = fs.readFileSync(file, 'utf8');
        const before = (raw.match(/—/g) || []).length;
        if (!before) continue;
        const indent = /^\{\n( +)/.exec(raw.replace(/\r/g, ''))?.[1]?.length || 2;
        const out = JSON.stringify(fixDeep(JSON.parse(raw)), null, indent) + (raw.endsWith('\n') ? '\n' : '');
        fs.writeFileSync(file, out);
        console.log(`${rel}: ${before} → ${(out.match(/—/g) || []).length}`);
    }
}

// Text columns of the site's own content (JSON columns are fixed inside, keeping their shape)
const COLUMNS = {
    tours: ['title', 'location', 'inclusions', 'itinerary', 'overview_about', 'package_options', 'best_time', 'validity'],
    destinations: ['name', 'description'],
    collections: ['name', 'title', 'description'],
    blog_posts: ['title', 'excerpt', 'content'],
    site_settings: ['data'],
};

async function fixDatabase(apply) {
    const db = createClient({ url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    for (const [table, wanted] of Object.entries(COLUMNS)) {
        const existing = new Set((await db.execute(`pragma table_info(${table})`)).rows.map((r) => r.name));
        const cols = wanted.filter((c) => existing.has(c));
        if (!cols.length) continue;
        const rows = (await db.execute(`select id, ${cols.join(', ')} from ${table}`)).rows;
        let changed = 0;
        for (const row of rows) {
            const updates = {};
            for (const col of cols) {
                const v = row[col];
                if (typeof v !== 'string' || !v.includes('—')) continue;
                let next;
                try {
                    const parsed = JSON.parse(v);
                    next = typeof parsed === 'object' && parsed !== null ? JSON.stringify(fixDeep(parsed)) : fixText(v);
                } catch {
                    next = fixText(v);
                }
                if (next !== v) updates[col] = next;
            }
            const keys = Object.keys(updates);
            if (!keys.length) continue;
            changed++;
            if (apply) {
                await db.execute({ sql: `update ${table} set ${keys.map((k) => `${k} = ?`).join(', ')} where id = ?`, args: [...keys.map((k) => updates[k]), row.id] });
            }
        }
        console.log(`${table}: ${changed} row(s) ${apply ? 'updated' : 'would change'}`);
    }
}

if (require.main === module) {
    fixFiles();
    fixDatabase(process.argv.includes('--apply')).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { fixText };
