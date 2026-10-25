// Razorpay checkout end to end, with a fake Razorpay API (signatures are real HMACs).
const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const payments = require('../src/services/payments');
const TravelDestination = require('../src/models/TravelDestination');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const TravelOrder = require('../src/models/TravelOrder');
const { connect, disconnect, reset, createUser, cookieFor, setFeatures } = require('./helpers');

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };
const sign = (orderId, paymentId, secret = KEY_SECRET) => crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

// Just enough of the Razorpay SDK: orders, payments (fetch / capture / refund)
function fakeRazorpay() {
    const fake = { orders: new Map(), payments: new Map(), refunds: [], captures: [], failNextOrder: false };
    let n = 0;
    fake.client = {
        orders: {
            create: async (o) => {
                if (fake.failNextOrder) { fake.failNextOrder = false; throw Object.assign(new Error('down'), { error: { description: 'Gateway down' } }); }
                const order = { id: `order_${++n}`, ...o, status: 'created' };
                fake.orders.set(order.id, order);
                return order;
            },
        },
        payments: {
            fetch: async (id) => {
                const p = fake.payments.get(id);
                if (!p) throw new Error('not found');
                return { ...p };
            },
            capture: async (id, amount, currency) => {
                fake.captures.push({ id, amount, currency });
                const p = fake.payments.get(id);
                p.status = 'captured';
                return { ...p };
            },
            refund: async (id, body) => {
                fake.refunds.push({ id, ...body });
                return { id: `rfnd_${fake.refunds.length}`, payment_id: id, amount: body.amount };
            },
        },
    };
    // What happens when the traveller pays in Checkout
    fake.pay = (orderId, { amount, status = 'authorized', currency } = {}) => {
        const order = fake.orders.get(orderId);
        const payment = { id: `pay_${++n}`, order_id: orderId, amount: amount ?? order.amount, currency: currency ?? order.currency, status, method: 'upi' };
        fake.payments.set(payment.id, payment);
        return { razorpay_payment_id: payment.id, razorpay_order_id: orderId, razorpay_signature: sign(orderId, payment.id) };
    };
    return fake;
}

