const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const User = require('../src/models/User');
const SiteSettings = require('../src/models/SiteSettings');
const { clearTravelConfigCache } = require('../src/services/travel-config');

async function connect() {
    if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DB_URI);
}

async function disconnect() {
    await mongoose.connection.close();
}

async function reset() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
    clearTravelConfigCache();
}

let counter = 0;
async function createUser(role = 'user') {
    counter += 1;
    return User.create({
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
    await SiteSettings.findOneAndUpdate({}, update, { upsert: true, setDefaultsOnInsert: true });
    clearTravelConfigCache();
}

module.exports = { connect, disconnect, reset, createUser, cookieFor, setFeatures };
