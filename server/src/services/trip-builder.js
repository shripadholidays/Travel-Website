'use strict';
/**
 * The trip builder: travellers pick places, nights, a hotel class and extras, and get a price range.
 *
 * The price list (the "catalogue") is edited in the admin area and saved in the site settings
 * under tripBuilder; until then the starting list made from the company's packages is used
 * (models/trip-builder-defaults.json). The client works the range out the same way
 * (client/src/lib/trip-builder.ts) so it can update as people drag things around; the server
 * works it out again when a trip is sent, so the saved range is always the real one.
 */
const SiteSettings = require('../models/SiteSettings');
const DEFAULTS = require('../models/trip-builder-defaults.json');

const PER = ['person', 'person-night', 'day', 'trip'];
const MAX_PLANS_PER_DAY = 8;
const MAX_ACTIVITIES = 12;

class TripError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TripError';
    }
}

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN;
};
const slug = (s) => text(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniqueId = (wanted, taken) => {
    const base = slug(wanted) || 'item';
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return id;
};

/**
 * Checks and tidies a price list from the admin editor. Throws a TripError naming the first problem.
 * Ids are kept when given (saved trips point at them) and made from the name otherwise.
 */
function normalizeCatalogue(input) {
    if (!input || typeof input !== 'object') throw new TripError('The trip builder settings are missing.');
    const placeIds = new Set();
    const places = (Array.isArray(input.places) ? input.places : []).map((p, i) => {
        const name = text(p?.name, 80);
        if (!name) throw new TripError(`Place ${i + 1} needs a name.`);
        const nightlyFrom = money(p.nightlyFrom);
        const nightlyTo = money(p.nightlyTo);
        if (!(nightlyFrom > 0) || !(nightlyTo >= nightlyFrom)) {
            throw new TripError(`${name}: enter a price per night, with "up to" at least the "from" price.`);
        }
        const minNights = Math.max(1, Math.round(Number(p.minNights) || 1));
        const maxNights = Math.max(minNights, Math.min(30, Math.round(Number(p.maxNights) || 7)));
        const activities = (Array.isArray(p.activities) ? p.activities : [])
            .map((a) => ({ title: text(a?.title, 80), note: text(a?.note, 300) }))
            .filter((a) => a.title)
            .slice(0, MAX_ACTIVITIES);
        return {
            id: uniqueId(p.id || name, placeIds),
            name,
            region: text(p.region, 80),
            country: text(p.country, 80),
            image: text(p.image, 500),
            nightlyFrom,
            nightlyTo,
            minNights,
            maxNights,
            suggestedNights: Math.min(maxNights, Math.max(minNights, Math.round(Number(p.suggestedNights) || minNights))),
            hidden: p.hidden === true,
            activities,
        };
    });
    if (!places.some((p) => !p.hidden)) throw new TripError('Add at least one place travellers can pick.');

    const hotelKeys = new Set();
    const hotelClasses = (Array.isArray(input.hotelClasses) ? input.hotelClasses : []).map((h, i) => {
        const label = text(h?.label, 40);
        if (!label) throw new TripError(`Hotel class ${i + 1} needs a name.`);
        const extraFrom = money(h.extraFrom);
        const extraTo = money(h.extraTo);
        if (!(extraFrom >= 0) || !(extraTo >= extraFrom)) throw new TripError(`${label}: the extra per night must be 0 or more, with "up to" at least "from".`);
        return { key: uniqueId(h.key || label, hotelKeys), label, extraFrom, extraTo };
    });
    if (!hotelClasses.length) throw new TripError('Add at least one hotel class.');

    const extraIds = new Set();
    const extras = (Array.isArray(input.extras) ? input.extras : []).map((x, i) => {
        const label = text(x?.label, 80);
        if (!label) throw new TripError(`Extra ${i + 1} needs a name.`);
        const priceFrom = money(x.priceFrom);
        const priceTo = money(x.priceTo);
        if (!(priceFrom >= 0) || !(priceTo >= priceFrom)) throw new TripError(`${label}: enter a price, with "up to" at least "from".`);
        return {
            id: uniqueId(x.id || label, extraIds),
            label,
            description: text(x.description, 200),
            icon: text(x.icon, 40) || 'Sparkles',
            priceFrom,
            priceTo,
            per: PER.includes(x.per) ? x.per : 'person',
        };
    });

    const childShare = Number(input.childShare);
    return {
        currency: text(input.currency, 3).toUpperCase() || DEFAULTS.currency,
        childShare: Number.isFinite(childShare) && childShare >= 0 && childShare <= 1 ? childShare : DEFAULTS.childShare,
        maxStops: Math.min(15, Math.max(1, Math.round(Number(input.maxStops) || DEFAULTS.maxStops))),
        maxNights: Math.min(60, Math.max(1, Math.round(Number(input.maxNights) || DEFAULTS.maxNights))),
        places,
        hotelClasses,
        extras,
    };
}

/** The price list travellers build from: the saved one, or the starting list. */
async function getCatalogue() {
    const settings = await SiteSettings.load();
    return settings.tripBuilder?.places?.length ? settings.tripBuilder : DEFAULTS;
}

const roundDown = (n) => Math.floor(n / 500) * 500;
const roundUp = (n) => Math.ceil(n / 500) * 500;

/**
 * The price range for a trip, for everyone travelling, plus the lines it is made of.
 * trip: { stops: [{ placeId, nights }], hotelClass, extras: [id], adults, children }
 */
function estimateTrip(catalogue, trip) {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const hotel = catalogue.hotelClasses.find((h) => h.key === trip.hotelClass) || catalogue.hotelClasses[0];
    const adults = Math.max(1, Number(trip.adults) || 1);
    const children = Math.max(0, Number(trip.children) || 0);
    const people = adults + children * catalogue.childShare;
    const stops = (trip.stops || []).filter((s) => places.has(s.placeId));
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    const days = nights > 0 ? nights + 1 : 0;

    const lines = stops.map((s) => {
        const p = places.get(s.placeId);
        return {
            label: `${p.name} · ${s.nights} night${s.nights === 1 ? '' : 's'}`,
            low: s.nights * (p.nightlyFrom + (hotel?.extraFrom || 0)) * people,
            high: s.nights * (p.nightlyTo + (hotel?.extraTo || 0)) * people,
        };
    });
    const units = { person: people, 'person-night': people * nights, day: days, trip: 1 };
    for (const id of trip.extras || []) {
        const x = catalogue.extras.find((e) => e.id === id);
        if (!x) continue;
        lines.push({ label: x.label, low: x.priceFrom * units[x.per], high: x.priceTo * units[x.per] });
    }
    const low = lines.reduce((n, l) => n + l.low, 0);
    const high = lines.reduce((n, l) => n + l.high, 0);
    return {
        currency: catalogue.currency,
        nights,
        days,
        people: adults + children,
        low: nights ? roundDown(low) : 0,
        high: nights ? roundUp(high) : 0,
        lines: lines.map((l) => ({ ...l, low: Math.round(l.low), high: Math.round(l.high) })),
    };
}

/**
 * Checks a trip sent from the builder against the price list and keeps only what it knows.
 * Throws a TripError the traveller can act on.
 */
function normalizeTrip(catalogue, input) {
    const places = new Map(catalogue.places.filter((p) => !p.hidden).map((p) => [p.id, p]));
    const raw = Array.isArray(input?.stops) ? input.stops : [];
    if (!raw.length) throw new TripError('Add at least one place to your trip.');
    if (raw.length > catalogue.maxStops) throw new TripError(`A trip can have up to ${catalogue.maxStops} places.`);

    const stops = raw.map((s) => {
        const p = places.get(s?.placeId);
        if (!p) throw new TripError('One of the places in your trip is no longer offered. Please remove it and try again.');
        const nights = Math.round(Number(s.nights));
        if (!(nights >= p.minNights && nights <= p.maxNights)) {
            throw new TripError(`${p.name}: pick between ${p.minNights} and ${p.maxNights} nights.`);
        }
        const plans = Array.isArray(s.days) ? s.days : [];
        const days = Array.from({ length: nights }, (_, i) => (Array.isArray(plans[i]) ? plans[i] : [])
            .map((a) => ({ title: text(a?.title, 80), note: text(a?.note, 300) }))
            .filter((a) => a.title)
            .slice(0, MAX_PLANS_PER_DAY)
            .map((a) => (a.note ? a : { title: a.title })));
        return { placeId: p.id, name: p.name, nights, days };
    });
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    if (nights > catalogue.maxNights) throw new TripError(`A trip can be up to ${catalogue.maxNights} nights long.`);

    const hotel = catalogue.hotelClasses.find((h) => h.key === input.hotelClass);
    if (!hotel) throw new TripError('Pick a hotel class.');
    const extras = [...new Set(Array.isArray(input.extras) ? input.extras : [])]
        .map((id) => catalogue.extras.find((x) => x.id === id))
        .filter(Boolean)
        .map((x) => ({ id: x.id, label: x.label }));

    const adults = Math.round(Number(input.adults ?? 2));
    const children = Math.round(Number(input.children ?? 0));
    if (!(adults >= 1 && adults <= 30)) throw new TripError('Adults must be between 1 and 30.');
    if (!(children >= 0 && children <= 30)) throw new TripError('Children must be between 0 and 30.');

    let startDate = null;
    if (input.startDate) {
        const d = new Date(input.startDate);
        if (Number.isNaN(d.getTime())) throw new TripError('The start date is not a valid date.');
        if (d < new Date(Date.now() - 864e5)) throw new TripError('Pick a start date in the future, or leave it flexible.');
        startDate = d;
    }

    const trip = {
        title: text(input.title, 120) || stops.map((s) => s.name).join(' → ').slice(0, 120),
        startDate,
        adults,
        children,
        hotelClass: hotel.key,
        stops,
        extras,
        notes: text(input.notes, 2000),
        basedOn: text(input.basedOn, 200),
    };
    const estimate = estimateTrip(catalogue, { ...trip, extras: extras.map((x) => x.id) });
    return { ...trip, estimate: { ...estimate, hotelLabel: hotel.label } };
}

module.exports = { DEFAULTS, TripError, normalizeCatalogue, getCatalogue, estimateTrip, normalizeTrip };
