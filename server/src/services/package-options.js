/**
 * A tour can be sold in several lengths (each with its own price and day plan) and hotel classes
 * (each adding a fixed amount per person). Both are optional; a tour without them is priced as before.
 *
 *   packageOptions = {
 *     durations:    [{ label: '5 Nights / 6 Days', days: 6, nights: 5, price: 18999, itinerary: [{ day, activity, location }] }],
 *     hotelClasses: [{ key: 'economy', label: 'Economy', hotel: 'Hotel Willow Banks', features: '...', extraPerPerson: 0 }],
 *   }
 *
 * Prices are in the tour's own currency. The tour's price, duration and itinerary always describe the
 * cheapest choice, so cards, search, sorting and "from" prices keep working unchanged.
 */

const { newId } = require('../db/ids');

const text = (v) => String(v ?? '').trim();
const money = (v) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);

function normalizeItinerary(days, fallbackPlace) {
    return (Array.isArray(days) ? days : [])
        .filter((d) => d && (text(d.activity) || text(d.location)))
        .map((d, i) => ({ day: i + 1, activity: text(d.activity) || 'Free time', location: text(d.location) || fallbackPlace }));
}

/** Cleans what the admin form or an import sends; returns null when the tour has no choices. */
function normalizePackageOptions(input, { location = '' } = {}) {
    if (!input || typeof input !== 'object') return null;
    const fallbackPlace = text(location) || 'See itinerary';
    const durations = (Array.isArray(input.durations) ? input.durations : [])
        .filter((d) => d && text(d.label) && Number(d.days) >= 1)
        .map((d) => {
            const days = Math.max(1, Math.round(Number(d.days)));
            const nights = d.nights === undefined || d.nights === '' ? days - 1 : Math.max(0, Math.round(Number(d.nights) || 0));
            return { label: text(d.label), days, nights, price: money(d.price), itinerary: normalizeItinerary(d.itinerary, fallbackPlace) };
        });
    const seen = new Set();
    const hotelClasses = (Array.isArray(input.hotelClasses) ? input.hotelClasses : [])
        .filter((h) => h && text(h.label))
        .map((h) => {
            let key = text(h.key || h.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'class';
            while (seen.has(key)) key += '-2';
            seen.add(key);
            return { key, label: text(h.label), hotel: text(h.hotel), features: text(h.features), extraPerPerson: money(h.extraPerPerson) };
        });
    if (!durations.length && !hotelClasses.length) return null;
    return { durations, hotelClasses };
}

/** The problems that stop a live tour's choices being saved (keyed like the other field errors). */
function packageOptionsErrors(options) {
    if (!options) return null;
    if (options.durations.some((d) => d.price < 1)) return 'Every trip length needs a price';
    if (options.durations.some((d) => !d.itinerary.length)) return 'Every trip length needs its day plan';
    return null;
}

/** Sets the tour's own price, duration and itinerary to the cheapest choice. */
function applyCheapestChoice(tour) {
    const options = tour.packageOptions;
    if (!options) return tour;
    // With hotel classes only, the tour's price stays the base the classes add to
    const cheapestHotel = options.hotelClasses.length ? Math.min(...options.hotelClasses.map((h) => h.extraPerPerson)) : 0;
    if (options.durations.length) {
        const cheapest = options.durations.reduce((a, b) => (b.price < a.price ? b : a));
        tour.price = cheapest.price + cheapestHotel;
        tour.duration = { days: cheapest.days, nights: cheapest.nights };
        // Saved after the field casts run, so the days get their item ids here
        tour.itinerary = cheapest.itinerary.map((d) => ({ ...d, _id: newId() }));
    }
    return tour;
}

class ChoiceError extends Error {
    constructor(message) {
        super(message);
        this.status = 400;
    }
}

/**
 * The per-person price (tour currency) and a record of what was picked. `choice` is
 * { duration: label or index, hotelClass: key }; anything missing falls back to the cheapest.
 */
function resolveChoice(tour, choice = {}) {
    const options = tour.packageOptions;
    if (!options) return { unitPrice: Number(tour.price) || 0, packageChoice: null };

    let duration = null;
    if (options.durations.length) {
        const want = choice?.duration;
        if (want === undefined || want === null || want === '') {
            duration = options.durations.reduce((a, b) => (b.price < a.price ? b : a));
        } else {
            duration = typeof want === 'number' || /^\d+$/.test(String(want))
                ? options.durations[Number(want)]
                : options.durations.find((d) => d.label === String(want));
            if (!duration) throw new ChoiceError('That trip length is no longer offered. Please pick another.');
        }
    }

    let hotel = null;
    if (options.hotelClasses.length) {
        const want = choice?.hotelClass;
        hotel = want
            ? options.hotelClasses.find((h) => h.key === String(want))
            : options.hotelClasses.reduce((a, b) => (b.extraPerPerson < a.extraPerPerson ? b : a));
        if (!hotel) throw new ChoiceError('That hotel class is no longer offered. Please pick another.');
    }

    const base = duration ? duration.price : Number(tour.price) || 0;
    return {
        unitPrice: money(base + (hotel ? hotel.extraPerPerson : 0)),
        packageChoice: {
            ...(duration && { duration: duration.label, days: duration.days, nights: duration.nights }),
            ...(hotel && { hotelClass: hotel.key, hotelLabel: hotel.label, hotel: hotel.hotel }),
        },
    };
}

module.exports = { normalizePackageOptions, packageOptionsErrors, applyCheapestChoice, resolveChoice, ChoiceError };
