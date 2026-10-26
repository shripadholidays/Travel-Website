const request = require('supertest');
const app = require('../src/app');
const CustomTrip = require('../src/models/CustomTrip');
const { DEFAULTS, estimateTrip, normalizeCatalogue } = require('../src/services/trip-builder');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const shimla = DEFAULTS.places.find((p) => p.id === 'shimla');
const manali = DEFAULTS.places.find((p) => p.id === 'manali');
const deluxe = DEFAULTS.hotelClasses.find((h) => h.key === 'deluxe');
const cab = DEFAULTS.extras.find((x) => x.id === 'cab');

const trip = (overrides = {}) => ({
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    phoneNumber: '+91 98765 43210',
    adults: 2,
    children: 0,
    hotelClass: 'deluxe',
    extras: ['cab'],
    startDate: future(40),
    stops: [
        { placeId: 'shimla', nights: 2, days: [[{ title: 'Mall Road evening' }], []] },
        { placeId: 'manali', nights: 3, days: [[], [{ title: 'Solang Valley', note: 'Cable car' }], []] },
    ],
    ...overrides,
});

let admin;
let traveller;
beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    admin = await createUser('admin');
    traveller = await createUser();
});

describe('trip builder price range', () => {
    it('adds up each stay, the hotel class and the extras for everyone travelling', () => {
        const est = estimateTrip(DEFAULTS, { stops: [{ placeId: 'shimla', nights: 2 }, { placeId: 'manali', nights: 3 }], hotelClass: 'deluxe', extras: ['cab'], adults: 2, children: 1 });
        const people = 2 + DEFAULTS.childShare;
        const low = 2 * (shimla.nightlyFrom + deluxe.extraFrom) * people + 3 * (manali.nightlyFrom + deluxe.extraFrom) * people + cab.priceFrom * 6;
        const high = 2 * (shimla.nightlyTo + deluxe.extraTo) * people + 3 * (manali.nightlyTo + deluxe.extraTo) * people + cab.priceTo * 6;
        expect(est).toMatchObject({ nights: 5, days: 6, people: 3, low: Math.floor(low / 500) * 500, high: Math.ceil(high / 500) * 500 });
        expect(est.low).toBeLessThan(est.high);
        expect(est.lines).toHaveLength(3);
    });

    it('is zero for an empty trip', () => {
        expect(estimateTrip(DEFAULTS, { stops: [], hotelClass: 'economy', adults: 2 })).toMatchObject({ low: 0, high: 0, nights: 0, days: 0 });
    });

    it('checks the price list the team edits', () => {
        expect(() => normalizeCatalogue({ ...DEFAULTS, places: [{ ...shimla, nightlyTo: 10 }] })).toThrow(/up to/);
        expect(() => normalizeCatalogue({ ...DEFAULTS, hotelClasses: [] })).toThrow(/hotel class/);
        const tidy = normalizeCatalogue({ ...DEFAULTS, places: [{ ...shimla, id: '' }, { ...shimla, id: '' }] });
        expect(tidy.places.map((p) => p.id)).toEqual(['shimla', 'shimla-2']);
    });
});

describe('POST /api/v1/custom-trips', () => {
    it('saves a guest trip with the server-worked range and route', async () => {
        const res = await request(app).post('/api/v1/custom-trips').send({ ...trip(), estimate: { low: 1, high: 2 } });
        expect(res.status).toBe(200);
        const saved = res.body.data.trip;
        expect(saved.title).toBe('Shimla → Manali');
        expect(saved.stops.map((s) => [s.name, s.nights, s.days.length])).toEqual([['Shimla', 2, 2], ['Manali', 3, 3]]);
        expect(saved.stops[1].days[1]).toEqual([{ title: 'Solang Valley', note: 'Cable car' }]);
        expect(saved.extras).toEqual([{ id: 'cab', label: cab.label }]);
        expect(saved.estimate.low).toBeGreaterThan(2);
        expect(saved.estimate.hotelLabel).toBe('Deluxe');
        expect(saved.status).toBe('new');
        expect(saved.staffNote).toBeUndefined();
        expect(saved.user).toBeUndefined();
    });

    it('links the trip to a signed-in traveller and lists it for them only', async () => {
        await request(app).post('/api/v1/custom-trips').set('Cookie', cookieFor(traveller)).send(trip({ fullName: '', email: '' }));
        await request(app).post('/api/v1/custom-trips').send(trip());
        const mine = await request(app).get('/api/v1/custom-trips/mine').set('Cookie', cookieFor(traveller));
        expect(mine.status).toBe(200);
        expect(mine.body.data.trips).toHaveLength(1);
        expect(mine.body.data.trips[0]).toMatchObject({ email: traveller.email, fullName: traveller.displayName });
        expect((await request(app).get('/api/v1/custom-trips/mine')).status).toBe(401);
    });

    it.each([
        ['no places', { stops: [] }, /at least one place/],
        ['an unknown place', { stops: [{ placeId: 'atlantis', nights: 2 }] }, /no longer offered/],
        ['too many nights in a place', { stops: [{ placeId: 'shimla', nights: 40 }] }, /between 1 and 7 nights/],
        ['an unknown hotel class', { hotelClass: 'palace' }, /hotel class/],
        ['no adults', { adults: 0 }, /Adults/],
        ['a past start date', { startDate: '2020-01-01' }, /future/],
        ['no email', { email: '' }, /Email/],
    ])('turns down a trip with %s', async (_, change, message) => {
        const res = await request(app).post('/api/v1/custom-trips').send(trip(change));
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(message);
    });

    it('serves the builder without hidden places', async () => {
        await request(app).put('/api/v1/admin/trip-builder').set('Cookie', cookieFor(admin))
            .send({ builder: { ...DEFAULTS, places: DEFAULTS.places.map((p) => (p.id === 'goa' ? { ...p, hidden: true } : p)) } });
        const res = await request(app).get('/api/v1/trip-builder');
        expect(res.status).toBe(200);
        const ids = res.body.data.builder.places.map((p) => p.id);
        expect(ids).toContain('shimla');
        expect(ids).not.toContain('goa');
        const sent = await request(app).post('/api/v1/custom-trips').send(trip({ stops: [{ placeId: 'goa', nights: 2 }] }));
        expect(sent.status).toBe(400);
    });
});

