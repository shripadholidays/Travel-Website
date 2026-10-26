// Every endpoint the database move touched, end to end against libSQL: auth, tours, reviews,
// wishlist, collections, destinations, articles, bookings, payments, subscribers and admin pages.
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const User = require('../src/models/User');
const TravelDestination = require('../src/models/TravelDestination');
const Booking = require('../src/models/Booking');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };
const tourData = (overrides = {}) => ({
    title: 'Kerala Backwaters', location: 'Kochi, India', price: 850, currency: 'USD',
    duration: { days: 5, nights: 4 }, validity: new Date(Date.now() + 365 * 864e5),
    imageURL: 'https://example.com/kerala.jpg', categories: ['Nature'],
    overview: { about: 'Houseboats and spice gardens.', gallery: [] }, ...overrides,
});
const cookieHeader = (res) => (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

describe('API on the libSQL database', () => {
    let admin;
    let traveller;
    let tour;

    beforeAll(connect);
    afterAll(disconnect);
    beforeEach(async () => {
        await reset();
        admin = await createUser('admin');
        traveller = await createUser('user');
        tour = await TravelDestination.insert(tourData());
    });

    describe('accounts', () => {
        it('registers, signs in, rejects a wrong password and never returns the hash', async () => {
            const reg = await request(app).post('/api/v1/auth/register').send({ displayName: 'Mira', email: 'Mira@Example.com', password: 'secret12' });
            expect(reg.status).toBe(200);
            expect(reg.body.data.user.email).toBe('mira@example.com');
            expect(JSON.stringify(reg.body)).not.toMatch(/password|\$2[aby]\$/);

            const stored = await User.findByEmail('mira@example.com', { secrets: true });
            expect(stored.password).toMatch(/^\$2[aby]\$/);

            expect((await request(app).post('/api/v1/auth/register').send({ displayName: 'Mira', email: 'mira@example.com', password: 'secret12' })).status).toBe(409);
            expect((await request(app).post('/api/v1/auth/login').send({ email: 'mira@example.com', password: 'wrong-pass' })).status).toBe(401);

            const login = await request(app).post('/api/v1/auth/login').send({ email: 'MIRA@example.com', password: 'secret12' });
            expect(login.status).toBe(200);
            const profile = await request(app).get('/api/v1/users/profile').set('Cookie', cookieHeader(login));
            expect(profile.body.data.user.displayName).toBe('Mira');
            expect(profile.body.data.user.password).toBeUndefined();
        });

        it('resets a password with a valid link only, and verifies email', async () => {
            await request(app).post('/api/v1/auth/register').send({ displayName: 'Ravi', email: 'ravi@example.com', password: 'first-pass' });
            await request(app).post('/api/v1/auth/forgot-password').send({ email: 'ravi@example.com' }).expect(200);
            const { resetPasswordToken, emailVerificationToken } = await User.findByEmail('ravi@example.com', { secrets: true });
            expect(resetPasswordToken).toHaveLength(64);

            expect((await request(app).post('/api/v1/auth/reset-password/not-a-token').send({ password: 'second-pass' })).status).toBe(400);
            expect((await request(app).post(`/api/v1/auth/reset-password/${resetPasswordToken}`).send({ password: 'second-pass' })).status).toBe(200);
            expect((await request(app).post(`/api/v1/auth/reset-password/${resetPasswordToken}`).send({ password: 'third-pass' })).status).toBe(400);
            expect((await request(app).post('/api/v1/auth/login').send({ email: 'ravi@example.com', password: 'second-pass' })).status).toBe(200);

            const verified = await request(app).get(`/api/v1/auth/verify-email/${emailVerificationToken}`);
            expect(verified.body.data.user.isEmailVerified).toBe(true);
        });

        it('updates the profile and keeps a suspended account out', async () => {
            const res = await request(app).patch('/api/v1/users/profile').set('Cookie', cookieFor(traveller)).send({ displayName: 'New Name' });
            expect(res.body.data.user.displayName).toBe('New Name');
            const eligibility = await request(app).get('/api/v1/users/write-eligibility').set('Cookie', cookieFor(traveller));
            expect(eligibility.body.data).toMatchObject({ eligible: false, reviewCount: 0, completedBookings: 0 });

            await request(app).patch(`/api/v1/admin/users/${traveller._id}`).set('Cookie', cookieFor(admin)).send({ isSuspended: true }).expect(200);
            expect((await request(app).get('/api/v1/users/profile').set('Cookie', cookieFor(traveller))).status).toBe(403);
        });

        it('lets admins change roles and delete only accounts without bookings', async () => {
            const res = await request(app).patch(`/api/v1/admin/users/${traveller._id}`).set('Cookie', cookieFor(admin)).send({ role: 'editor' });
            expect(res.body.data.user).toMatchObject({ role: 'editor', roleLabel: expect.any(String) });
            expect((await request(app).patch(`/api/v1/admin/users/${admin._id}`).set('Cookie', cookieFor(admin)).send({ role: 'user' })).status).toBe(400);

            await Booking.insert({ user: traveller._id, tour: tour._id, travelDate: new Date(future(10)), numberOfTravelers: 1, contactInfo, totalAmount: 1 });
            expect((await request(app).delete(`/api/v1/admin/users/${traveller._id}`).set('Cookie', cookieFor(admin))).status).toBe(409);
            const spare = await createUser('user');
            expect((await request(app).delete(`/api/v1/admin/users/${spare._id}`).set('Cookie', cookieFor(admin))).status).toBe(200);
            expect(await User.findById(spare._id)).toBeNull();

            const list = await request(app).get('/api/v1/admin/users?search=test').set('Cookie', cookieFor(admin));
            expect(list.body.data.users.find((u) => u._id === traveller._id).bookingCount).toBe(1);
        });
    });

    describe('tours, reviews and the wishlist', () => {
        it('reads a tour, the recommended list and the editor round trip', async () => {
            expect((await request(app).get(`/api/v1/tours/${tour._id}`)).body.data.tour.title).toBe('Kerala Backwaters');
            expect((await request(app).get('/api/v1/tours/not-an-id')).status).toBe(404);
            expect((await request(app).get('/api/v1/tours/recommended')).body.data.tours).toHaveLength(1);

            const put = await request(app).put(`/api/v1/tours/${tour._id}`).set('Cookie', cookieFor(admin))
                .send({ price: 900, itinerary: [{ activity: 'Arrive', location: 'Kochi' }, { activity: '', location: '' }], coordinates: { lat: '9.9', lng: '' } });
            expect(put.status).toBe(200);
            expect(put.body.data.tour).toMatchObject({ price: 900, coordinates: { lat: 9.9, lng: null }, updatedBy: { displayName: admin.displayName } });
            expect(put.body.data.tour.itinerary).toEqual([expect.objectContaining({ day: 1, activity: 'Arrive', _id: expect.stringMatching(/^[a-f0-9]{24}$/) })]);
            expect(put.body.data.tour.overview.about).toBe('Houseboats and spice gardens.');

            const copy = await request(app).post(`/api/v1/tours/${tour._id}/duplicate`).set('Cookie', cookieFor(admin));
            expect(copy.body.data.tour).toMatchObject({ title: 'Copy of Kerala Backwaters', status: 'draft' });
            expect((await request(app).get(`/api/v1/tours/${copy.body.data.tour._id}`)).status).toBe(404);
            expect((await request(app).delete(`/api/v1/tours/${copy.body.data.tour._id}`).set('Cookie', cookieFor(admin))).status).toBe(200);
        });

        it('searches by words, category, place and sorts by price', async () => {
            await TravelDestination.insert(tourData({ title: 'Tokyo Lights', location: 'Tokyo, Japan', price: 1200, categories: ['City'] }));
            await TravelDestination.insert(tourData({ title: 'Japanese Gardens', location: 'Kyoto', price: 300, categories: ['Culture'] }));
            const titles = async (q) => (await request(app).get(`/api/v1/tours${q}`)).body.data.tours.map((t) => t.title);

            expect(await titles('?search=tokyo%20lights')).toEqual(['Tokyo Lights']);
            expect(await titles('?search=toky')).toEqual(['Tokyo Lights']);
            expect(await titles('?category=City,Culture&sort=price_low')).toEqual(['Japanese Gardens', 'Tokyo Lights']);
            expect(await titles('?place=Japan')).toEqual(['Tokyo Lights']);
            expect(await titles('?sort=price_high')).toEqual(['Tokyo Lights', 'Kerala Backwaters', 'Japanese Gardens']);
            expect(await titles('?minDays=5&maxDays=5&limit=1&page=2')).toHaveLength(1);
        });

        it('takes one review per traveller and keeps the tour rating in step', async () => {
            const first = await request(app).post(`/api/v1/tours/${tour._id}/reviews`).set('Cookie', cookieFor(traveller)).send({ rating: 4, content: 'Lovely' });
            expect(first.status).toBe(200);
            expect(first.body.data.review.user.displayName).toBe(traveller.displayName);
            expect((await request(app).post(`/api/v1/tours/${tour._id}/reviews`).set('Cookie', cookieFor(traveller)).send({ rating: 5, content: 'Again' })).status).toBe(400);
            expect((await request(app).post(`/api/v1/tours/${tour._id}/reviews`).set('Cookie', cookieFor(admin)).send({ rating: 9, content: 'x' })).status).toBe(400);
            await request(app).post(`/api/v1/tours/${tour._id}/reviews`).set('Cookie', cookieFor(admin)).send({ rating: 2, content: 'Meh' }).expect(200);

            // The admin's review is listed but is not a traveller rating
            expect((await TravelDestination.findById(tour._id)).reviews).toMatchObject({ rating: 4, basedOn: 1 });
            const list = await request(app).get(`/api/v1/tours/${tour._id}/reviews`);
            expect(list.body.data.pagination.total).toBe(2);

            const all = await request(app).get('/api/v1/admin/reviews?search=lovely').set('Cookie', cookieFor(admin));
            expect(all.body.data.reviews).toHaveLength(1);
            await request(app).delete(`/api/v1/admin/reviews/${first.body.data.review._id}`).set('Cookie', cookieFor(admin)).expect(200);
            expect((await TravelDestination.findById(tour._id)).reviews).toMatchObject({ rating: 0, basedOn: 0 });
        });

        it('adds, lists and removes wishlist tours', async () => {
            const add = await request(app).post(`/api/v1/wishlist/${tour._id}`).set('Cookie', cookieFor(traveller));
            expect(add.body.data.wishlist.tours[0]).toMatchObject({ _id: tour._id, title: 'Kerala Backwaters' });
            expect((await request(app).post(`/api/v1/wishlist/${tour._id}`).set('Cookie', cookieFor(traveller))).status).toBe(400);
            expect((await request(app).post('/api/v1/wishlist/aaaaaaaaaaaaaaaaaaaaaaaa').set('Cookie', cookieFor(traveller))).status).toBe(404);
            expect((await request(app).get('/api/v1/wishlist').set('Cookie', cookieFor(traveller))).body.data.wishlist.tours).toHaveLength(1);
            await request(app).delete(`/api/v1/wishlist/${tour._id}`).set('Cookie', cookieFor(traveller)).expect(200);
            expect((await request(app).get('/api/v1/wishlist').set('Cookie', cookieFor(traveller))).body.data.wishlist.tours).toHaveLength(0);
        });
    });

    describe('collections and destinations', () => {
        it('creates collections and only shows live tours in them', async () => {
            const draft = await TravelDestination.insert(tourData({ title: 'Secret Draft', status: 'draft' }));
            const created = await request(app).post('/api/v1/collections').set('Cookie', cookieFor(admin))
                .send({ name: 'Calm', slug: 'calm', description: 'd', coverImage: 'c', tours: [tour._id, draft._id] });
            expect(created.status).toBe(200);
            expect((await request(app).post('/api/v1/collections').set('Cookie', cookieFor(admin)).send({ name: 'Calm 2', slug: 'calm', description: 'd', coverImage: 'c' })).status).toBe(409);
            expect((await request(app).post('/api/v1/collections').set('Cookie', cookieFor(admin)).send({ name: 'No slug' })).status).toBe(400);

            const pub = await request(app).get('/api/v1/collections/calm');
            expect(pub.body.data.collection.tours.map((t) => t.title)).toEqual(['Kerala Backwaters']);
            const adminList = await request(app).get('/api/v1/admin/collections').set('Cookie', cookieFor(admin));
            expect(adminList.body.data.collections[0].tours).toHaveLength(2);

            const id = created.body.data.collection._id;
            await request(app).put(`/api/v1/collections/${id}`).set('Cookie', cookieFor(admin)).send({ isActive: false }).expect(200);
            expect((await request(app).get('/api/v1/collections')).body.data.collections).toHaveLength(0);
            await request(app).delete(`/api/v1/collections/${id}`).set('Cookie', cookieFor(admin)).expect(200);
        });

        it('creates, edits and deletes destinations with live tour counts', async () => {
            const res = await request(app).post('/api/v1/destinations').set('Cookie', cookieFor(admin))
                .send({ name: 'Kerala', slug: 'kerala', country: 'India', continent: 'Asia', description: 'Backwaters', coverImage: 'c', coordinates: { lat: '', lng: '' } });
            expect(res.status).toBe(200);
            expect(res.body.data.destination.coordinates).toBeUndefined();
            expect((await request(app).post('/api/v1/destinations').set('Cookie', cookieFor(admin)).send({ name: 'X', slug: 'x', country: 'Y', continent: 'Mars', description: 'd', coverImage: 'c' })).status).toBe(400);

            const one = await request(app).get('/api/v1/destinations/kerala');
            expect(one.body.data.destination.tourCount).toBe(1);
            const search = await request(app).get('/api/v1/destinations?search=backwaters');
            expect(search.body.data.destinations).toHaveLength(1);

            const id = res.body.data.destination._id;
            const edit = await request(app).put(`/api/v1/destinations/${id}`).set('Cookie', cookieFor(admin)).send({ bestTimeToVisit: 'October to March' });
            expect(edit.body.data.destination).toMatchObject({ bestTimeToVisit: 'October to March', name: 'Kerala' });
            await request(app).delete(`/api/v1/destinations/${id}`).set('Cookie', cookieFor(admin)).expect(200);
            expect((await request(app).get('/api/v1/destinations/kerala')).status).toBe(404);
        });
    });

    describe('articles', () => {
        it('publishes, finds by slug, tag and search, and deletes', async () => {
            const post = await request(app).post('/api/v1/blog').set('Cookie', cookieFor(admin))
                .send({ title: 'Monsoon in Kerala', content: '<p>Green and wet.</p>', excerpt: 'Why go in the rain', coverImage: 'c', tags: ['india', 'rain'], status: 'published' });
            expect(post.status).toBe(200);
            expect(post.body.data.post.author.displayName).toBe(admin.displayName);
            expect((await request(app).post('/api/v1/blog').set('Cookie', cookieFor(admin)).send({ title: 'Monsoon in Kerala', content: 'x', excerpt: 'x', coverImage: 'c' })).status).toBe(400);

            expect((await request(app).get('/api/v1/blog/monsoon-in-kerala')).body.data.post.title).toBe('Monsoon in Kerala');
            expect((await request(app).get('/api/v1/blog?tag=rain')).body.data.posts).toHaveLength(1);
            expect((await request(app).get('/api/v1/blog?tag=snow')).body.data.posts).toHaveLength(0);
            expect((await request(app).get('/api/v1/blog?search=green')).body.data.posts).toHaveLength(1);

            const id = post.body.data.post._id;
            const upd = await request(app).put(`/api/v1/blog/${id}`).set('Cookie', cookieFor(admin)).send({ status: 'draft' });
            expect(upd.body.data.post.status).toBe('draft');
            expect((await request(app).get('/api/v1/blog/monsoon-in-kerala')).status).toBe(404);
            expect((await request(app).delete(`/api/v1/blog/${id}`).set('Cookie', cookieFor(traveller))).status).toBe(403);
            await request(app).delete(`/api/v1/blog/${id}`).set('Cookie', cookieFor(admin)).expect(200);
        });
    });

    describe('bookings and payments', () => {
        it('books, shows the booking to its owner only, and cancels it', async () => {
            const made = await request(app).post('/api/v1/bookings').set('Cookie', cookieFor(traveller))
                .send({ tour: tour._id, travelDate: future(30), numberOfTravelers: 2, contactInfo, addons: ['Travel Insurance'], currency: 'USD' });
            expect(made.status).toBe(200);
            const booking = made.body.data.booking;
            expect(booking).toMatchObject({ status: 'confirmed', totalAmount: 1730, tour: { title: 'Kerala Backwaters' }, user: { email: traveller.email } });

            const other = await createUser('user');
            expect((await request(app).get(`/api/v1/bookings/${booking._id}`).set('Cookie', cookieFor(other))).status).toBe(403);
            const mine = await request(app).get(`/api/v1/bookings/${booking._id}`).set('Cookie', cookieFor(traveller));
            expect(mine.body.data.booking.contactInfo).toEqual(contactInfo);

            const cancelled = await request(app).patch(`/api/v1/bookings/${booking._id}/cancel`).set('Cookie', cookieFor(traveller));
            expect(cancelled.body.data.booking.status).toBe('cancelled');
            expect((await request(app).patch(`/api/v1/bookings/${booking._id}/cancel`).set('Cookie', cookieFor(traveller))).status).toBe(400);
        });

        it('lets staff move a booking along and finds it by reference', async () => {
            const b = await Booking.insert({ user: traveller._id, tour: tour._id, travelDate: new Date(future(10)), numberOfTravelers: 1, contactInfo, totalAmount: 850 });
            const res = await request(app).patch(`/api/v1/admin/bookings/${b._id}`).set('Cookie', cookieFor(admin)).send({ status: 'confirmed' });
            expect(res.body.data.booking).toMatchObject({ status: 'confirmed', tour: { title: 'Kerala Backwaters' } });
            const byRef = await request(app).get(`/api/v1/admin/bookings?search=${b._id.slice(-6)}`).set('Cookie', cookieFor(admin));
            expect(byRef.body.data.bookings.map((x) => x._id)).toEqual([b._id]);
            expect(byRef.body.data.statusCounts).toEqual({ confirmed: 1 });
        });

        it('marks a trip completed once it is over', async () => {
            const b = await Booking.insert({ user: traveller._id, tour: tour._id, travelDate: new Date(Date.now() - 20 * 864e5), numberOfTravelers: 1, contactInfo, totalAmount: 850, status: 'confirmed' });
            const list = await request(app).get('/api/v1/bookings').set('Cookie', cookieFor(traveller));
            expect(list.body.data.bookings[0]).toMatchObject({ _id: b._id, status: 'completed' });
        });
    });

    describe('community and settings', () => {
        it('handles subscribers, inquiries and their admin pages', async () => {
            await request(app).post('/api/v1/subscribe').send({ email: 'Reader@Example.com' }).expect(200);
            expect((await request(app).post('/api/v1/subscribe').send({ email: 'reader@example.com' })).status).toBe(400);
            const subs = await request(app).get('/api/v1/admin/subscribers?search=reader').set('Cookie', cookieFor(admin));
            expect(subs.body.data.subscribers.map((s) => s.email)).toEqual(['reader@example.com']);
            await request(app).delete(`/api/v1/admin/subscribers/${subs.body.data.subscribers[0]._id}`).set('Cookie', cookieFor(admin)).expect(200);

            await request(app).post('/api/v1/inquiries').send({ fullName: 'Asha', email: 'asha@example.com', topic: 'question', message: 'Visa help?' }).expect(200);
            expect((await request(app).post('/api/v1/inquiries').send({ fullName: 'A', email: 'not-an-email', message: 'x' })).status).toBe(400);
            const inq = await request(app).get('/api/v1/admin/inquiries?search=visa').set('Cookie', cookieFor(admin));
            expect(inq.body.data.statusCounts).toEqual({ new: 1 });
            const patched = await request(app).patch(`/api/v1/admin/inquiries/${inq.body.data.inquiries[0]._id}`).set('Cookie', cookieFor(admin)).send({ status: 'replied' });
            expect(patched.body.data.inquiry.status).toBe('replied');
        });

        it('saves settings, merges sections and toggles homepage sections', async () => {
            const before = await request(app).get('/api/v1/admin/settings').set('Cookie', cookieFor(admin));
            expect(before.body.data.settings.heroSlides.length).toBeGreaterThan(0);
            expect(before.body.data.settings.contentSections.length).toBeGreaterThan(0);

            await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ footer: { copyrightText: '© Shripad Holidays' } }).expect(200);
            const pub = await request(app).get('/api/v1/settings');
            expect(pub.body.data.settings.footer).toMatchObject({ copyrightText: '© Shripad Holidays', showNewsletter: true });

            const bad = await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ travelMarkup: { flightPct: 80 } });
            expect(bad.status).toBe(400);

            const toggled = await request(app).patch('/api/v1/admin/settings/sections/faq').set('Cookie', cookieFor(admin)).send({ isVisible: false });
            expect(toggled.body.data.settings.contentSections.find((s) => s.sectionId === 'faq').isVisible).toBe(false);
            expect((await request(app).patch('/api/v1/admin/settings/sections/nope').set('Cookie', cookieFor(admin)).send({ isVisible: false })).status).toBe(404);
        });

        it('edits and deletes coupons', async () => {
            const made = await request(app).post('/api/v1/admin/coupons').set('Cookie', cookieFor(admin)).send({ code: 'monsoon 15', discountType: 'percent', discountValue: 15 });
            expect(made.body.data.coupon.code).toBe('MONSOON15');
            const id = made.body.data.coupon._id;
            const upd = await request(app).put(`/api/v1/admin/coupons/${id}`).set('Cookie', cookieFor(admin)).send({ discountValue: 20, isActive: false });
            expect(upd.body.data.coupon).toMatchObject({ discountValue: 20, isActive: false });
            expect((await request(app).post('/api/v1/coupons/validate').send({ code: 'MONSOON15', orderAmount: 100 })).status).toBe(400);
            expect((await request(app).get('/api/v1/admin/coupons').set('Cookie', cookieFor(admin))).body.data.coupons).toHaveLength(1);
            await request(app).delete(`/api/v1/admin/coupons/${id}`).set('Cookie', cookieFor(admin)).expect(200);
        });
    });

    it('reports a healthy database', async () => {
        const res = await request(app).get('/health');
        expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
        expect(await db.ping()).toBe(true);
    });
});
