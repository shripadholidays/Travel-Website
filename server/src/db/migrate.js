'use strict';
/**
 * Applies the SQL files in src/db/migrations in order, once each. Runs on server start,
 * so a fresh Turso database is ready on the first deploy. Each file applies atomically.
 * To change the schema later, add the next numbered file (002_….sql); never edit an applied one.
 */
const fs = require('fs');
const path = require('path');
const { all, run, batch } = require('./index');
const logger = require('../utils/logger');

const DIR = path.join(__dirname, 'migrations');

// Statements are separated by semicolons at the end of a line; comments are dropped
function statements(sql) {
    return sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.split(/\r?\n/).filter((line) => !line.trim().startsWith('--')).join('\n').trim())
        .filter(Boolean);
}

async function migrate() {
    await run('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const done = new Set((await all('SELECT version FROM schema_migrations')).map((r) => r.version));
    const files = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    const applied = [];
    for (const file of files) {
        if (done.has(file)) continue;
        const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
        await batch([
            ...statements(sql),
            { sql: 'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', args: [file, new Date().toISOString()] },
        ]);
        applied.push(file);
        logger.info(`Applied database migration ${file}`);
    }
    return applied;
}

module.exports = { migrate, statements };
