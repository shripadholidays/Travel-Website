// The hook URL and short delays are read when config loads, so they are set before anything is required.
// They leave room for a busy machine: requests in a burst can each take a while when every suite runs at once.
process.env.SITE_REBUILD_HOOK_URL = 'https://hooks.example.test/deploy/abc';
process.env.SITE_REBUILD_DELAY_MS = '400';
process.env.SITE_REBUILD_MAX_WAIT_MS = '1200';

jest.mock('axios');
const axios = require('axios');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const { requestRebuild, flushRebuild, isPending } = require('../src/services/site-rebuild');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HOOK = 'https://hooks.example.test/deploy/abc';

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    axios.post.mockReset();
    axios.post.mockResolvedValue({ status: 201 });
});

const newTour = { title: 'Goa Beaches', location: 'Goa, India', price: 24000, currency: 'INR', imageURL: 'https://example.com/g.jpg', overview: { about: 'Sun and sand.' } };

describe('site rebuild hook', () => {
    test('publishing a tour calls the deploy hook once, after the delay', async () => {
        const admin = await createUser('admin');
        await request(app).post('/api/v1/tours').set('Cookie', cookieFor(admin)).send(newTour).expect(200);
        expect(axios.post).not.toHaveBeenCalled();
        await wait(700);
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(HOOK, null, expect.any(Object));
    });

    test('a burst of edits across content types is grouped into one rebuild', async () => {
        const admin = await createUser('admin');
        const cookie = cookieFor(admin);
        await request(app).post('/api/v1/tours').set('Cookie', cookie).send(newTour).expect(200);
        await request(app).post('/api/v1/destinations').set('Cookie', cookie)
            .send({ name: 'Kerala', slug: 'kerala', country: 'India', continent: 'Asia', description: 'Backwaters', coverImage: 'c' }).expect(200);
        await request(app).put('/api/v1/admin/settings').set('Cookie', cookie).send({ footer: { copyrightText: '© Wandeazy' } }).expect(200);
        await wait(700);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('edits that never stop still rebuild by the maximum wait', async () => {
        for (let i = 0; i < 9; i += 1) { requestRebuild(`edit ${i}`); await wait(200); }
        expect(axios.post).toHaveBeenCalledTimes(1);
        await flushRebuild();
    });

    test('reads, refused changes and private changes do not rebuild', async () => {
        const traveller = await createUser();
        await request(app).get('/api/v1/tours').expect(200);
        expect((await request(app).post('/api/v1/tours').set('Cookie', cookieFor(traveller)).send(newTour)).status).toBe(403);
        await request(app).patch('/api/v1/users/profile').set('Cookie', cookieFor(traveller)).send({ displayName: 'New name' }).expect(200);
        await wait(700);
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('a failing hook is logged, not thrown, and the next change tries again', async () => {
        axios.post.mockRejectedValueOnce(Object.assign(new Error('Request failed'), { response: { status: 404 } }));
        requestRebuild('first');
        expect(await flushRebuild()).toBe(false);
        requestRebuild('second');
        expect(await flushRebuild()).toBe(true);
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test('shutdown sends a waiting rebuild at once', async () => {
        requestRebuild('pending');
        expect(isPending()).toBe(true);
        expect(await flushRebuild()).toBe(true);
        expect(isPending()).toBe(false);
        expect(await flushRebuild()).toBe(false);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test('without a hook URL nothing is scheduled', async () => {
        const saved = config.siteRebuild.hookUrl;
        config.siteRebuild.hookUrl = '';
        try {
            requestRebuild('ignored');
            expect(isPending()).toBe(false);
        } finally {
            config.siteRebuild.hookUrl = saved;
        }
    });
});
