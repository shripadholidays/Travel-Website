// Stripe checkout and switching between Razorpay and Stripe (fake gateway APIs).
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const payments = require('../src/services/payments');
const SiteSettings = require('../src/models/SiteSettings');
const TravelDestination = require('../src/models/TravelDestination');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };

function fakeStripe() {
    const fake = { intents: new Map(), refunds: [] };
    let n = 0;
    fake.client = {
        paymentIntents: {
            create: async (p) => {
                const intent = { id: `pi_${++n}`, object: 'payment_intent', client_secret: `pi_${n}_secret_x`, status: 'requires_payment_method', latest_charge: null, ...p };
                fake.intents.set(intent.id, intent);
                return intent;
            },
            retrieve: async (id) => ({ ...fake.intents.get(id) }),
        },
        refunds: { create: async (r) => { fake.refunds.push(r); return { id: `re_${fake.refunds.length}` }; } },
        webhooks: {
            constructEvent: (raw, sig) => {
                if (sig !== 'valid-stripe-signature') throw new Error('bad signature');
                return JSON.parse(raw.toString('utf8'));
            },
        },
    };
    fake.succeed = (id) => Object.assign(fake.intents.get(id), { status: 'succeeded', latest_charge: `ch_${id}` });
    return fake;
}

function fakeRazorpay() {
    let n = 0;
    return {
        orders: { create: async (o) => ({ id: `order_${++n}`, ...o }) },
        payments: { fetch: async () => ({}), capture: async () => ({}), refund: async () => ({}) },
    };
}

