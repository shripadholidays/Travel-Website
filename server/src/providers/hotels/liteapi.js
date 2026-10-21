const { ProviderError } = require('../errors');

// Placeholder for the LiteAPI sandbox integration (https://docs.liteapi.travel).
// Same interface as ./mock.js; switch with HOTEL_PROVIDER=liteapi once wired.
const notReady = async () => {
    throw new ProviderError('PROVIDER_NOT_CONFIGURED', 501, 'LiteAPI is not configured yet');
};

module.exports = {
    name: 'liteapi',
    searchPlaces: notReady,
    search: notReady,
    getHotel: notReady,
    getOffer: notReady,
    book: notReady,
    cancel: notReady,
};
