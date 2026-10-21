const request = require('supertest');
const app = require('../src/app');
const flights = require('../src/providers/flights/mock');
const { connect, disconnect, reset, setFeatures } = require('./helpers');

const future = (days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const NOT_FOUND = { status: 'fail', message: "Sorry, can't find that route!" };
const flightQuery = `from=DEL&to=DXB&departDate=${future(20)}&adults=2&cabin=economy`;
const stayQuery = `checkIn=${future(20)}&checkOut=${future(23)}&rooms=1&adults=2`;

beforeAll(connect);
afterAll(disconnect);
beforeEach(reset);

describe('when switched off', () => {
    it.each([
        '/api/v1/flights/airports?q=del',
        `/api/v1/flights/search?${flightQuery}`,
        '/api/v1/flights/offers/abc',
        '/api/v1/hotels/places?q=goa',
        `/api/v1/hotels/search?place=Goa&${stayQuery}`,
        `/api/v1/hotels/goa-fort-aguada?${stayQuery}`,
    ])('%s looks like it never existed', async (url) => {
        await setFeatures({});
        const res = await request(app).get(url);
        expect(res.status).toBe(404);
        expect(res.body).toEqual(NOT_FOUND);
    });

    it('hotels stay hidden while flights are on', async () => {
        await setFeatures({ flights: true });
        expect((await request(app).get('/api/v1/hotels/places?q=goa')).status).toBe(404);
        expect((await request(app).get('/api/v1/flights/airports?q=del')).status).toBe(200);
    });
});

describe('flights API', () => {
    beforeEach(() => setFeatures({ flights: true }, { flightPct: 10, hotelPct: 8 }));

    it('searches with marked-up prices and no supplier amounts', async () => {
        const res = await request(app).get(`/api/v1/flights/search?${flightQuery}`);
        expect(res.status).toBe(200);
        const { offers } = res.body.data;
        expect(offers.length).toBeGreaterThan(0);
        const raw = await flights.search({ from: 'DEL', to: 'DXB', departDate: future(20), adults: 2, cabin: 'economy' });
        for (const offer of offers) {
            expect(offer.supplierAmount).toBeUndefined();
            expect(offer.supplierPerAdult).toBeUndefined();
            expect(offer.provider).toBeUndefined();
            const supplier = raw.find((r) => r.slices[0].flightNumber === offer.slices[0].flightNumber && r.slices[0].departTime === offer.slices[0].departTime);
            expect(offer.price).toBeCloseTo(supplier.supplierAmount * 1.1, 1);
        }
    });

    it('returns a re-priced offer and maps provider errors', async () => {
        const search = await request(app).get(`/api/v1/flights/search?${flightQuery}`);
        const offer = search.body.data.offers[0];
        const res = await request(app).get(`/api/v1/flights/offers/${offer.id}`);
        expect(res.body.data.offer.price).toBe(offer.price);
        const bad = await request(app).get('/api/v1/flights/search?from=DEL&to=ZZZ&departDate=2030-01-01');
        expect(bad.status).toBe(400);
    });
});

describe('hotels API', () => {
    beforeEach(() => setFeatures({ hotels: true }));

    it('searches, loads a hotel with rooms and never leaks supplier prices', async () => {
        const search = await request(app).get(`/api/v1/hotels/search?place=Goa&${stayQuery}`);
        expect(search.status).toBe(200);
        expect(search.body.data.offers.every((o) => o.supplierAmount === undefined && o.price > 0)).toBe(true);
        const hotel = await request(app).get(`/api/v1/hotels/goa-fort-aguada?${stayQuery}`);
        expect(hotel.body.data.hotel.roomOffers).toHaveLength(3);
        expect(JSON.stringify(hotel.body)).not.toContain('supplier');
        const missing = await request(app).get(`/api/v1/hotels/nope?${stayQuery}`);
        expect(missing.status).toBe(404);
    });
});
