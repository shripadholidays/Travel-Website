const request = require('supertest');
const app = require('../src/app');
const TravelDestination = require('../src/models/TravelDestination');
const Destination = require('../src/models/Destination');
const Booking = require('../src/models/Booking');
const Collection = require('../src/models/Collection');
const ActivityLog = require('../src/models/ActivityLog');
const User = require('../src/models/User');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };
const form = (overrides = {}) => ({
    title: 'Kerala Backwaters',
    location: 'Kochi, India',
    price: 850,
    duration: { days: 5, nights: 4 },
    imageURL: 'https://example.com/kerala.jpg',
    overview: { about: 'Houseboats and spice gardens.', gallery: [] },
    ...overrides,
});
const tour = (overrides = {}) => TravelDestination.insert({ ...form(), validity: new Date(Date.now() + 365 * 864e5), ...overrides });

let admin;
let editor;
let support;
let moderator;
let traveller;
const as = (user) => ({ Cookie: cookieFor(user) });

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    [admin, editor, support, moderator, traveller] = await Promise.all(
        ['admin', 'editor', 'support', 'moderator', 'user'].map((r) => createUser(r)),
    );
});

describe('role-based access', () => {
    it('lets each role into its own work only', async () => {
        expect((await request(app).post('/api/v1/tours').set(as(editor)).send(form())).status).toBe(200);
        expect((await request(app).post('/api/v1/tours').set(as(support)).send(form())).status).toBe(403);
        expect((await request(app).post('/api/v1/tours').set(as(moderator)).send(form())).status).toBe(403);
        expect((await request(app).post('/api/v1/tours').set(as(traveller)).send(form())).status).toBe(403);

        expect((await request(app).get('/api/v1/admin/bookings').set(as(support))).status).toBe(200);
        expect((await request(app).get('/api/v1/admin/bookings').set(as(editor))).status).toBe(403);
        expect((await request(app).get('/api/v1/admin/users').set(as(editor))).status).toBe(403);
        expect((await request(app).get('/api/v1/admin/payments').set(as(support))).status).toBe(403);
        expect((await request(app).get('/api/v1/admin/stats').set(as(traveller))).status).toBe(403);

        const denied = await request(app).get('/api/v1/admin/users').set(as(support));
        expect(denied.body.message).toMatch(/Customer support/);
    });

    it('keeps the traveller side working for staff and sends their permissions', async () => {
        const profile = await request(app).get('/api/v1/users/profile').set(as(editor));
        expect(profile.status).toBe(200);
        expect(profile.body.data.user.roleLabel).toBe('Catalog editor');
        expect(profile.body.data.user.permissions).toContain('catalog.manage');
        expect((await request(app).get('/api/v1/bookings').set(as(support))).status).toBe(200);
    });

    it('shows each role only its part of the dashboard', async () => {
        const forEditor = (await request(app).get('/api/v1/admin/stats').set(as(editor))).body.data;
        expect(forEditor.totalRevenue).toBeUndefined();
        expect(forEditor.attention.draftTours).toBe(0);
        expect(forEditor.catalogHealth).toBeDefined();
        const forAdmin = (await request(app).get('/api/v1/admin/stats').set(as(admin))).body.data;
        expect(forAdmin.totalRevenue).toBe(0);
    });

    it('lets content editors change page content but not company settings', async () => {
        const faqs = await request(app).put('/api/v1/admin/settings').set(as(editor)).send({ faqs: [{ question: 'Q?', answer: 'A.', order: 0 }] });
        expect(faqs.status).toBe(200);
        const company = await request(app).put('/api/v1/admin/settings').set(as(editor)).send({ companyName: 'Hijack' });
        expect(company.status).toBe(403);
        expect((await request(app).put('/api/v1/admin/settings').set(as(admin)).send({ companyName: 'Wandeazy' })).status).toBe(200);
    });
});

