const providers = {
    mock: () => require('./mock'),
    liteapi: () => require('./liteapi'),
};

function getHotelProvider() {
    const name = (process.env.HOTEL_PROVIDER || 'mock').toLowerCase();
    return (providers[name] || providers.mock)();
}

module.exports = { getHotelProvider };
