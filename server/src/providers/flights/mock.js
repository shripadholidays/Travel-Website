const airports = require('../data/airports.json');
const { ProviderError } = require('../errors');
const {
    hashString, seededRandom, round2, encodeOfferId, decodeOfferId, assertDate,
} = require('../util');

// Realistic-looking, fully deterministic flight offers so the UI can be built and tested
// without a supplier account. Same search → same offers; offer ids are self-describing.

const OFFER_TTL_MS = 20 * 60 * 1000;
const CABINS = { economy: 1, premium_economy: 1.65, business: 3.1 };

const AIRLINES = [
    { code: '6E', name: 'IndiGo', domestic: true, international: true, hub: 'DEL' },
    { code: 'AI', name: 'Air India', domestic: true, international: true, hub: 'DEL' },
    { code: 'QP', name: 'Akasa Air', domestic: true, international: false, hub: 'BOM' },
    { code: 'SG', name: 'SpiceJet', domestic: true, international: false, hub: 'DEL' },
    { code: 'EK', name: 'Emirates', domestic: false, international: true, hub: 'DXB' },
    { code: 'QR', name: 'Qatar Airways', domestic: false, international: true, hub: 'DOH' },
    { code: 'SQ', name: 'Singapore Airlines', domestic: false, international: true, hub: 'SIN' },
];

const byCode = new Map(airports.map((a) => [a.code, a]));

function findAirport(code) {
    const airport = byCode.get(String(code || '').toUpperCase());
    if (!airport) throw new ProviderError('UNKNOWN_AIRPORT', 400, `Unknown airport: ${code}`);
    return airport;
}

function distanceKm(a, b) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

function normalize(params) {
    const from = String(params.from || '').toUpperCase();
    const to = String(params.to || '').toUpperCase();
    findAirport(from);
    findAirport(to);
    if (from === to) throw new ProviderError('SAME_AIRPORT', 400, 'Origin and destination must differ');
    assertDate(params.departDate, 'departDate');
    const returnDate = params.returnDate || null;
    if (returnDate) {
        assertDate(returnDate, 'returnDate');
        if (returnDate < params.departDate) throw new ProviderError('INVALID_DATE', 400, 'Return must be after departure');
    }
    const adults = Number(params.adults || 1);
    if (!Number.isInteger(adults) || adults < 1 || adults > 9) {
        throw new ProviderError('INVALID_PASSENGERS', 400, 'Adults must be between 1 and 9');
    }
    const cabin = CABINS[params.cabin] ? params.cabin : 'economy';
    return { from, to, departDate: params.departDate, returnDate, adults, cabin };
}

function buildSlice(rng, airline, fromAp, toAp, date, km, stops) {
    const via = stops
        ? (airline.hub !== fromAp.code && airline.hub !== toAp.code ? airline.hub : (fromAp.country === 'IN' ? 'BOM' : 'DXB'))
        : null;
    const durationMinutes = Math.round(km / 780 * 60 + 35) + (stops ? 90 + Math.floor(rng() * 120) : 0);
    const depart = Math.floor(rng() * 288) * 5; // 5-minute grid across the day
    const arrive = depart + durationMinutes;
    return {
        from: fromAp.code,
        to: toAp.code,
        departDate: date,
        departTime: hhmm(depart),
        arriveTime: hhmm(arrive % 1440),
        arriveDayOffset: Math.floor(arrive / 1440),
        durationMinutes,
        stops,
        via,
        flightNumber: `${airline.code} ${100 + Math.floor(rng() * 1800)}`,
        _depart: depart,
    };
}

function generate(p) {
    const fromAp = findAirport(p.from);
    const toAp = findAirport(p.to);
    const international = fromAp.country !== toAp.country;
    const domesticIndia = fromAp.country === 'IN' && toAp.country === 'IN';
    const km = distanceKm(fromAp, toAp);
    const rng = seededRandom(hashString(`${p.from}|${p.to}|${p.departDate}|${p.returnDate}|${p.cabin}|${p.adults}`));
    const eligible = AIRLINES.filter((a) => (domesticIndia ? a.domestic : a.international));
    const count = 8 + Math.floor(rng() * 5);

    const offers = [];
    for (let i = 0; i < count; i += 1) {
        const airline = eligible[Math.floor(rng() * eligible.length)];
        const stops = rng() < (domesticIndia ? 0.8 : 0.5) ? 0 : 1;
        const slices = [buildSlice(rng, airline, fromAp, toAp, p.departDate, km, stops)];
        if (p.returnDate) slices.push(buildSlice(rng, airline, toAp, fromAp, p.returnDate, km, stops));

        const jitter = 0.88 + rng() * 0.37;
        const perKm = domesticIndia ? 0.065 : 0.055;
        let perAdult = (35 + km * perKm) * CABINS[p.cabin] * (stops ? 0.86 : 1) * jitter;
        if (p.returnDate) perAdult *= 1.9;
        perAdult = round2(perAdult);

        offers.push({
            kind: 'flight',
            provider: 'mock',
            airline: { code: airline.code, name: airline.name },
            cabin: p.cabin,
            baggageKg: domesticIndia ? 15 : (CABINS[p.cabin] > 1 ? 40 : 30),
            refundable: rng() < 0.6,
            fareRules: domesticIndia
                ? 'Date change ₹3,000 + fare difference. Cancellation fee applies.'
                : 'Changes allowed with fee. Refunds subject to airline policy.',
            adults: p.adults,
            international,
            slices: slices.map(({ _depart, ...s }) => s),
            supplierPerAdult: perAdult,
            supplierAmount: round2(perAdult * p.adults),
            currency: 'USD',
            _index: i,
        });
    }
    return offers;
}

function withIds(offers, params, exp) {
    return offers.map(({ _index, ...offer }) => ({
        ...offer,
        id: encodeOfferId({ k: 'f', p: params, i: _index, exp }),
        expiresAt: new Date(exp).toISOString(),
    }));
}

module.exports = {
    name: 'mock',

    async searchAirports(q) {
        const query = String(q || '').trim().toLowerCase();
        if (!query) return [];
        return airports
            .filter((a) => a.code.toLowerCase() === query
                || a.city.toLowerCase().includes(query)
                || a.name.toLowerCase().includes(query))
            .sort((a, b) => (a.code.toLowerCase() === query ? -1 : b.code.toLowerCase() === query ? 1 : 0))
            .slice(0, 10)
            .map(({ code, city, name, country }) => ({ code, city, name, country }));
    },

    async search(rawParams) {
        const params = normalize(rawParams);
        return withIds(generate(params), params, Date.now() + OFFER_TTL_MS);
    },

    async getOffer(id) {
        const payload = decodeOfferId(id);
        if (payload.k !== 'f' || !payload.p) throw new ProviderError('INVALID_OFFER', 400, 'This offer is not valid');
        if (Date.now() > payload.exp) throw new ProviderError('OFFER_EXPIRED', 410, 'This fare has expired, please search again');
        const params = normalize(payload.p);
        const offer = generate(params).find((o) => o._index === payload.i);
        if (!offer) throw new ProviderError('INVALID_OFFER', 400, 'This offer is not valid');
        const { _index, ...rest } = offer;
        return { ...rest, id, expiresAt: new Date(payload.exp).toISOString() };
    },

    async book() {
        if (process.env.MOCK_BOOK_FAIL === 'true') {
            throw new ProviderError('BOOKING_FAILED', 502, 'The airline could not confirm this booking');
        }
        return { providerRef: `WZ${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'confirmed' };
    },

    async cancel() {
        return { status: 'cancelled' };
    },
};

