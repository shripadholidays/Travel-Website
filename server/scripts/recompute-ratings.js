/**
 * Recalculates every tour's rating and review count from its real reviews.
 * Run: npm run ratings:recompute
 */
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { recomputeAllTourRatings } = require('../src/services/rating-service');

(async () => {
    await mongoose.connect(process.env.DB_URI || 'mongodb://127.0.0.1:27017/wandeazy');
    const count = await recomputeAllTourRatings();
    console.log(`Recomputed ratings for ${count} tour(s).`);
    await mongoose.disconnect();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
