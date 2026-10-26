const { all, get, run } = require('../db');
const { STAFF_ROLES } = require('../config/permissions');

// Reviews by our own staff are not traveller ratings (same rule as the homepage testimonials)
const BY_TRAVELLERS = `user_id NOT IN (SELECT id FROM users WHERE role IN (${STAFF_ROLES.map((r) => `'${r}'`).join(', ')}))`;

/** Sets a tour's rating and review count from its travellers' reviews (0 / 0 when it has none). */
async function recomputeTourRating(tourId) {
    const id = String(tourId?._id ?? tourId);
    const agg = await get(`SELECT AVG(rating) AS avg, COUNT(*) AS n FROM reviews WHERE tour_id = ? AND ${BY_TRAVELLERS}`, [id]);
    const basedOn = Number(agg?.n || 0);
    const rating = basedOn ? Math.round(agg.avg * 10) / 10 : 0;
    await run('UPDATE tours SET reviews_rating = ?, reviews_based_on = ? WHERE id = ?', [rating, basedOn, id]);
    return { rating, basedOn };
}

async function recomputeAllTourRatings() {
    const rows = await all('SELECT id FROM tours');
    for (const { id } of rows) await recomputeTourRating(id);
    return rows.length;
}

module.exports = { recomputeTourRating, recomputeAllTourRatings };
