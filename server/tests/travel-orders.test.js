const { newId } = require('../src/db/ids');
const request = require('supertest');
const app = require('../src/app');
const TravelOrder = require('../src/models/TravelOrder');
const Payment = require('../src/models/Payment');
const Booking = require('../src/models/Booking');
const { connect, disconnect, reset, createUser, cookieFor, setFeatures } = require('./helpers');

const future = (days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const traveller = { title: 'Ms', firstName: 'Asha', lastName: 'Rao' };
const passport = { passportNumber: 'Z1234567', passportExpiry: '2032-01-01', nationality: 'IN' };
const contact = { email: 'asha@example.com', phone: '+911234567890' };

async function firstFlight(to = 'BOM', adults = 1) {
    const res = await request(app).get(`/api/v1/flights/search?from=DEL&to=${to}&departDate=${future(15)}&adults=${adults}`);
    return res.body.data.offers[0];
}

async function firstHotelRoom(code) {
    const res = await request(app).get(`/api/v1/hotels/goa-fort-aguada?checkIn=${future(15)}&checkOut=${future(18)}&rooms=1&adults=2`);
    return res.body.data.hotel.roomOffers.find((r) => r.roomCode === code);
}

let user;
let cookie;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    await setFeatures({ flights: true, hotels: true });
    user = await createUser();
    cookie = cookieFor(user);
});
afterEach(() => { delete process.env.MOCK_BOOK_FAIL; });

const createOrder = (body, c = cookie) => request(app).post('/api/v1/travel-orders').set('Cookie', c).send(body);

describe('payment model', () => {
    it('requires exactly one of booking or order', async () => {
        const base = { user: newId(), amount: 10 };
        await expect(Payment.insert(base)).rejects.toThrow(/exactly one/);
        await expect(Payment.insert({ ...base, booking: newId(), order: newId() })).rejects.toThrow(/exactly one/);
        await expect(Payment.insert({ ...base, order: newId() })).resolves.toBeTruthy();
    });
});

describe('creating orders (no Stripe configured)', () => {
    it('books immediately and hides supplier pricing', async () => {
        const offer = await firstFlight();
        const res = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact, quotedTotal: offer.price, currency: 'USD' });
        expect(res.status).toBe(200);
        const { order } = res.body.data;
        expect(order.status).toBe('confirmed');
        expect(order.providerRef).toMatch(/^WZ/);
        expect(order.pricing).toEqual({ total: offer.price, currency: 'USD' });
        expect(JSON.stringify(order)).not.toContain('supplier');
        const saved = await TravelOrder.findById(order._id);
        expect(saved.pricing.supplierAmount).toBeGreaterThan(0);
    });

    it('treats a placeholder Stripe key as "no gateway"', async () => {
        process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
        try {
            const offer = await firstFlight();
            const res = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact });
            expect(res.body.data.order.status).toBe('confirmed');
            expect(res.body.data.clientSecret).toBeUndefined();
        } finally {
            process.env.STRIPE_SECRET_KEY = '';
        }
    });

    it('asks before charging a changed price', async () => {
        const offer = await firstFlight();
        const changed = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact, quotedTotal: offer.price - 5 });
        expect(changed.body.data).toEqual({ priceChanged: true, newTotal: offer.price });
        expect(await TravelOrder.count()).toBe(0);
        const accepted = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact, quotedTotal: offer.price - 5, acceptPriceChange: true });
        expect(accepted.body.data.order.status).toBe('confirmed');
    });

    it('requires passports for international flights', async () => {
        const offer = await firstFlight('DXB');
        const missing = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact });
        expect(missing.status).toBe(400);
        const ok = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [{ ...traveller, ...passport }], contact });
        expect(ok.status).toBe(200);
    });

    it('marks the order failed when the supplier rejects the booking', async () => {
        process.env.MOCK_BOOK_FAIL = 'true';
        const offer = await firstFlight();
        const res = await createOrder({ kind: 'flight', offerId: offer.id, travellers: [traveller], contact });
        expect(res.body.data.order.status).toBe('failed');
    });

    it('only links trips the user owns', async () => {
        const other = await createUser();
        const theirs = await Booking.insert({ user: other._id, tour: newId(), travelDate: new Date(), numberOfTravelers: 1, totalAmount: 100, contactInfo: { firstName: 'A', lastName: 'R', email: 'a@example.com', phone: '1' } });
        const mine = await Booking.insert({ user: user._id, tour: newId(), travelDate: new Date(), numberOfTravelers: 1, totalAmount: 100, contactInfo: { firstName: 'A', lastName: 'R', email: 'a@example.com', phone: '1' } });
        const room = await firstHotelRoom('DLX');
        const bad = await createOrder({ kind: 'hotel', offerId: room.id, travellers: [traveller], contact, linkedBooking: theirs._id });
        expect(bad.status).toBe(400);
        const good = await createOrder({ kind: 'hotel', offerId: room.id, travellers: [traveller], contact, linkedBooking: mine._id });
        expect(good.status).toBe(200);
        expect(String(good.body.data.order.linkedBooking)).toBe(String(mine._id));
    });

    it('404s when that service is switched off', async () => {
        const room = await firstHotelRoom('DLX');
        await setFeatures({ flights: true, hotels: false });
        const res = await createOrder({ kind: 'hotel', offerId: room.id, travellers: [traveller], contact });
        expect(res.status).toBe(404);
    });
});

