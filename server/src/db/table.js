'use strict';
/**
 * Maps between database rows and the records the API returns.
 *
 * A table is declared once with its fields (see src/models). Each field has a path in the
 * record ("duration.days"), a column ("duration_days") and a type, plus optional rules
 * (required, enum, min, max…). Records come back with `_id`, nested objects, real Dates and
 * parsed JSON, the same shape the API has always sent, so the frontend needs no changes.
 */
const { all, get, run, batch } = require('./index');
const { newId, isId, idOf } = require('./ids');
const { ValidationError, translate } = require('./errors');

const snake = (p) => p.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/\./g, '_').toLowerCase();

function getPath(obj, p) {
    return p.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
}

function setPath(obj, p, value) {
    const keys = p.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (o[keys[i]] === null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
        o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
}

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const SQL_TYPES = { text: 'TEXT', number: 'REAL', int: 'INTEGER', bool: 'INTEGER', date: 'TEXT', json: 'TEXT', ref: 'TEXT', refs: 'TEXT' };

class CastFailure extends Error {}

// Turns whatever the client or code sent into the field's type (throws CastFailure when it can't)
function castValue(field, value) {
    if (value === undefined || value === null) return value;
    switch (field.type) {
        case 'text': {
            let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
            if (field.trim) s = s.trim();
            if (field.lowercase) s = s.toLowerCase();
            if (field.uppercase) s = s.toUpperCase();
            return s;
        }
        case 'number':
        case 'int': {
            if (value === '') return null;
            const n = Number(value);
            if (typeof value === 'boolean' || !Number.isFinite(n)) throw new CastFailure();
            return field.type === 'int' ? Math.round(n) : n;
        }
        case 'bool':
            if (value === 'true' || value === 1 || value === '1') return true;
            if (value === 'false' || value === 0 || value === '0' || value === '') return false;
            if (typeof value !== 'boolean') throw new CastFailure();
            return value;
        case 'date': {
            if (value === '') return null;
            const d = value instanceof Date ? value : new Date(value);
            if (Number.isNaN(d.getTime())) throw new CastFailure();
            return d;
        }
        case 'ref':
            return idOf(value);
        case 'refs':
            if (!Array.isArray(value)) throw new CastFailure();
            return value.map(idOf).filter(Boolean);
        case 'json': {
            if (field.itemIds && Array.isArray(value)) {
                return value.map((item) => (item && typeof item === 'object' && !Array.isArray(item)
                    ? { ...item, _id: isId(String(item._id || '')) ? String(item._id) : newId() }
                    : item));
            }
            return clone(value);
        }
        default:
            return value;
    }
}

function encode(field, value) {
    if (value === undefined || value === null) return null;
    switch (field.type) {
        case 'bool': return value ? 1 : 0;
        case 'date': return value.toISOString();
        case 'json':
        case 'refs': return JSON.stringify(value);
        default: return value;
    }
}

function decode(field, raw) {
    if (raw === null || raw === undefined) {
        if (field.type === 'refs') return [];
        if (field.type === 'json' && field.default !== undefined) return clone(typeof field.default === 'function' ? field.default() : field.default);
        if (field.type === 'bool' && field.default !== undefined) return field.default;
        return null;
    }
    switch (field.type) {
        case 'bool': return raw === 1 || raw === true || raw === '1';
        case 'date': return new Date(raw);
        case 'json':
        case 'refs':
            try { return JSON.parse(raw); } catch { return field.type === 'refs' ? [] : null; }
        case 'number':
        case 'int': return Number(raw);
        default: return raw;
    }
}

const isBlank = (v) => v === undefined || v === null || v === '';

// Unset fields with no default are left out of records (as the API has always done), so the
// client can tell "not set" from a value. Lists and fields with a default always appear.
const omitWhenEmpty = (f) => f.default === undefined && f.type !== 'refs';

function defineTable({ table, fields, timestamps = true, validate, beforeSave }) {
    const list = Object.entries(fields).map(([path, spec]) => {
        const f = typeof spec === 'string' ? { type: spec } : { ...spec };
        return { ...f, path, col: f.col || snake(path), label: f.label || path };
    });
    const byPath = new Map(list.map((f) => [f.path, f]));
    const hasCreated = timestamps === true || timestamps?.createdAt;
    const hasUpdated = timestamps === true || timestamps?.updatedAt;

    function fromRow(row, { secrets = false } = {}) {
        if (!row) return null;
        const doc = { _id: row.id };
        for (const f of list) {
            if (f.hidden && !secrets) continue;
            const raw = row[f.col];
            if ((raw === null || raw === undefined) && omitWhenEmpty(f)) continue;
            setPath(doc, f.path, decode(f, raw));
        }
        if (hasCreated) doc.createdAt = row.created_at ? new Date(row.created_at) : null;
        if (hasUpdated) doc.updatedAt = row.updated_at ? new Date(row.updated_at) : null;
        return doc;
    }

    function applyDefaults(doc) {
        for (const f of list) {
            if (f.default !== undefined && getPath(doc, f.path) === undefined) {
                setPath(doc, f.path, typeof f.default === 'function' ? f.default(doc) : clone(f.default));
            }
        }
    }

    // Casts every field in place and checks its rules; throws one ValidationError listing every problem.
    // trusted (imports of existing data only): values that can't be cast become null and rules are not applied.
    async function prepare(doc, { isNew, trusted = false }) {
        if (isNew) applyDefaults(doc);
        const errors = {};
        for (const f of list) {
            const value = getPath(doc, f.path);
            if (value === undefined) continue;
            try {
                setPath(doc, f.path, castValue(f, value));
            } catch {
                if (trusted) setPath(doc, f.path, null);
                else errors[f.path] = { kind: 'CastError', message: `${f.label} has an invalid value` };
            }
        }
        if (beforeSave) await beforeSave(doc, { isNew });
        if (trusted) return;
        for (const f of list) {
            if (errors[f.path]) continue;
            const value = getPath(doc, f.path);
            const required = typeof f.required === 'function' ? f.required(doc) : f.required;
            if (required && isBlank(value)) {
                errors[f.path] = { kind: 'required', message: f.requiredMessage || (typeof f.required === 'string' ? f.required : `${f.label} is required`) };
                continue;
            }
            if (isBlank(value)) continue;
            if (f.enum && !f.enum.includes(value)) errors[f.path] = { kind: 'enum', message: f.enumMessage || `${f.label} has an invalid value` };
            else if (f.min !== undefined && value < f.min) errors[f.path] = { kind: 'min', message: f.minMessage || `${f.label} must be at least ${f.min}` };
            else if (f.max !== undefined && value > f.max) errors[f.path] = { kind: 'max', message: f.maxMessage || `${f.label} must be at most ${f.max}` };
            else if (f.maxlength !== undefined && String(value).length > f.maxlength) errors[f.path] = { kind: 'maxlength', message: `${f.label} must be at most ${f.maxlength} characters` };
            else if (f.match && !f.match.test(String(value))) errors[f.path] = { kind: 'match', message: f.matchMessage || `${f.label} is not valid` };
            else if (f.validate) {
                const problem = f.validate(value, doc);
                if (problem) errors[f.path] = { kind: 'custom', message: problem };
            }
        }
        if (validate) Object.assign(errors, Object.fromEntries(Object.entries(validate(doc) || {}).filter(([k]) => !errors[k]).map(([k, message]) => [k, { kind: 'custom', message }])));
        if (Object.keys(errors).length) throw new ValidationError(errors);
    }

    function insertStatement(doc) {
        const cols = ['id'];
        const args = [doc._id];
        for (const f of list) {
            cols.push(f.col);
            args.push(encode(f, getPath(doc, f.path)));
        }
        if (hasCreated) { cols.push('created_at'); args.push(doc.createdAt.toISOString()); }
        if (hasUpdated) { cols.push('updated_at'); args.push(doc.updatedAt.toISOString()); }
        return { sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args };
    }

    // The record as the API sees it once written (hidden fields left out)
    function materialize(doc) {
        const out = { _id: doc._id };
        for (const f of list) {
            if (f.hidden) continue;
            const v = getPath(doc, f.path);
            if (v === undefined || v === null) {
                if (!omitWhenEmpty(f)) setPath(out, f.path, decode(f, null));
                continue;
            }
            setPath(out, f.path, f.type === 'date' ? new Date(v) : clone(v));
        }
        if (hasCreated) out.createdAt = doc.createdAt;
        if (hasUpdated) out.updatedAt = doc.updatedAt;
        return out;
    }

    async function newRecord(input, { trusted } = {}) {
        const doc = { ...input };
        doc._id = isId(String(input._id || '')) ? String(input._id) : newId();
        const now = new Date();
        if (hasCreated) doc.createdAt = input.createdAt ? new Date(input.createdAt) : now;
        if (hasUpdated) doc.updatedAt = input.updatedAt ? new Date(input.updatedAt) : now;
        await prepare(doc, { isNew: true, trusted });
        return doc;
    }

    async function insert(input) {
        const doc = await newRecord(input);
        try {
            await run(...Object.values(insertStatement(doc)));
        } catch (err) {
            throw translate(err);
        }
        return materialize(doc);
    }

    /** Validates every row first, then writes them all atomically. { trusted: true } is for importing existing data. */
    async function insertMany(inputs, { trusted = false } = {}) {
        const docs = [];
        for (const input of inputs) docs.push(await newRecord(input, { trusted }));
        try {
            for (let i = 0; i < docs.length; i += 200) await batch(docs.slice(i, i + 200).map(insertStatement));
        } catch (err) {
            throw translate(err);
        }
        return docs.map(materialize);
    }

    /** Checks a record against the rules without saving it. Returns the ValidationError or null. */
    async function check(input, { isNew = true } = {}) {
        try {
            await prepare({ ...input }, { isNew });
            return null;
        } catch (err) {
            if (err.name === 'ValidationError') return err;
            throw err;
        }
    }

    /**
     * Writes a whole record (inserting it when it has no id yet) and updates the caller's
     * object with the saved values. Loaded references (e.g. booking.tour) stay loaded.
     */
    async function save(doc) {
        if (!doc._id) return Object.assign(doc, await insert(doc));
        const work = { ...doc };
        await prepare(work, { isNew: false });
        if (hasUpdated) work.updatedAt = new Date();
        const sets = [];
        const args = [];
        for (const f of list) {
            const v = getPath(work, f.path);
            if (f.hidden && v === undefined) continue;
            sets.push(`${f.col} = ?`);
            args.push(encode(f, v === undefined ? null : v));
        }
        if (hasUpdated) { sets.push('updated_at = ?'); args.push(work.updatedAt.toISOString()); }
        try {
            await run(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, [...args, doc._id]);
        } catch (err) {
            throw translate(err);
        }
        const saved = materialize(work);
        for (const f of list) {
            if (f.hidden) continue;
            const current = getPath(doc, f.path);
            const loaded = (f.type === 'ref' && current && typeof current === 'object')
                || (f.type === 'refs' && Array.isArray(current) && current.some((x) => x && typeof x === 'object'));
            if (!loaded) setPath(doc, f.path, getPath(saved, f.path));
        }
        if (hasUpdated) doc.updatedAt = saved.updatedAt;
        return doc;
    }

    /** Loads, changes the given top-level fields (or dot paths), validates and saves. */
    async function update(id, changes) {
        const doc = await findById(id, { secrets: true });
        if (!doc) return null;
        for (const [key, value] of Object.entries(changes)) {
            if (key.includes('.')) setPath(doc, key, value);
            else doc[key] = value;
        }
        await save(doc);
        return materialize(doc);
    }

    /** Direct column writes with no validation, for counters and bulk status changes. */
    async function setWhere(changes, where, args = []) {
        const sets = [];
        const vals = [];
        for (const [path, value] of Object.entries(changes)) {
            const f = byPath.get(path);
            if (!f) throw new Error(`Unknown field ${path} on ${table}`);
            sets.push(`${f.col} = ?`);
            vals.push(encode(f, castValue(f, value)));
        }
        if (hasUpdated) { sets.push('updated_at = ?'); vals.push(new Date().toISOString()); }
        const r = await run(`UPDATE ${table} SET ${sets.join(', ')}${where ? ` WHERE ${where}` : ''}`, [...vals, ...args]);
        return r.changes;
    }

    async function find({ where, args = [], order, limit, offset, secrets } = {}) {
        let sql = `SELECT * FROM ${table}`;
        if (where) sql += ` WHERE ${where}`;
        if (order) sql += ` ORDER BY ${order}`;
        if (limit !== undefined) { sql += ' LIMIT ?'; args = [...args, Number(limit)]; }
        if (offset) { if (limit === undefined) sql += ' LIMIT -1'; sql += ' OFFSET ?'; args = [...args, Number(offset)]; }
        return (await all(sql, args)).map((r) => fromRow(r, { secrets }));
    }

    async function findOne(where, args = [], opts = {}) {
        return (await find({ where, args, limit: 1, order: opts.order, secrets: opts.secrets }))[0] || null;
    }

    async function findById(id, opts = {}) {
        if (!isId(String(id || ''))) return null;
        return fromRow(await get(`SELECT * FROM ${table} WHERE id = ?`, [String(id)]), opts);
    }

    async function findByIds(ids, opts = {}) {
        const clean = [...new Set(ids.map(idOf).filter((id) => isId(id || '')))];
        const out = [];
        for (let i = 0; i < clean.length; i += 400) {
            const part = clean.slice(i, i + 400);
            out.push(...(await all(`SELECT * FROM ${table} WHERE id IN (${part.map(() => '?').join(',')})`, part)).map((r) => fromRow(r, opts)));
        }
        return out;
    }

    async function count(where, args = []) {
        const row = await get(`SELECT COUNT(*) AS n FROM ${table}${where ? ` WHERE ${where}` : ''}`, args);
        return Number(row?.n || 0);
    }

    /** { value: count } grouped by one field, e.g. countBy('status') → { active: 3, draft: 1 }. */
    async function countBy(path, where, args = []) {
        const c = col(path);
        const rows = await all(`SELECT ${c} AS k, COUNT(*) AS n FROM ${table}${where ? ` WHERE ${where}` : ''} GROUP BY ${c}`, args);
        return Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
    }

    async function remove(id) {
        const doc = await findById(id);
        if (!doc) return null;
        await run(`DELETE FROM ${table} WHERE id = ?`, [doc._id]);
        return doc;
    }

    async function removeWhere(where, args = []) {
        return (await run(`DELETE FROM ${table}${where ? ` WHERE ${where}` : ''}`, args)).changes;
    }

    /** The column behind a field path, for hand-written SQL. */
    function col(path) {
        if (path === '_id' || path === 'id') return 'id';
        if (path === 'createdAt') return 'created_at';
        if (path === 'updatedAt') return 'updated_at';
        const f = byPath.get(path);
        if (!f) throw new Error(`Unknown field ${path} on ${table}`);
        return f.col;
    }

    /** CREATE TABLE statement, used to write the first migration. */
    function ddl() {
        const lines = ['    id TEXT PRIMARY KEY'];
        for (const f of list) lines.push(`    ${f.col} ${SQL_TYPES[f.type] || 'TEXT'}${f.unique ? ' UNIQUE' : ''}`);
        if (hasCreated) lines.push('    created_at TEXT NOT NULL');
        if (hasUpdated) lines.push('    updated_at TEXT NOT NULL');
        return `CREATE TABLE ${table} (\n${lines.join(',\n')}\n);`;
    }

    return {
        table, fields: list, fromRow, materialize, insert, insertMany, check, save, update, setWhere,
        find, findOne, findById, findByIds, count, countBy, remove, removeWhere, col, ddl,
    };
}

module.exports = { defineTable, getPath, setPath };