describe('Razorpay payments', () => {
    let fake;
    let traveller;
    let tour;
    const book = (body = {}) => request(app).post('/api/v1/bookings').set('Cookie', cookieFor(traveller))
        .send({ tour: tour._id, travelDate: future(30), numberOfTravelers: 2, contactInfo, currency: 'INR', ...body });
    const confirm = (bookingId, paid) => request(app).post('/api/v1/payments/confirm').set('Cookie', cookieFor(traveller)).send({ bookingId, ...paid });

    beforeAll(async () => {
        await connect();
        Object.assign(config.razorpay, { keyId: 'rzp_test_abc123', keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET });
    });
    afterAll(async () => {
        payments.setTestClient(null);
        Object.assign(config.razorpay, { keyId: '', keySecret: '', webhookSecret: '' });
        await disconnect();
    });
    beforeEach(async () => {
        await reset();
        fake = fakeRazorpay();
        payments.setTestClient(fake.client);
        traveller = await createUser('user');
        tour = await TravelDestination.insert({
            title: 'Kerala Backwaters', location: 'Kochi, India', price: 25000, currency: 'INR',
            duration: { days: 5, nights: 4 }, validity: new Date(Date.now() + 365 * 864e5),
            imageURL: 'https://example.com/k.jpg', overview: { about: 'Houseboats.' },
        });
    });

    it('opens a Razorpay order for the exact amount in the chosen currency', async () => {
        const res = await book();
        expect(res.status).toBe(200);
        const { booking, checkout } = res.body.data;
        expect(booking.status).toBe('pending');
        expect(checkout).toMatchObject({
            provider: 'razorpay', keyId: 'rzp_test_abc123', amount: 5000000, currency: 'INR',
            prefill: { name: 'Asha Rao', email: 'asha@example.com', contact: '+911234567890' },
        });
        expect(fake.orders.get(checkout.orderId)).toMatchObject({ amount: 5000000, currency: 'INR', receipt: `booking_${booking._id}` });
        expect(JSON.stringify(res.body)).not.toContain(KEY_SECRET);
        const payment = await Payment.findOne('booking_id = ?', [booking._id]);
        expect(payment).toMatchObject({ gatewayOrderId: checkout.orderId, amount: 50000, currency: 'INR', status: 'pending', method: 'razorpay' });
    });

    it('charges in USD when the traveller picks USD', async () => {
        const { checkout } = (await book({ currency: 'USD' })).body.data;
        // 25000 INR at 83.5 per USD = 299.40 each, two travellers
        expect(checkout).toMatchObject({ currency: 'USD', amount: 59880 });
    });

    it('confirms only a verified, captured payment for that order and amount', async () => {
        const { booking, checkout } = (await book()).body.data;

        const forged = fake.pay(checkout.orderId);
        expect((await confirm(booking._id, { ...forged, razorpay_signature: sign(checkout.orderId, forged.razorpay_payment_id, 'wrong') })).status).toBe(400);

        const other = (await book()).body.data.checkout;
        const otherPaid = fake.pay(other.orderId);
        expect((await confirm(booking._id, otherPaid)).status).toBe(400);

        const short = fake.pay(checkout.orderId, { amount: 100 });
        expect((await confirm(booking._id, short)).body.message).toMatch(/does not match/);
        expect((await Booking.findById(booking._id)).status).toBe('pending');

        const paid = fake.pay(checkout.orderId);
        const ok = await confirm(booking._id, paid);
        expect(ok.status).toBe(200);
        expect(ok.body.data.booking.status).toBe('confirmed');
        expect(fake.captures).toEqual([{ id: paid.razorpay_payment_id, amount: 5000000, currency: 'INR' }]);
        expect(await Payment.findOne('booking_id = ?', [booking._id])).toMatchObject({ status: 'completed', gatewayPaymentId: paid.razorpay_payment_id });

        expect((await confirm(booking._id, paid)).body.message).toMatch(/already processed/);
    });

    it('refunds the payment in full when the booking is cancelled', async () => {
        const { booking, checkout } = (await book()).body.data;
        const paid = fake.pay(checkout.orderId, { status: 'captured' });
        await confirm(booking._id, paid).expect(200);

        const res = await request(app).patch(`/api/v1/bookings/${booking._id}/cancel`).set('Cookie', cookieFor(traveller));
        expect(res.status).toBe(200);
        expect(res.body.data.booking).toMatchObject({ status: 'cancelled', refundedAmount: 50000 });
        expect(fake.refunds).toEqual([expect.objectContaining({ id: paid.razorpay_payment_id, amount: 5000000 })]);
        expect((await Payment.findOne('booking_id = ?', [booking._id])).status).toBe('refunded');
    });

    it('cancels the booking when Razorpay is unreachable', async () => {
        fake.failNextOrder = true;
        const res = await book();
        expect(res.status).toBe(502);
        const [booking] = await Booking.find();
        expect(booking.status).toBe('cancelled');
    });

    describe('webhook', () => {
        const send = (event, secret = WEBHOOK_SECRET) => {
            const body = JSON.stringify(event);
            const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
            return request(app).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(body);
        };
        const event = (name, entity) => ({ event: name, payload: { payment: { entity } } });

        it('rejects events that are not signed by Razorpay', async () => {
            expect((await send(event('payment.captured', {}), 'not-the-secret')).status).toBe(400);
        });

        it('confirms the booking when the browser never came back, once only', async () => {
            const { booking, checkout } = (await book()).body.data;
            const entity = { id: 'pay_web', order_id: checkout.orderId, amount: 5000000, currency: 'INR', status: 'captured' };
            expect((await send(event('payment.captured', entity))).status).toBe(200);
            expect((await Booking.findById(booking._id)).status).toBe('confirmed');
            expect((await send(event('order.paid', entity))).status).toBe(200);
            expect(await Payment.findOne('booking_id = ?', [booking._id])).toMatchObject({ status: 'completed', gatewayPaymentId: 'pay_web' });
        });

        it('ignores a captured amount that does not match, and records failures', async () => {
            const { booking, checkout } = (await book()).body.data;
            await send(event('payment.captured', { id: 'pay_x', order_id: checkout.orderId, amount: 1, currency: 'INR', status: 'captured' })).expect(200);
            expect((await Booking.findById(booking._id)).status).toBe('pending');
            await send(event('payment.failed', { id: 'pay_y', order_id: checkout.orderId, status: 'failed', error_description: 'Card declined' })).expect(200);
            expect((await Payment.findOne('booking_id = ?', [booking._id])).status).toBe('failed');
        });
    });

    it('takes flight payments the same way', async () => {
        await setFeatures({ flights: true });
        const search = await request(app).get(`/api/v1/flights/search?from=DEL&to=BOM&departDate=${future(15)}&adults=1`);
        const offer = search.body.data.offers[0];
        const cookie = cookieFor(traveller);
        const created = await request(app).post('/api/v1/travel-orders').set('Cookie', cookie)
            .send({ kind: 'flight', offerId: offer.id, travellers: [{ title: 'Ms', firstName: 'Asha', lastName: 'Rao' }], contact: { email: 'asha@example.com' }, currency: 'INR' });
        const { order, checkout } = created.body.data;
        expect(order.status).toBe('pending');
        expect(checkout).toMatchObject({ provider: 'razorpay', currency: 'INR' });

        const paid = fake.pay(checkout.orderId, { status: 'captured' });
        const res = await request(app).post(`/api/v1/travel-orders/${order._id}/confirm`).set('Cookie', cookie).send(paid);
        expect(res.status).toBe(200);
        expect(res.body.data.order).toMatchObject({ status: 'confirmed', providerRef: expect.stringMatching(/^WZ/) });
        expect((await TravelOrder.findById(order._id)).status).toBe('confirmed');
    });
});
