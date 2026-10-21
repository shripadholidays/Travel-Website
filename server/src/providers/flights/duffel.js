const { ProviderError } = require('../errors');

// Placeholder for the Duffel sandbox integration (https://duffel.com/docs).
// Same interface as ./mock.js; switch with FLIGHT_PROVIDER=duffel once wired.
const notReady = async () => {
    throw new ProviderError('PROVIDER_NOT_CONFIGURED', 501, 'Duffel is not configured yet');
};

module.exports = {
    name: 'duffel',
    searchAirports: notReady,
    search: notReady,
    getOffer: notReady,
    book: notReady,
    cancel: notReady,
};
