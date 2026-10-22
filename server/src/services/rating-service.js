const mongoose = require('mongoose');
const Review = require('../models/Review');
const TravelDestination = require('../models/TravelDestination');

/** Sets a tour's rating and review count from its actual reviews (0 / 0 when it has none). */
async function recomputeTourRating(tourId) {
    const [agg] = await Review.aggregate([
        { $match: { tour: new mongoose.Types.ObjectId(String(tourId)) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const rating = agg ? Math.round(agg.avg * 10) / 10 : 0;
    const basedOn = agg ? agg.count : 0;
    await TravelDestination.updateOne({ _id: tourId }, { $set: { 'reviews.rating': rating, 'reviews.basedOn': basedOn } });
    return { rating, basedOn };
}

async function recomputeAllTourRatings() {
    const ids = await TravelDestination.distinct('_id');
    for (const id of ids) await recomputeTourRating(id);
    return ids.length;
}

module.exports = { recomputeTourRating, recomputeAllTourRatings };
