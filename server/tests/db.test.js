const db = require('../src/db');
const { migrate } = require('../src/db/migrate');
const { newId, isId } = require('../src/db/ids');
const { wordMatch, wordMatchJs, populate } = require('../src/db/sql');
const User = require('../src/models/User');
const TravelDestination = require('../src/models/TravelDestination');
const Booking = require('../src/models/Booking');
const SiteSettings = require('../src/models/SiteSettings');
const { connect, disconnect, reset } = require('./helpers');

const tour = (overrides = {}) => ({
    title: 'Kyoto Walk', location: 'Kyoto, Japan', price: 41750, currency: 'INR',
    duration: { days: 3, nights: 2 }, validity: '2030-01-01', imageURL: 'x', overview: { about: 'a' }, ...overrides,
});

describe('database layer', () => {
    beforeAll(connect);
    afterAll(disconnect);
    beforeEach(reset);

    it('applies each migration once', async () => {
        expect(await migrate()).toEqual([]);
        const rows = await db.all('SELECT version FROM schema_migrations');
        expect(rows.map((r) => r.version)).toContain('001_initial.sql');
    });

    it('makes ids in the old MongoDB shape', () => {
        const id = newId();
        expect(isId(id)).toBe(true);
        expect(newId()).not.toBe(id);
    });

    it('round-trips nested fields, dates, JSON, booleans and the USD price index', async () => {
        const saved = await TravelDestination.insert(tour({ currency: '₹', categories: ['City'], overview: { about: 'a', gallery: [{ imageURL: 'g' }] } }));
        const loaded = await TravelDestination.findById(saved._id);
        expect(loaded).toMatchObject({
            currency: 'INR', priceUSD: 500, duration: { days: 3, nights: 2 }, categories: ['City'],
            isFeatured: false, status: 'active', coordinates: { lat: null, lng: null }, reviews: { rating: 0, basedOn: 0 },
        });
        expect(loaded.validity).toBeInstanceOf(Date);
        expect(isId(loaded.overview.gallery[0]._id)).toBe(true);
    });

    it('reports every problem at once, in words', async () => {
        const err = await TravelDestination.check({ title: 'x', location: 'y', duration: { days: 1, nights: 0 }, validity: new Date(), price: 'abc' });
        expect(err.name).toBe('ValidationError');
        expect(Object.keys(err.errors)).toEqual(expect.arrayContaining(['price', 'imageURL', 'overview.about']));
        // Drafts may be incomplete
        expect(await TravelDestination.check({ title: 'x', location: 'y', duration: { days: 1, nights: 0 }, validity: new Date(), status: 'draft' })).toBeNull();
    });

    it('keeps password fields hidden unless asked for, and saving does not wipe them', async () => {
        const u = await User.insert({ displayName: 'A', email: 'A@Example.com', password: await User.hashPassword('secret12') });
        expect(u.email).toBe('a@example.com');
        expect('password' in u).toBe(false);
        const plain = await User.findById(u._id);
        plain.displayName = 'B';
        await User.save(plain);
        expect(await User.comparePassword(await User.findById(u._id, { secrets: true }), 'secret12')).toBe(true);
    });

    it('turns unique-constraint failures into DuplicateError', async () => {
        await User.insert({ displayName: 'A', email: 'a@example.com' });
        await expect(User.insert({ displayName: 'B', email: 'A@example.com' })).rejects.toMatchObject({ name: 'DuplicateError' });
    });

    it('imports existing records with their ids, skipping the rules for new ones', async () => {
        const id = newId();
        await TravelDestination.insertMany([{ _id: id, title: 'Legacy', location: 'Goa', price: 0, duration: { days: 2, nights: 1 }, validity: 'not a date', createdAt: '2024-01-02T00:00:00.000Z' }], { trusted: true });
        const t = await TravelDestination.findById(id);
        expect(t).toMatchObject({ _id: id, title: 'Legacy' });
        expect(t.validity).toBeUndefined();
        expect(t.createdAt.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });

    it('matches whole words in SQL and JavaScript the same way', async () => {
        await TravelDestination.insert(tour());
        const count = async (phrase) => {
            const { sql, args } = wordMatch('location', phrase);
            return (await db.get(`SELECT COUNT(*) AS n FROM tours WHERE ${sql}`, args)).n;
        };
        expect(await count('Japan')).toBe(1);
        expect(await count('japan')).toBe(1);
        expect(await count('Jap')).toBe(0);
        expect(await count('Kyoto, Japan')).toBe(1);
        expect(wordMatchJs('Kyoto, Japan', 'Japan')).toBe(true);
        expect(wordMatchJs('Japanese Alps', 'Japan')).toBe(false);
    });

    it('populates references, with null for records that are gone', async () => {
        const user = await User.insert({ displayName: 'Asha', email: 'asha@example.com' });
        const t = await TravelDestination.insert(tour());
        const contactInfo = { firstName: 'A', lastName: 'R', email: 'a@x.com', phone: '1' };
        const kept = await Booking.insert({ user: user._id, tour: t._id, travelDate: new Date(), numberOfTravelers: 1, contactInfo, totalAmount: 1 });
        const orphan = await Booking.insert({ user: newId(), tour: t._id, travelDate: new Date(), numberOfTravelers: 1, contactInfo, totalAmount: 1 });
        await populate([kept, orphan], 'user', User, 'displayName');
        expect(kept.user).toEqual({ _id: user._id, displayName: 'Asha' });
        expect(orphan.user).toBeNull();
        // Saving a record with a loaded reference stores the id and keeps the loaded record
        kept.status = 'confirmed';
        await Booking.save(kept);
        expect(kept.user.displayName).toBe('Asha');
        expect((await db.get('SELECT user_id FROM bookings WHERE id = ?', [kept._id])).user_id).toBe(user._id);
    });

    it('fills settings from the defaults and keeps list row ids stable', async () => {
        const first = await SiteSettings.load();
        expect(first.currency.base).toBe('INR');
        const ids = first.faqs.map((f) => f._id);
        const again = await SiteSettings.update({ companyName: 'Shripad Holidays' });
        expect(again.companyName).toBe('Shripad Holidays');
        expect(again.faqs.map((f) => f._id)).toEqual(ids);
        expect(again.heroSlides[0].color).toBeTruthy();
        await expect(SiteSettings.update({ currency: { base: 'XYZ' } })).rejects.toMatchObject({ name: 'ValidationError' });
    });
});
