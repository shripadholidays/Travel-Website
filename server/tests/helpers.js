const jwt = require('jsonwebtoken');
const config = require('../src/config');
const db = require('../src/db');
const { migrate } = require('../src/db/migrate');
const User = require('../src/models/User');
const SiteSettings = require('../src/models/SiteSettings');
const { clearTravelConfigCache } = require('../src/services/travel-config');
const { clearCurrencyCache } = require('../src/services/currency');

// Every test file gets its own in-memory database (see setup-env.js), migrated like production
async function connect() {
    db.connect();
    await migrate();
}

async function disconnect() {
    await db.close();
}

async function reset() {
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('schema_migrations') AND name NOT LIKE 'sqlite_%'");
    await db.batch(tables.map((t) => `DELETE FROM ${t.name}`));
    clearTravelConfigCache();
    clearCurrencyCache();
}

let counter = 0;
async function createUser(role = 'user') {
    counter += 1;
    return User.insert({
        displayName: `Test ${role} ${counter}`,
        email: `test-${role}-${counter}-${Date.now()}@example.com`,
        authProvider: 'local',
        role,
    });
}

function cookieFor(user) {
    const token = jwt.sign({ email: user.email }, config.auth.jwtSecret);
    return `${config.auth.cookieName}=${token}`;
}

async function setFeatures(features, travelMarkup) {
    const update = { features: { flights: false, hotels: false, ...features } };
    if (travelMarkup) update.travelMarkup = travelMarkup;
    await SiteSettings.update(update);
    clearTravelConfigCache();
}

module.exports = { connect, disconnect, reset, createUser, cookieFor, setFeatures };
