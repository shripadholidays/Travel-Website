const request = require('supertest');
const app = require('../src/app');
const TravelDestination = require('../src/models/TravelDestination');
const Destination = require('../src/models/Destination');
const Booking = require('../src/models/Booking');
const Coupon = require('../src/models/Coupon');
const BlogPost = require('../src/models/BlogPost');
const Review = require('../src/models/Review');
const User = require('../src/models/User');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };

function tour(overrides = {}) {
    return TravelDestination.create({
        title: 'Discover Tokyo',
        location: 'Tokyo, Japan',
        price: 1000,
        currency: '$',
        duration: { days: 6, nights: 5 },
        validity: new Date(Date.now() + 365 * 864e5),
        imageURL: 'https://example.com/tokyo.jpg',
        categories: ['City', 'Culture'],
        overview: { about: 'Neon streets and quiet temples.' },
        ...overrides,
    });
}

let user;
let admin;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    user = await createUser();
    admin = await createUser('admin');
});

describe('tours that are not live', () => {
    let live;
    let draft;
    beforeEach(async () => {
        live = await tour();
        draft = await tour({ title: 'Secret Kyoto', status: 'draft' });
    });

    it('are hidden from travellers in lists, by id and in bookings', async () => {
        const list = await request(app).get('/api/v1/tours');
        expect(list.body.data.tours.map((t) => t.title)).toEqual(['Discover Tokyo']);
        // A traveller cannot ask for drafts either
        const asked = await request(app).get('/api/v1/tours?status=draft').set('Cookie', cookieFor(user));
        expect(asked.body.data.tours.map((t) => t.title)).toEqual(['Discover Tokyo']);
        expect((await request(app).get(`/api/v1/tours/${draft._id}`)).status).toBe(404);
        const booking = await request(app).post('/api/v1/bookings').set('Cookie', cookieFor(user))
            .send({ tour: draft._id, travelDate: future(10), numberOfTravelers: 1, contactInfo });
        expect(booking.status).toBe(404);
    });

    it('are still visible to admins', async () => {
        const list = await request(app).get('/api/v1/tours').set('Cookie', cookieFor(admin));
        expect(list.body.data.tours).toHaveLength(2);
        expect((await request(app).get(`/api/v1/tours/${draft._id}`).set('Cookie', cookieFor(admin))).status).toBe(200);
        expect((await request(app).get(`/api/v1/tours/${live._id}`)).status).toBe(200);
    });
});

describe('tour filters', () => {
    beforeEach(async () => {
        await tour();
        await tour({ title: 'Bali Escape', location: 'Bali, Indonesia', categories: ['Beach'] });
        await Destination.create({
            name: 'Japan', slug: 'japan', country: 'Japan', continent: 'Asia', description: 'x', coverImage: 'https://example.com/j.jpg',
        });
    });

    it('filters by place, destination, ids and lists real facets', async () => {
        const titles = async (qs) => (await request(app).get(`/api/v1/tours?${qs}`)).body.data.tours.map((t) => t.title);
        expect(await titles('place=Indonesia')).toEqual(['Bali Escape']);
        expect(await titles('destination=japan')).toEqual(['Discover Tokyo']);
        const bali = await TravelDestination.findOne({ title: 'Bali Escape' });
        expect(await titles(`ids=${bali._id},not-an-id`)).toEqual(['Bali Escape']);

        const facets = (await request(app).get('/api/v1/tours/facets')).body.data;
        expect(facets.places.map((p) => p.name).sort()).toEqual(['Indonesia', 'Japan']);
        expect(facets.categories.map((c) => c.name)).toEqual(expect.arrayContaining(['Beach', 'City', 'Culture']));

        // The destination card count uses the same rule as the list
        const dest = (await request(app).get('/api/v1/destinations/japan')).body.data.destination;
        expect(dest.tourCount).toBe(1);
    });
});

describe('cancelling a tour booking', () => {
    let t;
    beforeEach(async () => { t = await tour(); });

    const book = (travelDate, body = {}) => request(app).post('/api/v1/bookings').set('Cookie', cookieFor(user))
        .send({ tour: t._id, travelDate, numberOfTravelers: 1, contactInfo, ...body });

    it('is free until 24 hours before departure and gives a used coupon back', async () => {
        await Coupon.create({ code: 'SAVE10', discountType: 'percent', discountValue: 10, maxUses: 1, expiresAt: new Date(Date.now() + 30 * 864e5) });
        const booked = await book(future(10), { couponCode: 'SAVE10' });
        expect(booked.status).toBe(200);
        expect((await Coupon.findOne({ code: 'SAVE10' })).usedCount).toBe(1);

        const res = await request(app).patch(`/api/v1/bookings/${booked.body.data.booking._id}/cancel`).set('Cookie', cookieFor(user));
        expect(res.status).toBe(200);
        expect(res.body.data.booking.status).toBe('cancelled');
        expect(res.body.data.booking.cancelledAt).toBeTruthy();
        expect((await Coupon.findOne({ code: 'SAVE10' })).usedCount).toBe(0);
    });

    it('is refused for travellers inside the last 24 hours, but allowed for admins', async () => {
        const booked = await book(future(0));
        const id = booked.body.data.booking._id;
        const late = await request(app).patch(`/api/v1/bookings/${id}/cancel`).set('Cookie', cookieFor(user));
        expect(late.status).toBe(400);
        expect(late.body.message).toMatch(/24 hours/);
        const byAdmin = await request(app).patch(`/api/v1/admin/bookings/${id}`).set('Cookie', cookieFor(admin)).send({ status: 'cancelled' });
        expect(byAdmin.status).toBe(200);
        expect(byAdmin.body.data.booking.status).toBe('cancelled');
    });

    it('marks finished trips as completed', async () => {
        await Booking.create({
            user: user._id, tour: t._id, travelDate: new Date(Date.now() - 30 * 864e5), numberOfTravelers: 1,
            contactInfo, totalAmount: 1000, status: 'confirmed',
        });
        const res = await request(app).get('/api/v1/bookings').set('Cookie', cookieFor(user));
        expect(res.body.data.bookings[0].status).toBe('completed');
    });
});