describe('staff accounts', () => {
    it('protects the last administrator and the signed-in admin', async () => {
        const own = await request(app).patch(`/api/v1/admin/users/${admin._id}`).set(as(admin)).send({ role: 'user' });
        expect(own.status).toBe(400);
        const second = await createUser('admin');
        // With two admins one can demote the other, but not the last one left
        expect((await request(app).patch(`/api/v1/admin/users/${second._id}`).set(as(admin)).send({ role: 'manager' })).status).toBe(200);
        expect((await request(app).delete(`/api/v1/admin/users/${admin._id}`).set(as(admin))).status).toBe(400);
    });

    it('suspends instead of deleting people with bookings, and blocks suspended sign-ins', async () => {
        const t = await tour();
        await Booking.insert({ user: traveller._id, tour: t._id, travelDate: new Date(future(20)), numberOfTravelers: 1, contactInfo, totalAmount: 850 });
        const del = await request(app).delete(`/api/v1/admin/users/${traveller._id}`).set(as(admin));
        expect(del.status).toBe(409);
        expect(del.body.message).toMatch(/Suspend/);

        const suspend = await request(app).patch(`/api/v1/admin/users/${traveller._id}`).set(as(admin)).send({ isSuspended: true });
        expect(suspend.status).toBe(200);
        expect((await request(app).get('/api/v1/users/profile').set(as(traveller))).status).toBe(403);

        const list = await request(app).get('/api/v1/admin/users?role=staff').set(as(admin));
        expect(list.body.data.users.every((u) => u.role !== 'user')).toBe(true);
        expect(list.body.data.roleCounts.editor).toBe(1);

        const fresh = await createUser();
        expect((await request(app).delete(`/api/v1/admin/users/${fresh._id}`).set(as(admin))).status).toBe(200);
    });

    it('lists the roles with what they can do', async () => {
        const roles = (await request(app).get('/api/v1/admin/roles').set(as(admin))).body.data.roles;
        expect(roles.map((r) => r.id)).toEqual(['user', 'moderator', 'support', 'editor', 'manager', 'admin']);
        expect(roles.find((r) => r.id === 'manager').permissions).not.toContain('users.manage');
    });
});

describe('listing tours', () => {
    it('saves a half-finished form with sensible defaults and keeps its currency', async () => {
        const res = await request(app).post('/api/v1/tours').set(as(editor)).send(form({
            currency: '₹',
            itinerary: [{ activity: 'Houseboat cruise', location: '' }, { activity: '', location: '' }],
            inclusions: [{ title: 'Meals', included: true }, { title: ' ', included: true }],
            coordinates: { lat: '', lng: '' },
        }));
        expect(res.status).toBe(200);
        const saved = res.body.data.tour;
        expect(saved.currency).toBe('INR');
        expect(saved.itinerary).toEqual([expect.objectContaining({ day: 1, activity: 'Houseboat cruise', location: 'Kochi, India' })]);
        expect(saved.inclusions).toHaveLength(1);
        expect(new Date(saved.validity).getTime()).toBeGreaterThan(Date.now());
        expect(saved.coordinates).toEqual({ lat: null, lng: null });
        expect(saved.createdBy).toBe(String(editor._id));
    });

    it('explains what is missing in plain words', async () => {
        const res = await request(app).post('/api/v1/tours').set(as(editor)).send(form({ imageURL: '', price: 0 }));
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cover image is required/);
        expect(res.body.message).toMatch(/at least 1 [A-Z]{3}/);
    });

    it('saves an unfinished draft, but only publishes a complete tour', async () => {
        const draft = await request(app).post('/api/v1/tours').set(as(editor)).send({ title: 'Idea: Lofoten', location: 'Lofoten, Norway', status: 'draft' });
        expect(draft.status).toBe(200);
        const id = draft.body.data.tour._id;

        const publish = await request(app).put(`/api/v1/tours/${id}`).set(as(editor)).send({ status: 'active' });
        expect(publish.status).toBe(400);
        expect(publish.body.message).toMatch(/cover image/);

        const bulk = await request(app).post('/api/v1/tours/bulk-action').set(as(editor)).send({ ids: [id], action: 'active' });
        expect(bulk.body.data).toMatchObject({ affected: 0, skipped: 1 });

        const finished = await request(app).put(`/api/v1/tours/${id}`).set(as(editor)).send({
            status: 'active', price: 1200, imageURL: 'https://example.com/l.jpg', overview: { about: 'Fjords and fishing villages.', gallery: [] },
        });
        expect(finished.status).toBe(200);
        expect(finished.body.data.tour.updatedBy.displayName).toBe(editor.displayName);
    });

    it('will not delete a booked tour, and removes deleted tours from collections', async () => {
        const booked = await tour();
        const spare = await tour({ title: 'Spare' });
        await Booking.insert({ user: traveller._id, tour: booked._id, travelDate: new Date(future(20)), numberOfTravelers: 1, contactInfo, totalAmount: 850 });
        await Collection.insert({ name: 'Mix', slug: 'mix', description: 'd', coverImage: 'c', tours: [booked._id, spare._id] });

        const blocked = await request(app).delete(`/api/v1/tours/${booked._id}`).set(as(editor));
        expect(blocked.status).toBe(409);
        expect(blocked.body.message).toMatch(/Hidden/);
        expect((await request(app).delete(`/api/v1/tours/${spare._id}`).set(as(editor))).status).toBe(200);
        expect((await Collection.findOne('slug = ?', ['mix'])).tours.map(String)).toEqual([String(booked._id)]);
    });

    it('duplicates a tour as a draft and runs bulk actions', async () => {
        const a = await tour({ isFeatured: true });
        const b = await tour({ title: 'Second' });
        const copy = await request(app).post(`/api/v1/tours/${a._id}/duplicate`).set(as(editor));
        expect(copy.body.data.tour).toMatchObject({ title: 'Copy of Kerala Backwaters', status: 'draft', isFeatured: false });

        const bulk = await request(app).post('/api/v1/tours/bulk-action').set(as(editor)).send({ ids: [a._id, b._id], action: 'inactive' });
        expect(bulk.body.data.affected).toBe(2);
        expect(await TravelDestination.count("status = 'inactive'")).toBe(2);
    });

    it('imports the good rows and reports the bad ones', async () => {
        const res = await request(app).post('/api/v1/tours/bulk').set(as(editor)).send({ tours: [
            form({ title: 'Good one' }),
            form({ title: 'No picture', imageURL: '' }),
        ] });
        expect(res.status).toBe(200);
        expect(res.body.data.created).toBe(1);
        expect(res.body.data.failed).toEqual([expect.objectContaining({ row: 2, title: 'No picture' })]);
    });

    it('records who changed what', async () => {
        await request(app).post('/api/v1/tours').set(as(editor)).send(form());
        // The log is written once the response has gone out
        let entries = [];
        for (let i = 0; i < 20 && entries.length === 0; i += 1) {
            entries = await ActivityLog.find({ where: "resource = 'tour'" });
            if (!entries.length) await new Promise((r) => setTimeout(r, 25));
        }
        expect(entries[0]).toMatchObject({ action: 'create', label: 'Kerala Backwaters', actorName: editor.displayName });
        expect((await request(app).get('/api/v1/admin/activity').set(as(editor))).status).toBe(403);
        const log = await request(app).get('/api/v1/admin/activity').set(as(admin));
        expect(log.body.data.entries).toHaveLength(1);
    });
});

