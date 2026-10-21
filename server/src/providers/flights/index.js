const providers = {
    mock: () => require('./mock'),
    duffel: () => require('./duffel'),
};

function getFlightProvider() {
    const name = (process.env.FLIGHT_PROVIDER || 'mock').toLowerCase();
    return (providers[name] || providers.mock)();
}

module.exports = { getFlightProvider };