describe('articles from writers', () => {
    let writer;
    beforeEach(async () => {
        // Old enough account with a completed trip, so the writer may submit
        writer = await createUser();
        await User.collection.updateOne({ _id: writer._id }, { $set: { createdAt: new Date(Date.now() - 60 * 864e5) } });
        const t = await tour();
        await Booking.create({ user: writer._id, tour: t._id, travelDate: new Date(Date.now() - 20 * 864e5), numberOfTravelers: 1, contactInfo, totalAmount: 1, status: 'completed' });
    });

    const article = { title: 'Ramen Nights in Tokyo', excerpt: 'Where to slurp the best bowls after dark.', content: '## Shinjuku\n\nGo late.', coverImage: 'https://example.com/r.jpg' };

    it('go to review instead of straight to the site, then get published by an editor', async () => {
        const created = await request(app).post('/api/v1/blog').set('Cookie', cookieFor(writer)).send({ ...article, status: 'published' });
        expect(created.status).toBe(200);
        const post = created.body.data.post;
        expect(post.status).toBe('pending');

        // Not public yet, but the writer and editors can open it
        expect((await request(app).get(`/api/v1/blog/${post.slug}`)).status).toBe(404);
        expect((await request(app).get(`/api/v1/blog/${post.slug}`).set('Cookie', cookieFor(writer))).status).toBe(200);
        expect((await request(app).get('/api/v1/blog')).body.data.posts).toHaveLength(0);
        expect((await request(app).get('/api/v1/blog').set('Cookie', cookieFor(admin))).body.data.posts).toHaveLength(1);
        expect((await request(app).get('/api/v1/blog/mine').set('Cookie', cookieFor(writer))).body.data.posts).toHaveLength(1);

        // Writers cannot publish their own work, nor touch someone else's
        const selfPublish = await request(app).put(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(writer)).send({ status: 'published' });
        expect(selfPublish.body.data.post.status).toBe('pending');
        expect((await request(app).put(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(user)).send({ title: 'Hacked' })).status).toBe(403);

        // Sent back with a note, edited, resubmitted, published
        const rejected = await request(app).put(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(admin)).send({ status: 'rejected', reviewNote: 'Add a photo of your own.' });
        expect(rejected.body.data.post.reviewNote).toBe('Add a photo of your own.');
        const resubmitted = await request(app).put(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(writer)).send({ coverImage: 'https://example.com/mine.jpg' });
        expect(resubmitted.body.data.post.status).toBe('pending');
        expect(resubmitted.body.data.post.reviewNote).toBe('');
        const published = await request(app).put(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(admin)).send({ status: 'published' });
        expect(published.body.data.post.status).toBe('published');
        expect((await request(app).get(`/api/v1/blog/${post.slug}`)).status).toBe(200);

        // Once live, only an admin can remove it
        expect((await request(app).delete(`/api/v1/blog/${post._id}`).set('Cookie', cookieFor(writer))).status).toBe(403);
    });

    it('can be saved as a draft and deleted by the writer', async () => {
        const created = await request(app).post('/api/v1/blog').set('Cookie', cookieFor(writer)).send({ ...article, status: 'draft' });
        expect(created.body.data.post.status).toBe('draft');
        expect((await request(app).delete(`/api/v1/blog/${created.body.data.post._id}`).set('Cookie', cookieFor(writer))).status).toBe(200);
        expect(await BlogPost.countDocuments()).toBe(0);
    });
});

describe('messages to the team', () => {
    it('accept general questions without a phone number or travel date', async () => {
        const res = await request(app).post('/api/v1/inquiries').send({
            fullName: 'Ravi', email: 'ravi@example.com', topic: 'question', message: 'Do I need a visa for Bali?', source: 'chat', context: 'Bali Escape',
        });
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ topic: 'question', source: 'chat', context: 'Bali Escape' });
    });

    it('need a message when it is not a trip request', async () => {
        const res = await request(app).post('/api/v1/inquiries').send({ fullName: 'Ravi', email: 'ravi@example.com', topic: 'booking' });
        expect(res.status).toBe(400);
    });
});

describe('highlights', () => {
    it('use real numbers and leave out reviews written by staff', async () => {
        const t = await tour();
        await Review.create({ tour: t._id, user: admin._id, rating: 5, content: 'Staff review' });
        await Review.create({ tour: t._id, user: user._id, rating: 4, content: 'Loved the food tour.', isVerifiedBooking: true });
        await Booking.create({ user: user._id, tour: t._id, travelDate: new Date(), numberOfTravelers: 3, contactInfo, totalAmount: 1, status: 'confirmed' });

        const { stats, reviews } = (await request(app).get('/api/v1/settings/highlights')).body.data;
        expect(stats).toMatchObject({ tours: 1, destinations: 1, travellers: 3, reviews: 1, rating: 4 });
        expect(reviews.map((r) => r.quote)).toEqual(['Loved the food tour.']);
    });
});