describe('payment gateways', () => {
    let stripe;
    let traveller;
    let admin;
    let tour;
    const book = () => request(app).post('/api/v1/bookings').set('Cookie', cookieFor(traveller))
        .send({ tour: tour._id, travelDate: future(30), numberOfTravelers: 1, contactInfo, currency: 'USD' });

    beforeAll(async () => {
        await connect();
        Object.assign(config.stripe, { secretKey: 'sk_test_abc', publishableKey: 'pk_test_abc', webhookSecret: 'whsec_test' });
        Object.assign(config.razorpay, { keyId: 'rzp_test_abc', keySecret: 'secret', webhookSecret: 'whsec_rzp' });
    });
    afterAll(async () => {
        payments.setTestClient(null, 'stripe');
        payments.setTestClient(null, 'razorpay');
        Object.assign(config.stripe, { secretKey: '', publishableKey: '', webhookSecret: '' });
        Object.assign(config.razorpay, { keyId: '', keySecret: '', webhookSecret: '' });
        await disconnect();
    });
    beforeEach(async () => {
        await reset();
        stripe = fakeStripe();
        payments.setTestClient(stripe.client, 'stripe');
        payments.setTestClient(null, 'razorpay');
        Object.assign(config.razorpay, { keyId: '', keySecret: '' });
        traveller = await createUser('user');
        admin = await createUser('admin');
        tour = await TravelDestination.insert({
            title: 'Bali Escape', location: 'Bali, Indonesia', price: 400, currency: 'USD',
            duration: { days: 4, nights: 3 }, validity: new Date(Date.now() + 365 * 864e5),
            imageURL: 'https://example.com/b.jpg', overview: { about: 'Rice terraces.' },
        });
    });

    describe('Stripe', () => {
        it('takes the payment and confirms only once Stripe says it succeeded', async () => {
            const { booking, checkout } = (await book()).body.data;
            expect(checkout).toMatchObject({ provider: 'stripe', publishableKey: 'pk_test_abc', clientSecret: expect.stringContaining('secret'), amount: 40000, currency: 'USD' });
            expect(await Payment.findOne('booking_id = ?', [booking._id])).toMatchObject({ method: 'stripe', gatewayOrderId: checkout.orderId });

            const early = await request(app).post('/api/v1/payments/confirm').set('Cookie', cookieFor(traveller)).send({ bookingId: booking._id });
            expect(early.status).toBe(400);

            stripe.succeed(checkout.orderId);
            const ok = await request(app).post('/api/v1/payments/confirm').set('Cookie', cookieFor(traveller)).send({ bookingId: booking._id });
            expect(ok.body.data.booking.status).toBe('confirmed');
            expect(await Payment.findOne('booking_id = ?', [booking._id])).toMatchObject({ status: 'completed', gatewayPaymentId: `ch_${checkout.orderId}` });

            await request(app).patch(`/api/v1/bookings/${booking._id}/cancel`).set('Cookie', cookieFor(traveller)).expect(200);
            expect(stripe.refunds).toEqual([{ payment_intent: checkout.orderId }]);
        });

        it('confirms from a signed Stripe webhook and rejects unsigned ones', async () => {
            const { booking, checkout } = (await book()).body.data;
            const event = { type: 'payment_intent.succeeded', data: { object: { ...stripe.intents.get(checkout.orderId), status: 'succeeded', latest_charge: 'ch_hook' } } };
            const send = (sig) => request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', sig).send(JSON.stringify(event));
            expect((await send('forged')).status).toBe(400);
            expect((await send('valid-stripe-signature')).status).toBe(200);
            expect((await Booking.findById(booking._id)).status).toBe('confirmed');
        });
    });

    describe('choosing a gateway', () => {
        const activeName = async () => (await payments.active())?.name ?? null;

        it('uses Razorpay first when both are set up, unless an admin picks Stripe', async () => {
            payments.setTestClient(fakeRazorpay(), 'razorpay');
            expect(await activeName()).toBe('razorpay');
            await SiteSettings.update({ payments: { gateway: 'stripe' } });
            expect(await activeName()).toBe('stripe');
            expect((await book()).body.data.checkout.provider).toBe('stripe');
        });

        it('falls back to whichever gateway has keys', async () => {
            await SiteSettings.update({ payments: { gateway: 'razorpay' } });
            expect(await activeName()).toBe('stripe');
            payments.setTestClient(null, 'stripe');
            Object.assign(config.stripe, { secretKey: '' });
            try {
                expect(await activeName()).toBeNull();
                const { booking, checkout } = (await book()).body.data;
                expect(checkout).toBeNull();
                expect(booking.status).toBe('confirmed');
            } finally {
                Object.assign(config.stripe, { secretKey: 'sk_test_abc' });
            }
        });

        it('refunds through the gateway that took the payment, even after switching', async () => {
            const { booking, checkout } = (await book()).body.data;
            stripe.succeed(checkout.orderId);
            await request(app).post('/api/v1/payments/confirm').set('Cookie', cookieFor(traveller)).send({ bookingId: booking._id }).expect(200);

            payments.setTestClient(fakeRazorpay(), 'razorpay');
            await SiteSettings.update({ payments: { gateway: 'razorpay' } });
            await request(app).patch(`/api/v1/bookings/${booking._id}/cancel`).set('Cookie', cookieFor(traveller)).expect(200);
            expect(stripe.refunds).toEqual([{ payment_intent: checkout.orderId }]);
        });

        it('shows admins which gateways are ready and saves the choice', async () => {
            payments.setTestClient(fakeRazorpay(), 'razorpay');
            const before = await request(app).get('/api/v1/admin/settings').set('Cookie', cookieFor(admin));
            expect(before.body.data.paymentGateways).toEqual({ available: { razorpay: true, stripe: true }, choice: 'auto', active: 'razorpay' });
            expect(JSON.stringify(before.body)).not.toMatch(/sk_test_abc|whsec/);

            expect((await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ payments: { gateway: 'paypal' } })).status).toBe(400);
            await request(app).put('/api/v1/admin/settings').set('Cookie', cookieFor(admin)).send({ payments: { gateway: 'stripe' } }).expect(200);
            const after = await request(app).get('/api/v1/admin/settings').set('Cookie', cookieFor(admin));
            expect(after.body.data.paymentGateways).toMatchObject({ choice: 'stripe', active: 'stripe' });
        });
    });
});