describe('admin custom trips', () => {
    it('lists trips by status and moves them along with a final price', async () => {
        const { body } = await request(app).post('/api/v1/custom-trips').send(trip());
        const id = body.data.trip._id;
        const list = await request(app).get('/api/v1/admin/custom-trips').set('Cookie', cookieFor(admin));
        expect(list.body.data.trips).toHaveLength(1);
        expect(list.body.data.statusCounts).toEqual({ new: 1 });

        const noPrice = await request(app).patch(`/api/v1/admin/custom-trips/${id}`).set('Cookie', cookieFor(admin)).send({ status: 'quoted' });
        expect(noPrice.status).toBe(400);
        const priced = await request(app).patch(`/api/v1/admin/custom-trips/${id}`).set('Cookie', cookieFor(admin))
            .send({ status: 'quoted', quote: 98000, quoteNote: 'Includes Volvo tickets', staffNote: 'Ask about Kasol' });
        expect(priced.status).toBe(200);
        expect(priced.body.data.trip).toMatchObject({ status: 'quoted', quote: 98000, staffNote: 'Ask about Kasol' });
        expect((await CustomTrip.findById(id)).quoteNote).toBe('Includes Volvo tickets');

        const stats = await request(app).get('/api/v1/admin/stats').set('Cookie', cookieFor(admin));
        expect(stats.body.data.attention.newCustomTrips).toBe(0);
    });

    it('keeps the board and price list to staff who handle them', async () => {
        expect((await request(app).get('/api/v1/admin/custom-trips').set('Cookie', cookieFor(traveller))).status).toBe(403);
        const editor = await createUser('editor');
        expect((await request(app).get('/api/v1/admin/custom-trips').set('Cookie', cookieFor(editor))).status).toBe(403);
        expect((await request(app).get('/api/v1/admin/trip-builder').set('Cookie', cookieFor(editor))).status).toBe(200);
        const support = await createUser('support');
        expect((await request(app).put('/api/v1/admin/trip-builder').set('Cookie', cookieFor(support)).send({ builder: DEFAULTS })).status).toBe(403);
    });

    it('saves the price list and tells whether it is still the starting one', async () => {
        const first = await request(app).get('/api/v1/admin/trip-builder').set('Cookie', cookieFor(admin));
        expect(first.body.data.isStartingList).toBe(true);
        const bad = await request(app).put('/api/v1/admin/trip-builder').set('Cookie', cookieFor(admin)).send({ builder: { ...DEFAULTS, places: [] } });
        expect(bad.status).toBe(400);
        const saved = await request(app).put('/api/v1/admin/trip-builder').set('Cookie', cookieFor(admin))
            .send({ builder: { ...DEFAULTS, places: [{ ...shimla, nightlyFrom: 5000, nightlyTo: 6000 }] } });
        expect(saved.status).toBe(200);
        const after = await request(app).get('/api/v1/admin/trip-builder').set('Cookie', cookieFor(admin));
        expect(after.body.data).toMatchObject({ isStartingList: false });
        expect(after.body.data.builder.places).toHaveLength(1);
        expect(after.body.data.builder.places[0].nightlyFrom).toBe(5000);
    });
});
