const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const { requireFeature, requireAnyFeature } = require('../src/middlewares/require-feature');
const { connect, disconnect, reset, createUser, cookieFor, setFeatures } = require('./helpers');

function probe(mw) {
    const a = express();
    a.use(express.json());
    a.post('/x', mw, (req, res) => res.json({ ok: true }));
    return a;
}

beforeAll(connect);
afterAll(disconnect);
beforeEach(reset);

describe('requireFeature', () => {
    it('returns the global 404 body when the feature is off', async () => {
        await setFeatures({ flights: false });
        const res = await request(probe(requireFeature('flights'))).post('/x');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ status: 'fail', message: "Sorry, can't find that route!" });
    });

    it('passes through when the feature is on', async () => {
        await setFeatures({ flights: true });
        const res = await request(probe(requireFeature('flights'))).post('/x');
        expect(res.status).toBe(200);
    });

    it('resolves the feature from the request', async () => {
        await setFeatures({ hotels: true });
        const mw = requireFeature((req) => req.body.kind);
        expect((await request(probe(mw)).post('/x').send({ kind: 'hotel' })).status).toBe(200);
        expect((await request(probe(mw)).post('/x').send({ kind: 'flight' })).status).toBe(404);
        expect((await request(probe(mw)).post('/x').send({ kind: 'bogus' })).status).toBe(404);
    });

    it('requireAnyFeature 404s only when both are off', async () => {
        await setFeatures({});
        expect((await request(probe(requireAnyFeature())).post('/x')).status).toBe(404);
        await setFeatures({ hotels: true });
        expect((await request(probe(requireAnyFeature())).post('/x')).status).toBe(200);
    });
});

describe('settings exposure', () => {
    it('public settings expose features but never markup', async () => {
        await setFeatures({ flights: true }, { flightPct: 7, hotelPct: 9 });
        const res = await request(app).get('/api/v1/settings');
        expect(res.status).toBe(200);
        expect(res.body.data.settings.features).toEqual({ flights: true, hotels: false });
        expect(res.body.data.settings.travelMarkup).toBeUndefined();
    });

    it('admin toggles apply immediately', async () => {
        await setFeatures({});
        const admin = await createUser('admin');
        const put = await request(app).put('/api/v1/admin/settings')
            .set('Cookie', cookieFor(admin))
            .send({ features: { flights: true, hotels: true }, travelMarkup: { flightPct: 6, hotelPct: 10 } });
        expect(put.status).toBe(200);
        const res = await request(app).get('/api/v1/settings');
        expect(res.body.data.settings.features).toEqual({ flights: true, hotels: true });
    });
});
