const ResponseHandler = require('../utils/response-handler');
const { getFeatures, featureName } = require('../services/travel-config');

// Same body as the global 404 so a switched-off service looks like it never existed.
const notFound = (res) => ResponseHandler.fail(res, 404, "Sorry, can't find that route!");

// requireFeature('flights') or requireFeature((req) => req.body.kind)
function requireFeature(nameOrResolver) {
    return async (req, res, next) => {
        try {
            const raw = typeof nameOrResolver === 'function' ? nameOrResolver(req) : nameOrResolver;
            const name = featureName(raw);
            const features = await getFeatures();
            if (!name || !features[name]) return notFound(res);
            return next();
        } catch (err) {
            return next(err);
        }
    };
}

function requireAnyFeature() {
    return async (req, res, next) => {
        try {
            const features = await getFeatures();
            if (!features.flights && !features.hotels) return notFound(res);
            return next();
        } catch (err) {
            return next(err);
        }
    };
}

module.exports = { requireFeature, requireAnyFeature, notFound };
