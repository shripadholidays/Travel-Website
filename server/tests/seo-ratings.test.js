const TravelDestination = require('../src/models/TravelDestination');
const Review = require('../src/models/Review');
const { recomputeTourRating } = require('../src/services/rating-service');
const { connect, disconnect, reset, createUser } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
beforeEach(reset);

function tour() {
    return TravelDestination.insert({
        title: 'Discover Tokyo',
        location: 'Tokyo, Japan',
        price: 1000,
        currency: 'USD',
        duration: { days: 6, nights: 5 },
        validity: new Date(Date.now() + 365 * 86400000),
        imageURL: 'https://example.com/tokyo.jpg',
        overview: { about: 'Neon streets and quiet temples.' },
    });
}

// Star ratings feed the tour page and its Product structured data, so they must be travellers' own
describe('tour rating', () => {
    test('counts traveller reviews only, never staff reviews', async () => {
        const t = await tour();
        const admin = await createUser('admin');
        const editor = await createUser('editor');
        const traveller = await createUser();
        await Review.insert({ tour: t._id, user: admin._id, rating: 5, content: 'Seeded sample review' });
        await Review.insert({ tour: t._id, user: editor._id, rating: 5, content: 'Staff review' });
        await Review.insert({ tour: t._id, user: traveller._id, rating: 3, content: 'Good trip, long transfers' });

        expect(await recomputeTourRating(t._id)).toEqual({ rating: 3, basedOn: 1 });
    });

    test('a tour reviewed only by staff has no rating', async () => {
        const t = await tour();
        const admin = await createUser('admin');
        await Review.insert({ tour: t._id, user: admin._id, rating: 5, content: 'Seeded sample review' });

        expect(await recomputeTourRating(t._id)).toEqual({ rating: 0, basedOn: 0 });
    });
});
