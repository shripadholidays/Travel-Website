'use strict';
/** Small helpers for writing WHERE clauses safely (every value goes in as a parameter). */
const { idOf } = require('./ids');
const { getPath, setPath } = require('./table');

const escapeLike = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);

/** Collects conditions joined with AND. */
class Where {
    constructor() {
        this.parts = [];
        this.args = [];
    }

    add(sql, ...args) {
        this.parts.push(sql);
        this.args.push(...args);
        return this;
    }

    in(column, values) {
        const list = [...values];
        if (list.length === 0) return this.add('0');
        return this.add(`${column} IN (${list.map(() => '?').join(', ')})`, ...list);
    }

    get sql() {
        return this.parts.map((p) => `(${p})`).join(' AND ');
    }
}

/** "column contains text" in any of the columns, ignoring case. */
function containsAny(columns, text) {
    const pattern = `%${escapeLike(String(text).toLowerCase())}%`;
    return {
        sql: columns.map((c) => `lower(${c}) LIKE ? ESCAPE '\\'`).join(' OR '),
        args: columns.map(() => pattern),
    };
}

// Separators treated as spaces when matching whole words
const SEPARATORS = [',', '.', '-', '/', '(', ')', ':', ';', '&', '|', "'"];

/** "column has this as a whole word or phrase", ignoring case: "Japan" matches "Tokyo, Japan" but not "Japanese". */
function wordMatch(column, phrase) {
    let expr = `lower(coalesce(${column}, ''))`;
    for (const s of SEPARATORS) expr = `replace(${expr}, '${s === "'" ? "''" : s}', ' ')`;
    // "Kyoto, Japan" → "kyoto  japan": collapse the runs of spaces so phrases match
    for (let i = 0; i < 3; i++) expr = `replace(${expr}, '  ', ' ')`;
    const words = String(phrase).toLowerCase().split(/[\s,.\-/():;&|']+/).filter(Boolean).join(' ');
    return { sql: `(' ' || ${expr} || ' ') LIKE ? ESCAPE '\\'`, args: [`% ${escapeLike(words)} %`] };
}

/** Same rule in JavaScript, for filtering records already loaded. */
function wordMatchJs(text, phrase) {
    const norm = (s) => ` ${String(s || '').toLowerCase().split(/[\s,.\-/():;&|']+/).filter(Boolean).join(' ')} `;
    const words = norm(phrase).trim();
    return words !== '' && norm(text).includes(` ${words} `);
}

/** The values of a JSON array column contain this value. */
const jsonHas = (column) => `EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value = ?)`;

/** Pagination numbers from a request. */
function paging(query, fallback, max = 200) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(max, Math.max(1, Number(query.limit) || fallback));
    return { page, limit, offset: (page - 1) * limit };
}
const pageInfo = (total, { page, limit }) => ({ total, page, limit, pages: Math.ceil(total / limit) });

function pick(doc, fields) {
    const out = { _id: doc._id };
    for (const f of fields.split(/\s+/).filter(Boolean)) {
        const v = getPath(doc, f);
        if (v !== undefined) setPath(out, f, v);
    }
    return out;
}

/**
 * Replaces reference ids with the records they point to (null when gone).
 * `fields` limits what is copied (space-separated paths, like "title imageURL");
 * `match` drops records that fail it (array references only keep the matches).
 */
async function populate(docs, path, Model, fields, { match } = {}) {
    const list = (Array.isArray(docs) ? docs : [docs]).filter(Boolean);
    const ids = new Set();
    for (const d of list) {
        const v = getPath(d, path);
        for (const x of Array.isArray(v) ? v : [v]) {
            const id = idOf(x);
            if (id) ids.add(id);
        }
    }
    const found = new Map((await Model.findByIds([...ids])).map((r) => [r._id, r]));
    const shape = (r) => (fields ? pick(r, fields) : r);
    for (const d of list) {
        const v = getPath(d, path);
        if (Array.isArray(v)) {
            setPath(d, path, v.map((x) => found.get(idOf(x))).filter((r) => r && (!match || match(r))).map(shape));
        } else if (v !== null && v !== undefined) {
            const r = found.get(idOf(v));
            setPath(d, path, r && (!match || match(r)) ? shape(r) : null);
        }
    }
    return docs;
}

module.exports = { Where, escapeLike, containsAny, wordMatch, wordMatchJs, jsonHas, paging, pageInfo, pick, populate };
