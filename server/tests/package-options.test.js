const request = require('supertest');
const app = require('../src/app');
const TravelDestination = require('../src/models/TravelDestination');
const SiteSettings = require('../src/models/SiteSettings');
const { clearCurrencyCache } = require('../src/services/currency');
const { completePastBookings } = require('../src/services/booking-service');
const Booking = require('../src/models/Booking');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const contactInfo = { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '+911234567890' };
const RATES = { USD: 1, INR: 80, EUR: 0.9, GBP: 0.5, AED: 3.6 };

const days = (n, place) => Array.from({ length: n }, (_, i) => ({ location: `${place} day ${i + 1}`, activity: `Plan for day ${i + 1}` }));
const packageOptions = {
    durations: [
        { label: '6 Nights / 7 Days', days: 7, nights: 6, price: 22999, itinerary: days(7, 'Long') },
        { label: '5 Nights / 6 Days', days: 6, nights: 5, price: 18999, itinerary: days(6, 'Short') },
    ],
    hotelClasses: [
        { key: 'economy', label: 'Economy', hotel: 'Hotel Willow Banks', features: 'Central', extraPerPerson: 0 },
        { key: 'deluxe', label: 'Deluxe', hotel: 'Honeymoon Inn', features: 'Spa', extraPerPerson: 5500 },
    ],
};
const newTour = {
    title: 'Shimla & Manali', location: 'Himachal Pradesh, India', currency: 'INR', bestTime: 'March–June',
    imageURL: 'https://example.com/s.jpg', overview: { about: 'Hills.' }, packageOptions,
};

let admin;
let traveller;
beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
    await reset();
    await SiteSettings.update({ currency: { base: 'INR', enabled: ['INR', 'USD'], rates: RATES } });
    clearCurrencyCache();
    admin = await createUser('admin');
    traveller = await createUser();
});

const create = (body = newTour) => request(app).post('/api/v1/tours').set('Cookie', cookieFor(admin)).send(body);
const book = (tourId, body = {}) => request(app).post('/api/v1/bookings').set('Cookie', cookieFor(traveller))
    .send({ tour: tourId, travelDate: future(20), numberOfTravelers: 2, contactInfo, currency: 'INR', ...body });

describe('trip lengths and hotel classes', () => {
    test('the tour shows its cheapest choice as its price, length and day plan', async () => {
        const res = await create();
        expect(res.status).toBe(200);
        const tour = res.body.data.tour;
        expect(tour).toMatchObject({ price: 18999, duration: { days: 6, nights: 5 }, bestTime: 'March–June' });
        expect(tour.itinerary).toHaveLength(6);
        expect(tour.itinerary[0]).toMatchObject({ day: 1, location: 'Short day 1' });
        expect(tour.packageOptions.durations).toHaveLength(2);
        expect(tour.packageOptions.hotelClasses.map((h) => h.key)).toEqual(['economy', 'deluxe']);
        // Search and sorting use the same "from" price
        expect(tour.priceUSD).toBeCloseTo(18999 / 80, 2);
    });

    test('a booking is charged for the length and hotel class picked, and keeps them', async () => {
        const { body } = await create();
        const res = await book(body.data.tour._id, { choice: { duration: '6 Nights / 7 Days', hotelClass: 'deluxe' } });
        expect(res.status).toBe(200);
        const booking = res.body.data.booking;
        expect(booking.unitPrice).toBe(22999 + 5500);
        expect(booking.totalAmount).toBe((22999 + 5500) * 2);
        expect(booking.packageChoice).toEqual({ duration: '6 Nights / 7 Days', days: 7, nights: 6, hotelClass: 'deluxe', hotelLabel: 'Deluxe', hotel: 'Honeymoon Inn' });
    });

    test('the length can be picked by its position too', async () => {
        const { body } = await create();
        const res = await book(body.data.tour._id, { choice: { duration: 0, hotelClass: 'economy' } });
        expect(res.body.data.booking.unitPrice).toBe(22999);
    });

    test('with nothing picked, the cheapest choice is booked', async () => {
        const { body } = await create();
        const res = await book(body.data.tour._id);
        expect(res.body.data.booking).toMatchObject({ unitPrice: 18999, packageChoice: { duration: '5 Nights / 6 Days', hotelClass: 'economy' } });
    });

    test('a choice the tour does not offer is refused, whatever price the client sends', async () => {
        const { body } = await create();
        const id = body.data.tour._id;
        expect((await book(id, { choice: { duration: '20 Nights' } })).status).toBe(400);
        expect((await book(id, { choice: { hotelClass: 'palace' } })).status).toBe(400);
        const sneaky = await book(id, { choice: { hotelClass: 'deluxe', extraPerPerson: 0 }, unitPrice: 1, totalAmount: 1 });
        expect(sneaky.body.data.booking.unitPrice).toBe(18999 + 5500);
    });

    test('a live tour cannot have a trip length without a price or a day plan; a draft can', async () => {
        const noPrice = { ...newTour, packageOptions: { durations: [{ label: '3 Nights', days: 4, itinerary: days(4, 'X') }] } };
        expect((await create(noPrice)).status).toBe(400);
        const noPlan = { ...newTour, packageOptions: { durations: [{ label: '3 Nights', days: 4, price: 9000 }] } };
        expect((await create(noPlan)).status).toBe(400);
        expect((await create({ ...noPlan, status: 'draft' })).status).toBe(200);
    });

    test('editing the choices updates the "from" price; removing them leaves a plain tour', async () => {
        const { body } = await create();
        const id = body.data.tour._id;
        const cheaper = { ...packageOptions, durations: [{ ...packageOptions.durations[1], price: 15999 }] };
        const edited = await request(app).put(`/api/v1/tours/${id}`).set('Cookie', cookieFor(admin)).send({ packageOptions: cheaper });
        expect(edited.body.data.tour.price).toBe(15999);
        const plain = await request(app).put(`/api/v1/tours/${id}`).set('Cookie', cookieFor(admin)).send({ packageOptions: null, price: 12000 });
        expect(plain.body.data.tour).toMatchObject({ price: 12000, packageOptions: null });
        expect((await book(id)).body.data.booking).toMatchObject({ unitPrice: 12000, packageChoice: null });
    });

    test('a booked trip is completed after the length booked, not the shortest one', async () => {
        const { body } = await create();
        const tourId = body.data.tour._id;
        const make = (choice, daysAgo) => Booking.insert({
            user: traveller._id, tour: tourId, travelDate: new Date(Date.now() - daysAgo * 864e5), numberOfTravelers: 1,
            contactInfo, totalAmount: 1, status: 'confirmed', packageChoice: choice,
        });
        // Started 6.5 days ago: a 6-day trip is over, a 7-day one is not
        const short = await make({ duration: '5 Nights / 6 Days', days: 6, nights: 5 }, 6.5);
        const long = await make({ duration: '6 Nights / 7 Days', days: 7, nights: 6 }, 6.5);
        await completePastBookings();
        expect((await Booking.findById(short._id)).status).toBe('completed');
        expect((await Booking.findById(long._id)).status).toBe('confirmed');
    });
});
