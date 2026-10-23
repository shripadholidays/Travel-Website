const request = require('supertest');
const app = require('../src/app');
const TravelDestination = require('../src/models/TravelDestination');
const Coupon = require('../src/models/Coupon');
const SiteSettings = require('../src/models/SiteSettings');
const { clearCurrencyCache } = require('../src/services/currency');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };
// Fixed rates so the arithmetic in these tests is easy to check: 1 USD = 80 INR = 0.5 GBP
const RATES = { USD: 1, INR: 80, EUR: 0.9, GBP: 0.5, AED: 3.6 };

const tour = (overrides = {}) => TravelDestination.create({
    title: 'Kerala Backwaters', location: 'Kochi, India', price: 40000, currency: 'INR',
    duration: { days: 5, nights: 4 }, validity: new Date(Date.now() + 365 * 864e5),
    imageURL: 'https://example.com/k.jpg', overview: { about: 'Houseboats.' }, ...overrides,
});

let user;
let admin;
beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    await SiteSettings.create({ currency: { base: 'INR', enabled: ['INR', 'USD', 'GBP'], rates: RATES } });
    clearCurrencyCache();
    user = await createUser();
    admin = await createUser('admin');
});

const book = (t, body) => request(app).post('/api/v1/bookings').set('Cookie', cookieFor(user))
    .send({ tour: t._id, travelDate: future(20), numberOfTravelers: 2, contactInfo, ...body });

describe('tours priced in their own currency', () => {
    it('keeps the currency the operator chose and indexes the USD price', async () => {
        const res = await request(app).post('/api/v1/tours').set('Cookie', cookieFor(admin)).send({
            title: 'Goa Beaches', location: 'Goa, India', price: 24000, currency: 'INR', imageURL: 'https://example.com/g.jpg', overview: { about: 'Sun and sand.' },
        });
        expect(res.body.data.tour).toMatchObject({ currency: 'INR', price: 24000, priceUSD: 300 });
        // No currency given: the site's base currency
        const plain = await request(app).post('/api/v1/tours').set('Cookie', cookieFor(admin)).send({ title: 'Draft', location: 'Agra, India', status: 'draft' });
        expect(plain.body.data.tour.currency).toBe('INR');
    });

    it('filters and sorts on the real price whatever the currency', async () => {
        await tour({ title: 'Rupee tour', price: 40000, currency: 'INR' });   // $500
        await tour({ title: 'Pound tour', price: 400, currency: 'GBP' });     // $800
        await tour({ title: 'Dollar tour', price: 600, currency: 'USD' });    // $600
        const cheap = await request(app).get('/api/v1/tours?maxPrice=650&sort=price_low');
        expect(cheap.body.data.tours.map((t) => t.title)).toEqual(['Rupee tour', 'Dollar tour']);
        // The filter can be given in rupees too
        const inr = await request(app).get('/api/v1/tours?maxPrice=45000&priceCurrency=INR');
        expect(inr.body.data.tours.map((t) => t.title)).toEqual(['Rupee tour']);
    });
});

describe('checkout in the traveller\'s currency', () => {
    it('charges an INR tour in rupees by default and in dollars when asked', async () => {
        const t = await tour();
        const inr = await book(t, {});
        expect(inr.body.data.booking).toMatchObject({ currency: 'INR', totalAmount: 80000, unitPrice: 40000, baseAmount: 80000 });

        const usd = await book(t, { currency: 'USD', addons: ['Airport Transfer'] });
        // 2 × ₹40,000 = $1,000, plus the $50 transfer
        expect(usd.body.data.booking).toMatchObject({ currency: 'USD', unitPrice: 500, totalAmount: 1050, tourCurrency: 'INR', baseCurrency: 'INR', baseAmount: 84000 });
        expect(usd.body.data.booking.addons[0].price).toBe(50);
    });

    it('converts add-ons and falls back to the base currency for switched-off ones', async () => {
        const t = await tour({ price: 100, currency: 'USD' });
        const gbpOff = await book(t, { currency: 'EUR' });
        expect(gbpOff.body.data.booking.currency).toBe('INR');
        const inr = await book(t, { addons: ['Airport Transfer'] });
        expect(inr.body.data.booking.totalAmount).toBe(2 * 8000 + 4000);
    });

    it('applies flat coupons in their own currency and checks minimum orders after converting', async () => {
        await Coupon.create({ code: 'RUPEES500', discountType: 'flat', discountValue: 500, currency: 'INR', minOrderAmount: 50000 });
        const t = await tour();
        const usd = await book(t, { currency: 'USD', couponCode: 'RUPEES500' });
        // ₹500 off a $1,000 order is $6.25
        expect(usd.body.data.booking.coupon.discount).toBe(6.25);
        expect(usd.body.data.booking.totalAmount).toBe(993.75);

        const small = await book(await tour({ price: 10000 }), { couponCode: 'RUPEES500' });
        expect(small.status).toBe(400);
        expect(small.body.message).toMatch(/50,000/);

        const preview = await request(app).post('/api/v1/coupons/validate').send({ code: 'rupees500', orderAmount: 1000, currency: 'USD' });
        expect(preview.body.data.coupon).toMatchObject({ discount: 6.25, currency: 'USD' });
    });

    it('reports revenue in the base currency across currencies', async () => {
        const t = await tour();
        await book(t, {});                     // ₹80,000
        await book(t, { currency: 'USD' });    // $1,000 = ₹80,000
        const stats = await request(app).get('/api/v1/admin/stats').set('Cookie', cookieFor(admin));
        expect(stats.body.data).toMatchObject({ totalRevenue: 160000, revenueCurrency: 'INR' });
    });
});

describe('currency settings', () => {
    it('shares rates publicly and validates admin changes', async () => {
        const pub = await request(app).get('/api/v1/settings');
        expect(pub.body.data.settings.currency).toMatchObject({ base: 'INR', enabled: ['INR', 'USD', 'GBP'], rates: expect.objectContaining({ INR: 80 }) });

        const bad = await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ currency: { base: 'INR', enabled: ['USD'] } });
        expect(bad.status).toBe(400);

        await tour({ price: 40000 });
        const ok = await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ currency: { rates: { ...RATES, INR: 100 } } });
        expect(ok.status).toBe(200);
        // Tours' USD prices follow the new rate
        expect((await TravelDestination.findOne()).priceUSD).toBe(400);
    });
});
