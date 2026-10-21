const hotels = require('../data/hotels.json');
const { ProviderError } = require('../errors');
const {
    hashString, seededRandom, round2, encodeOfferId, decodeOfferId, assertDate, daysBetween,
} = require('../util');

// Deterministic mock hotel inventory. Offer ids encode the stay, so getOffer can re-price
// without storage; prices vary per hotel and check-in date.

const OFFER_TTL_MS = 20 * 60 * 1000;

const IMAGES = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600&auto=format&fit=crop',
];

const ROOMS = [
    { code: 'DLX', name: 'Deluxe Room', mult: 1, refundable: true },
    { code: 'PRM', name: 'Premier Room', mult: 1.35, refundable: true },
    { code: 'STE', name: 'Signature Suite', mult: 2.1, refundable: false },
];

function imagesFor(hotel) {
    const start = hashString(hotel.id) % IMAGES.length;
    return [0, 1, 2].map((i) => IMAGES[(start + i) % IMAGES.length]);
}

function summary(hotel) {
    const { basePrice, description, ...rest } = hotel;
    return { ...rest, image: imagesFor(hotel)[0] };
}

function normalize(params) {
    assertDate(params.checkIn, 'checkIn');
    assertDate(params.checkOut, 'checkOut');
    const nights = daysBetween(params.checkIn, params.checkOut);
    if (nights < 1 || nights > 30) {
        throw new ProviderError('INVALID_DATES', 400, 'Check-out must be 1 to 30 nights after check-in');
    }
    const rooms = Number(params.rooms || 1);
    const adults = Number(params.adults || 2);
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 5) throw new ProviderError('INVALID_ROOMS', 400, 'Rooms must be 1 to 5');
    if (!Number.isInteger(adults) || adults < 1 || adults > 10) throw new ProviderError('INVALID_GUESTS', 400, 'Guests must be 1 to 10');
    return { checkIn: params.checkIn, checkOut: params.checkOut, rooms, adults, nights };
}

function buildOffer(hotel, stay, room, exp) {
    const rng = seededRandom(hashString(`${hotel.id}|${stay.checkIn}|${room.code}`));
    const perNight = round2(hotel.basePrice * room.mult * (0.85 + rng() * 0.35) * stay.rooms);
    const id = encodeOfferId({
        k: 'h', h: hotel.id, r: room.code, ci: stay.checkIn, co: stay.checkOut, rm: stay.rooms, ad: stay.adults, exp,
    });
    return {
        id,
        kind: 'hotel',
        provider: 'mock',
        hotel: summary(hotel),
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        nights: stay.nights,
        rooms: stay.rooms,
        adults: stay.adults,
        roomCode: room.code,
        roomName: room.name,
        refundable: room.refundable,
        cancellationPolicy: room.refundable
            ? 'Free cancellation until 48 hours before check-in.'
            : 'Non-refundable rate. No changes after booking.',
        supplierPerNight: perNight,
        supplierAmount: round2(perNight * stay.nights),
        currency: 'USD',
        expiresAt: new Date(exp).toISOString(),
    };
}

function findHotel(id) {
    const hotel = hotels.find((h) => h.id === id);
    if (!hotel) throw new ProviderError('HOTEL_NOT_FOUND', 404, 'Hotel not found');
    return hotel;
}

module.exports = {
    name: 'mock',

    async searchPlaces(q) {
        const query = String(q || '').trim().toLowerCase();
        const places = new Map();
        for (const h of hotels) {
            if (!query || h.city.toLowerCase().includes(query) || h.country.toLowerCase().includes(query)) {
                places.set(h.city, { name: h.city, country: h.country });
            }
        }
        return [...places.values()].slice(0, 10);
    },

    async search(params) {
        const stay = normalize(params);
        const place = String(params.place || '').trim().toLowerCase();
        const exp = Date.now() + OFFER_TTL_MS;
        return hotels
            .filter((h) => place && (h.city.toLowerCase() === place || h.city.toLowerCase().includes(place)))
            .map((h) => buildOffer(h, stay, ROOMS[0], exp));
    },

    async getHotel(hotelId, params) {
        const hotel = findHotel(hotelId);
        const stay = normalize(params);
        const exp = Date.now() + OFFER_TTL_MS;
        return {
            ...summary(hotel),
            description: hotel.description,
            images: imagesFor(hotel),
            roomOffers: ROOMS.map((room) => buildOffer(hotel, stay, room, exp)),
        };
    },

    async getOffer(id) {
        const p = decodeOfferId(id);
        if (p.k !== 'h') throw new ProviderError('INVALID_OFFER', 400, 'This offer is not valid');
        if (Date.now() > p.exp) throw new ProviderError('OFFER_EXPIRED', 410, 'This rate has expired, please search again');
        const hotel = findHotel(p.h);
        const room = ROOMS.find((r) => r.code === p.r);
        if (!room) throw new ProviderError('INVALID_OFFER', 400, 'This offer is not valid');
        const stay = normalize({ checkIn: p.ci, checkOut: p.co, rooms: p.rm, adults: p.ad });
        return { ...buildOffer(hotel, stay, room, p.exp), id };
    },

    async book() {
        if (process.env.MOCK_BOOK_FAIL === 'true') {
            throw new ProviderError('BOOKING_FAILED', 502, 'The hotel could not confirm this booking');
        }
        return { providerRef: `WH${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'confirmed' };
    },

    async cancel() {
        return { status: 'cancelled' };
    },
};
