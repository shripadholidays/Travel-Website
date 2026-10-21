const ResponseHandler = require('../utils/response-handler');
const { getHotelProvider } = require('../providers/hotels');
const { withTimeout } = require('../providers/errors');
const { TtlCache } = require('../providers/util');
const { toPublicHotelOffer, sendProviderError } = require('../providers/public');
const { getMarkupPct } = require('../services/travel-config');

const searchCache = new TtlCache(10 * 60 * 1000);

const stayFrom = (q) => ({
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    rooms: Number(q.rooms || 1),
    adults: Number(q.adults || 2),
});

// GET /hotels/places?q=
exports.places = async (req, res) => {
    try {
        const places = await withTimeout(getHotelProvider().searchPlaces(req.query.q));
        return ResponseHandler.success(res, { places });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to search places');
    }
};

// GET /hotels/search?place&checkIn&checkOut&rooms&adults
exports.search = async (req, res) => {
    try {
        const params = { place: req.query.place, ...stayFrom(req.query) };
        const provider = getHotelProvider();
        const key = `${provider.name}:${JSON.stringify(params)}`;
        let offers = searchCache.get(key);
        if (!offers) {
            offers = await withTimeout(provider.search(params));
            searchCache.set(key, offers);
        }
        const pct = await getMarkupPct('hotel');
        return ResponseHandler.success(res, { offers: offers.map((o) => toPublicHotelOffer(o, pct)) });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to search hotels');
    }
};

// GET /hotels/:id?checkIn&checkOut&rooms&adults
exports.getHotel = async (req, res) => {
    try {
        const hotel = await withTimeout(getHotelProvider().getHotel(req.params.id, stayFrom(req.query)));
        const pct = await getMarkupPct('hotel');
        return ResponseHandler.success(res, {
            hotel: { ...hotel, roomOffers: hotel.roomOffers.map((o) => toPublicHotelOffer(o, pct)) },
        });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to load this hotel');
    }
};

// GET /hotels/offers/:id
exports.getOffer = async (req, res) => {
    try {
        const offer = await withTimeout(getHotelProvider().getOffer(req.params.id));
        const pct = await getMarkupPct('hotel');
        return ResponseHandler.success(res, { offer: toPublicHotelOffer(offer, pct) });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to load this rate');
    }
};

exports._searchCache = searchCache;
