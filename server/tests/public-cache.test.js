// Turned on here only; setup-env turns it off for every other test file
process.env.PUBLIC_CACHE_TTL_MS = '60000';

const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const Destination = require('../src/models/Destination');
const { clearPublicCache } = require('../src/middlewares/public-cache');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    clearPublicCache();
});

const kerala = { name: 'Kerala', slug: 'kerala', country: 'India', continent: 'Asia', description: 'Backwaters', coverImage: 'c' };

describe('landing page cache', () => {
    test('the second visit is answered from memory with the same data', async () => {
        const first = await request(app).get('/api/v1/settings').expect(200);
        const second = await request(app).get('/api/v1/settings').expect(200);
        expect(first.headers['x-cache']).toBe('MISS');
        expect(second.headers['x-cache']).toBe('HIT');
        expect(second.body).toEqual(first.body);
        expect(second.headers['content-type']).toMatch(/json/);
    });

    test('an admin edit shows on the very next visit', async () => {
        const admin = await createUser('admin');
        await request(app).get('/api/v1/settings').expect(200);
        await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ footer: { copyrightText: '© New text' } }).expect(200);
        const after = await request(app).get('/api/v1/settings').expect(200);
        expect(after.headers['x-cache']).toBe('MISS');
        expect(after.body.data.settings.footer.copyrightText).toBe('© New text');
    });

    test('a new destination added by an admin appears at once', async () => {
        const admin = await createUser('admin');
        expect((await request(app).get('/api/v1/destinations')).body.data.destinations).toHaveLength(0);
        await request(app).post('/api/v1/destinations').set('Cookie', cookieFor(admin)).send(kerala).expect(200);
        expect((await request(app).get('/api/v1/destinations')).body.data.destinations).toHaveLength(1);
    });

    test('changes outside the API show once the time limit passes', async () => {
        const saved = config.publicCache.ttlMs;
        config.publicCache.ttlMs = 40;
        try {
            await request(app).get('/api/v1/destinations').expect(200);
            await Destination.insert({ ...kerala, isActive: true });
            expect((await request(app).get('/api/v1/destinations')).body.data.destinations).toHaveLength(0);
            await new Promise((r) => setTimeout(r, 60));
            expect((await request(app).get('/api/v1/destinations')).body.data.destinations).toHaveLength(1);
        } finally {
            config.publicCache.ttlMs = saved;
        }
    });

    test('staff views and failed answers are never remembered', async () => {
        const admin = await createUser('admin');
        const staff = await request(app).get('/api/v1/destinations?scope=admin').set('Cookie', cookieFor(admin)).expect(200);
        expect(staff.headers['x-cache']).toBeUndefined();
        const again = await request(app).get('/api/v1/destinations?scope=admin');
        expect(again.headers['x-cache']).toBeUndefined();
    });

    test('pages that are not on the landing page are not cached', async () => {
        const res = await request(app).get('/api/v1/tours').expect(200);
        expect(res.headers['x-cache']).toBeUndefined();
    });

    test('a refused request does not clear it; a real change does', async () => {
        await request(app).get('/api/v1/collections').expect(200);
        await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'x' });
        expect((await request(app).get('/api/v1/collections')).headers['x-cache']).toBe('HIT');
        const traveller = await createUser();
        await request(app).patch('/api/v1/users/profile').set('Cookie', cookieFor(traveller)).send({ displayName: 'New name' }).expect(200);
        expect((await request(app).get('/api/v1/collections')).headers['x-cache']).toBe('MISS');
    });
});
