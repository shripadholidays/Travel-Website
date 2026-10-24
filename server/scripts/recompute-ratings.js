/**
 * Recalculates every tour's rating and review count from its real reviews.
 * Run: npm run ratings:recompute
 */
require('dotenv').config({ quiet: true });
const db = require('../src/db');
const { migrate } = require('../src/db/migrate');
const { recomputeAllTourRatings } = require('../src/services/rating-service');

(async () => {
    db.connect();
    await migrate();
    const count = await recomputeAllTourRatings();
    console.log(`Recomputed ratings for ${count} tour(s).`);
    await db.close();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
