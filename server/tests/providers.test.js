const { seededRandom, encodeOfferId, decodeOfferId, TtlCache } = require('../src/providers/util');
const { withTimeout } = require('../src/providers/errors');
const { applyMarkup } = require('../src/providers/pricing');
const flights = require('../src/providers/flights/mock');
const hotels = require('../src/providers/hotels/mock');

const future = (days) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};

describe('provider utilities', () => {
    it('seeded random is deterministic', () => {
        const a = seededRandom(42);
        const b = seededRandom(42);
        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });

    it('offer ids round-trip and reject garbage', () => {
        const payload = { k: 'f', i: 3 };
        expect(decodeOfferId(encodeOfferId(payload))).toEqual(payload);
        expect(() => decodeOfferId('%%%not-an-id')).toThrow(expect.objectContaining({ code: 'INVALID_OFFER', status: 400 }));
    });

    it('applies markup with cent rounding', () => {
        expect(applyMarkup(100, 5).total).toBe(105);
        expect(applyMarkup(19.99, 8)).toEqual({
            supplierAmount: 19.99, markupPct: 8, markupAmount: 1.6, total: 21.59, currency: 'USD',
        });
    });

    it('times out slow suppliers', async () => {
        await expect(withTimeout(new Promise(() => {}), 10)).rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT', status: 504 });
    });

    it('ttl cache expires entries', () => {
        const cache = new TtlCache(-1);
        cache.set('a', 1);
        expect(cache.get('a')).toBeUndefined();
    });
});

describe('mock flights', () => {
    const params = { from: 'DEL', to: 'DXB', departDate: future(20), adults: 2, cabin: 'economy' };

    it('is deterministic and returns 8-12 offers', async () => {
        const a = await flights.search(params);
        const b = await flights.search(params);
        expect(a.length).toBeGreaterThanOrEqual(8);
        expect(a.length).toBeLessThanOrEqual(12);
        expect(a.map((o) => o.supplierAmount)).toEqual(b.map((o) => o.supplierAmount));
    });

    it('marks international routes and uses domestic airlines inside India', async () => {
        const intl = await flights.search(params);
        expect(intl.every((o) => o.international)).toBe(true);
        const dom = await flights.search({ ...params, to: 'BOM' });
        expect(dom.every((o) => !o.international)).toBe(true);
        expect(dom.every((o) => ['6E', 'AI', 'QP', 'SG'].includes(o.airline.code))).toBe(true);
    });

    it('routes foreign carriers via their hub unless the route touches it', async () => {
        const offers = await flights.search(params);
        for (const o of offers.filter((x) => ['QR', 'SQ'].includes(x.airline.code))) {
            expect(o.slices[0].stops).toBe(1);
            expect(o.slices[0].via).toBe(o.airline.code === 'QR' ? 'DOH' : 'SIN');
        }
        for (const o of offers.filter((x) => x.airline.code === 'EK')) expect(o.slices[0].stops).toBe(0);
        const roundTrip = await flights.search({ ...params, returnDate: future(27) });
        for (const o of roundTrip) {
            for (const s of o.slices) expect([s.from, s.to]).not.toContain(s.via);
        }
    });

    it('re-prices an offer identically', async () => {
        const [first] = await flights.search(params);
        const again = await flights.getOffer(first.id);
        expect(again.supplierAmount).toBe(first.supplierAmount);
        expect(again.slices).toEqual(first.slices);
    });

    it('rejects expired offers, unknown airports and same-airport searches', async () => {
        const expired = encodeOfferId({ k: 'f', p: params, i: 0, exp: Date.now() - 1 });
        await expect(flights.getOffer(expired)).rejects.toMatchObject({ code: 'OFFER_EXPIRED', status: 410 });
        await expect(flights.search({ ...params, to: 'XXX' })).rejects.toMatchObject({ status: 400 });
        await expect(flights.search({ ...params, to: 'DEL' })).rejects.toMatchObject({ code: 'SAME_AIRPORT' });
    });

    it('adds a return slice for round trips', async () => {
        const [offer] = await flights.search({ ...params, returnDate: future(27) });
        expect(offer.slices).toHaveLength(2);
        expect(offer.slices[1].from).toBe('DXB');
    });

    it('finds airports by code and city', async () => {
        expect((await flights.searchAirports('dxb'))[0].code).toBe('DXB');
        expect((await flights.searchAirports('goa')).map((a) => a.code)).toEqual(expect.arrayContaining(['GOI', 'GOX']));
    });
});

describe('mock hotels', () => {
    const stay = { checkIn: future(20), checkOut: future(24), rooms: 1, adults: 2 };

    it('returns only hotels in the searched city with nights computed', async () => {
        const offers = await hotels.search({ ...stay, place: 'Goa' });
        expect(offers.length).toBeGreaterThan(0);
        expect(offers.every((o) => o.hotel.city === 'Goa' && o.nights === 4)).toBe(true);
    });

    it('returns three room offers with a non-refundable suite', async () => {
        const hotel = await hotels.getHotel('goa-fort-aguada', stay);
        expect(hotel.roomOffers).toHaveLength(3);
        expect(hotel.roomOffers.find((r) => r.roomCode === 'STE').refundable).toBe(false);
    });

    it('re-prices offers identically and validates dates', async () => {
        const [offer] = await hotels.search({ ...stay, place: 'Jaipur' });
        expect((await hotels.getOffer(offer.id)).supplierAmount).toBe(offer.supplierAmount);
        await expect(hotels.search({ ...stay, checkOut: stay.checkIn, place: 'Goa' })).rejects.toMatchObject({ code: 'INVALID_DATES' });
    });

    it('lists places', async () => {
        expect((await hotels.searchPlaces('dub')).map((p) => p.name)).toContain('Dubai');
    });
});
