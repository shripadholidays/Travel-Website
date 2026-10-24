'use strict';
/**
 * The database: Turso (libSQL) in production, a local SQLite file in development,
 * in-memory for tests. Every query in the app goes through these helpers.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const config = require('../config');

let client = null;

function connect(url = config.db.url, authToken = config.db.authToken) {
    if (client) return client;
    // A local file database needs its folder to exist
    if (url.startsWith('file:')) {
        const file = url.slice('file:'.length);
        fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    }
    client = createClient({ url, authToken: authToken || undefined, intMode: 'number' });
    return client;
}

function db() {
    return client || connect();
}

async function close() {
    if (client) client.close();
    client = null;
}

// libSQL rows are array-like; the app works with plain objects keyed by column
const plain = (result) => result.rows.map((row) => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])));

async function all(sql, args = []) {
    return plain(await db().execute({ sql, args }));
}

async function get(sql, args = []) {
    return (await all(sql, args))[0] || null;
}

async function run(sql, args = []) {
    const r = await db().execute({ sql, args });
    return { changes: r.rowsAffected, lastId: r.lastInsertRowid };
}

/** Runs several statements atomically: all apply or none do. */
async function batch(statements) {
    if (statements.length === 0) return [];
    return db().batch(statements.map((s) => (typeof s === 'string' ? { sql: s, args: [] } : s)), 'write');
}

/** Interactive transaction: `await transaction(async (tx) => { await tx.run(...) })`. */
async function transaction(work) {
    const tx = await db().transaction('write');
    const wrap = {
        all: async (sql, args = []) => plain(await tx.execute({ sql, args })),
        get: async (sql, args = []) => plain(await tx.execute({ sql, args }))[0] || null,
        run: async (sql, args = []) => ({ changes: (await tx.execute({ sql, args })).rowsAffected }),
    };
    try {
        const result = await work(wrap);
        await tx.commit();
        return result;
    } catch (err) {
        await tx.rollback().catch(() => {});
        throw err;
    } finally {
        tx.close();
    }
}

async function ping() {
    await db().execute('SELECT 1');
    return true;
}

module.exports = { connect, db, close, all, get, run, batch, transaction, ping };