describe('listing and cancelling', () => {
    async function bookBoth() {
        const flight = await firstFlight();
        const room = await firstHotelRoom('STE');
        const f = await createOrder({ kind: 'flight', offerId: flight.id, travellers: [traveller], contact });
        const h = await createOrder({ kind: 'hotel', offerId: room.id, travellers: [traveller], contact });
        return { flightOrder: f.body.data.order, hotelOrder: h.body.data.order };
    }

    it('lists only enabled services and hides everything when both are off', async () => {
        const { hotelOrder } = await bookBoth();
        expect((await request(app).get('/api/v1/travel-orders').set('Cookie', cookie)).body.data.orders).toHaveLength(2);

        await setFeatures({ flights: true, hotels: false });
        const onlyFlights = await request(app).get('/api/v1/travel-orders').set('Cookie', cookie);
        expect(onlyFlights.body.data.orders.map((o) => o.kind)).toEqual(['flight']);
        const cancelHidden = await request(app).patch(`/api/v1/travel-orders/${hotelOrder._id}/cancel`).set('Cookie', cookie);
        expect(cancelHidden.status).toBe(404);

        await setFeatures({});
        expect((await request(app).get('/api/v1/travel-orders').set('Cookie', cookie)).status).toBe(404);
    });

    it('admins still see every order with the switches off', async () => {
        await bookBoth();
        await setFeatures({});
        const admin = await createUser('admin');
        const res = await request(app).get('/api/v1/admin/travel-orders').set('Cookie', cookieFor(admin));
        expect(res.status).toBe(200);
        expect(res.body.data.orders).toHaveLength(2);
        expect(res.body.data.orders[0].pricing.supplierAmount).toBeGreaterThan(0);
        const forbidden = await request(app).get('/api/v1/admin/travel-orders').set('Cookie', cookie);
        expect(forbidden.status).toBe(403);
    });

    it('refuses to cancel non-refundable bookings and other users\' orders', async () => {
        const { flightOrder, hotelOrder } = await bookBoth();
        const nonRefundable = await request(app).patch(`/api/v1/travel-orders/${hotelOrder._id}/cancel`).set('Cookie', cookie);
        expect(nonRefundable.status).toBe(400);

        const stranger = cookieFor(await createUser());
        const notYours = await request(app).patch(`/api/v1/travel-orders/${flightOrder._id}/cancel`).set('Cookie', stranger);
        expect(notYours.status).toBe(404);
    });

    it('cancels refundable bookings and lets admins change status', async () => {
        const room = await firstHotelRoom('DLX');
        const created = await createOrder({ kind: 'hotel', offerId: room.id, travellers: [traveller], contact });
        const id = created.body.data.order._id;
        const res = await request(app).patch(`/api/v1/travel-orders/${id}/cancel`).set('Cookie', cookie);
        expect(res.body.data.order.status).toBe('cancelled');

        const admin = await createUser('admin');
        const upd = await request(app).patch(`/api/v1/admin/travel-orders/${id}`).set('Cookie', cookieFor(admin)).send({ status: 'confirmed' });
        expect(upd.body.data.order.status).toBe('confirmed');
        const bad = await request(app).patch(`/api/v1/admin/travel-orders/${id}`).set('Cookie', cookieFor(admin)).send({ status: 'nope' });
        expect(bad.status).toBe(400);
    });
});
