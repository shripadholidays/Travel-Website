// One rule for "which tours belong to a destination", shared by the tour count
// on destination cards and the tour list on the destination page, so the two
// can never disagree: the destination's name or country appears as a whole
// word in the tour's location or title ("Japan" matches "Tokyo, Japan").

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function destinationPatterns(destination) {
    return [destination.name, destination.country]
        .filter(Boolean)
        .map((n) => new RegExp(`\\b${escapeRegex(String(n).trim())}\\b`, 'i'));
}

function tourMatchesDestination(tour, patterns) {
    return patterns.some((re) => re.test(tour.location || '') || re.test(tour.title || ''));
}

/** Mongo filter for the tours of a destination. */
function destinationTourQuery(destination) {
    const patterns = destinationPatterns(destination);
    if (!patterns.length) return { _id: null };
    return { $or: patterns.flatMap((re) => [{ location: re }, { title: re }]) };
}

module.exports = { escapeRegex, destinationPatterns, tourMatchesDestination, destinationTourQuery };
