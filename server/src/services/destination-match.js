// One rule for "which tours belong to a destination", shared by the tour count
// on destination cards and the tour list on the destination page, so the two
// can never disagree: the destination's name or country appears as a whole
// word in the tour's location or title ("Japan" matches "Tokyo, Japan").
const { wordMatch, wordMatchJs } = require('../db/sql');

const destinationNames = (destination) => [destination.name, destination.country].map((n) => String(n || '').trim()).filter(Boolean);

function tourMatchesDestination(tour, names) {
    return names.some((n) => wordMatchJs(tour.location, n) || wordMatchJs(tour.title, n));
}

/** SQL condition for the tours of a destination: { sql, args }. */
function destinationTourQuery(destination) {
    const names = destinationNames(destination);
    if (!names.length) return { sql: '0', args: [] };
    const parts = names.flatMap((n) => [wordMatch('location', n), wordMatch('title', n)]);
    return { sql: parts.map((p) => p.sql).join(' OR '), args: parts.flatMap((p) => p.args) };
}

module.exports = { destinationNames, tourMatchesDestination, destinationTourQuery };
