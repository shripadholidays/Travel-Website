const request = require('supertest');
const app = require('../src/app');
const TravelDestination = require('../src/models/TravelDestination');
const Booking = require('../src/models/Booking');
const Coupon = require('../src/models/Coupon');
const UserInquiry = require('../src/models/UserInquiry');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };

function tour(overrides = {}) {
    return TravelDestination.insert({
        title: 'Discover Tokyo',
        location: 'Tokyo, Japan',
        price: 1000,
        currency: '$',
        duration: { days: 6, nights: 5 },
        validity: new Date(Date.now() + 365 * 86400000),
        imageURL: 'https://example.com/tokyo.jpg',
        categories: ['City', 'Culture'],
        overview: { about: 'Neon streets and quiet temples.' },
        ...overrides,
    });
}

let user;
let cookie;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    user = await createUser();
    cookie = cookieFor(user);
});

describe('tour search', () => {
    beforeEach(async () => {
        await tour();
        await tour({ title: 'Majestic Himalayan Trek', location: 'Nepal, Asia', categories: ['Trekking'], overview: { about: 'High passes.' } });
    });

    const titles = async (q) => (await request(app).get(`/api/v1/tours?search=${encodeURIComponent(q)}`)).body.data.tours.map((t) => t.title);

    it('matches location, category, partial words and every word', async () => {
        expect(await titles('Japan')).toEqual(['Discover Tokyo']);
        expect(await titles('nepal')).toEqual(['Majestic Himalayan Trek']);
        expect(await titles('trekking')).toEqual(['Majestic Himalayan Trek']);
        expect(await titles('Toky')).toEqual(['Discover Tokyo']);
        expect(await titles('Tokyo trekking')).toEqual([]);
    });

    it('treats regex characters literally', async () => {
        const res = await request(app).get(`/api/v1/tours?search=${encodeURIComponent('a(b[')}`);
        expect(res.status).toBe(200);
        expect(res.body.data.tours).toEqual([]);
    });
});

describe('tour bookings', () => {
    let t;
    beforeEach(async () => { t = await tour(); });

    const book = (body) => request(app).post('/api/v1/bookings').set('Cookie', cookie)
        .send({ tour: t._id, travelDate: future(20), numberOfTravelers: 2, contactInfo, currency: 'USD', ...body });

    it('prices add-ons from the server catalogue, ignoring client prices', async () => {
        const res = await book({ addons: [{ name: 'Airport Transfer', price: -5000 }] });
        expect(res.status).toBe(200);
        expect(res.body.data.booking.totalAmount).toBe(2050);
        expect(res.body.data.booking.addons).toEqual([expect.objectContaining({ name: 'Airport Transfer', price: 50 })]);
    });

    it('rejects unknown add-ons, missing and past dates', async () => {
        expect((await book({ addons: [{ name: 'Free Upgrade', price: 0 }] })).status).toBe(400);
        expect((await book({ travelDate: '' })).status).toBe(400);
        expect((await book({ travelDate: '2020-01-01' })).status).toBe(400);
        expect(await Booking.count()).toBe(0);
    });

    it('applies a coupon on the server and uses it up on confirmation', async () => {
        await Coupon.insert({ code: 'SAVE10', discountType: 'percent', discountValue: 10, maxUses: 1 });
        const res = await book({ couponCode: 'save10' });
        expect(res.status).toBe(200);
        const b = res.body.data.booking;
        expect(b.subtotalAmount).toBe(2000);
        expect(b.coupon).toEqual(expect.objectContaining({ code: 'SAVE10', discount: 200 }));
        expect(b.totalAmount).toBe(1800);
        // No payment gateway in tests, so the booking confirms and the coupon is spent
        expect(b.status).toBe('confirmed');
        expect((await Coupon.findByCode('SAVE10')).usedCount).toBe(1);
        expect((await book({ couponCode: 'SAVE10' })).status).toBe(400);
    });

    it('only lets the owner confirm a booking', async () => {
        const other = await createUser();
        const booking = await Booking.insert({
            user: other._id, tour: t._id, travelDate: new Date(future(20)), numberOfTravelers: 1,
            contactInfo, totalAmount: 1000, status: 'pending',
        });
        const res = await request(app).post('/api/v1/payments/confirm').set('Cookie', cookie).send({ bookingId: booking._id });
        expect(res.status).toBe(404);
        expect((await Booking.findById(booking._id)).status).toBe('pending');
    });
});

describe('inquiries', () => {
    it('saves only the contact form fields', async () => {
        const res = await request(app).post('/api/v1/inquiries').send({
            fullName: 'Asha Rao', email: 'asha@example.com', phoneNumber: '12345', numberOfTravelers: 2,
            preferredTravelDate: future(30), message: 'Hi', status: 'replied',
        });
        expect(res.status).toBe(200);
        const saved = await UserInquiry.findOne('email = ?', ['asha@example.com']);
        expect(saved.status).toBe('new');
        expect(saved.fullName).toBe('Asha Rao');
    });
});