describe('bookings and the listing limits', () => {
    it('enforces the group size and last available date', async () => {
        const t = await tour({ maxGroupSize: 4, validity: new Date(future(30)) });
        const big = await request(app).post('/api/v1/bookings').set(as(traveller)).send({ tour: t._id, travelDate: future(10), numberOfTravelers: 6, contactInfo });
        expect(big.status).toBe(400);
        expect(big.body.message).toMatch(/at most 4/);
        const late = await request(app).post('/api/v1/bookings').set(as(traveller)).send({ tour: t._id, travelDate: future(60), numberOfTravelers: 2, contactInfo });
        expect(late.status).toBe(400);
    });

    it('does not reopen a cancelled booking', async () => {
        const t = await tour();
        const b = await Booking.insert({ user: traveller._id, tour: t._id, travelDate: new Date(future(20)), numberOfTravelers: 1, contactInfo, totalAmount: 850, status: 'cancelled' });
        const res = await request(app).patch(`/api/v1/admin/bookings/${b._id}`).set(as(support)).send({ status: 'confirmed' });
        expect(res.status).toBe(409);
        const list = await request(app).get('/api/v1/admin/bookings?search=asha').set(as(support));
        expect(list.body.data.bookings).toHaveLength(1);
        expect(list.body.data.statusCounts).toEqual({ cancelled: 1 });
    });
});

describe('destinations and coupons', () => {
    it('hides switched-off destinations from the site but not from the admin list', async () => {
        await Destination.insert({ name: 'Hidden Isle', slug: 'hidden-isle', country: 'Fiji', continent: 'Oceania', description: 'd', coverImage: 'c', isActive: false });
        expect((await request(app).get('/api/v1/destinations')).body.data.destinations).toHaveLength(0);
        expect((await request(app).get('/api/v1/destinations/hidden-isle')).status).toBe(404);
        const adminList = await request(app).get('/api/v1/destinations?scope=admin').set(as(editor));
        expect(adminList.body.data.destinations).toHaveLength(1);
    });

    it('rejects a discount over 100%', async () => {
        const res = await request(app).post('/api/v1/admin/coupons').set(as(admin)).send({ code: 'big', discountType: 'percent', discountValue: 150 });
        expect(res.status).toBe(400);
        const ok = await request(app).post('/api/v1/admin/coupons').set(as(admin)).send({ code: 'summer 10', discountType: 'percent', discountValue: 10 });
        expect(ok.body.data.coupon.code).toBe('SUMMER10');
    });
});

afterEach(async () => {
    await User.setWhere({ isSuspended: false });
});
