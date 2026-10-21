const ResponseHandler = require('../utils/response-handler');
const { getFlightProvider } = require('../providers/flights');
const { withTimeout } = require('../providers/errors');
const { TtlCache } = require('../providers/util');
const { toPublicFlight, sendProviderError } = require('../providers/public');
const { getMarkupPct } = require('../services/travel-config');

// Search results are cached for 10 minutes: faster pages and fewer (billable) supplier searches.
const searchCache = new TtlCache(10 * 60 * 1000);

// GET /flights/airports?q=
exports.airports = async (req, res) => {
    try {
        const airports = await withTimeout(getFlightProvider().searchAirports(req.query.q));
        return ResponseHandler.success(res, { airports });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to search airports');
    }
};

// GET /flights/search?from&to&departDate&returnDate&adults&cabin
exports.search = async (req, res) => {
    try {
        const { from, to, departDate, returnDate, adults, cabin } = req.query;
        const params = { from, to, departDate, returnDate: returnDate || undefined, adults: Number(adults || 1), cabin };
        const provider = getFlightProvider();
        const key = `${provider.name}:${JSON.stringify(params)}`;
        let offers = searchCache.get(key);
        if (!offers) {
            offers = await withTimeout(provider.search(params));
            searchCache.set(key, offers);
        }
        const pct = await getMarkupPct('flight');
        return ResponseHandler.success(res, { offers: offers.map((o) => toPublicFlight(o, pct)) });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to search flights');
    }
};

// GET /flights/offers/:id
exports.getOffer = async (req, res) => {
    try {
        const offer = await withTimeout(getFlightProvider().getOffer(req.params.id));
        const pct = await getMarkupPct('flight');
        return ResponseHandler.success(res, { offer: toPublicFlight(offer, pct) });
    } catch (err) {
        return sendProviderError(res, err, 'Failed to load this fare');
    }
};

exports._searchCache = searchCache;
