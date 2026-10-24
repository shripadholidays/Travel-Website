/**
 * Copies everything from the old MongoDB database into the Turso / libSQL database:
 * accounts (password hashes included), tours, destinations, collections, bookings, payments,
 * flight and hotel orders, reviews, articles, coupons, messages, subscribers, the activity log
 * and the site settings. Ids are kept, so every link and reference stays the same.
 *
 * Run it once, before going live:
 *   MONGO_URI=mongodb://127.0.0.1:27017/wandeazy npm run db:import-mongo
 * It writes to the database in TURSO_DATABASE_URL (or the local file when that is unset).
 * Tables that already have rows are skipped, unless you pass --replace to empty them first.
 */
require('dotenv').config({ quiet: true });
const config = require('../src/config');
const db = require('../src/db');
const { migrate } = require('../src/db/migrate');
const SiteSettings = require('../src/models/SiteSettings');

// MongoDB collection → model (Mongoose pluralised the model names like this)
const COLLECTIONS = [
    ['users', 'User'],
    ['travel_destinations', 'TravelDestination'],
    ['destinations', 'Destination'],
    ['collections', 'Collection'],
    ['bookings', 'Booking'],
    ['travelorders', 'TravelOrder'],
    ['payments', 'Payment'],
    ['reviews', 'Review'],
    ['blogposts', 'BlogPost'],
    ['coupons', 'Coupon'],
    ['user_inquiries', 'UserInquiry'],
    ['newslettersubscribers', 'NewsletterSubscriber'],
    ['wishlists', 'Wishlist'],
    ['activitylogs', 'ActivityLog'],
];

// ObjectIds become their 24-character hex string; everything else is kept as it is
function plain(value) {
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value;
    if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return value.toHexString();
    if (Array.isArray(value)) return value.map(plain);
    if (typeof value === 'object') {
        if (value._bsontype === 'Decimal128' || value._bsontype === 'Long' || value._bsontype === 'Double' || value._bsontype === 'Int32') return Number(value.toString());
        const out = {};
        for (const [k, v] of Object.entries(value)) if (k !== '__v') out[k] = plain(v);
        return out;
    }
    return value;
}

async function main() {
    const uri = process.env.MONGO_URI || process.env.DB_URI;
    if (!uri || !uri.startsWith('mongodb')) throw new Error('Set MONGO_URI to the old MongoDB connection string.');
    const replace = process.argv.includes('--replace');
    let MongoClient;
    try {
        ({ MongoClient } = require('mongodb'));
    } catch {
        throw new Error('The "mongodb" package is needed for the import: run `npm install --no-save mongodb` first.');
    }

    db.connect();
    await migrate();
    const mongo = await MongoClient.connect(uri);
    const source = mongo.db();
    console.log(`Importing from ${source.databaseName} into ${config.db.url.startsWith('file:') ? config.db.url : 'Turso'}…`);

    try {
        for (const [name, modelName] of COLLECTIONS) {
            const Model = require(`../src/models/${modelName}`);
            const existing = await Model.count();
            if (existing && !replace) { console.log(`  - ${Model.table}: already has ${existing} row(s), skipped`); continue; }
            if (existing) await Model.removeWhere();
            const docs = (await source.collection(name).find().toArray()).map(plain);
            if (docs.length) await Model.insertMany(docs, { trusted: true });
            console.log(`  ✓ ${Model.table}: ${docs.length}`);
        }

        const settings = plain(await source.collection('sitesettings').findOne());
        if (settings && (replace || !(await SiteSettings.find()))) {
            delete settings._id;
            await SiteSettings.save(settings);
            console.log('  ✓ site settings');
        } else {
            console.log(settings ? '  - site settings: already set, skipped' : '  - site settings: none in MongoDB');
        }
    } finally {
        await mongo.close();
        await db.close();
    }
    console.log('Done. Recompute ratings with `npm run ratings:recompute` if reviews were imported.');
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
