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

const PER = ['person', 'person-night', 'day', 'trip', 'flight'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
        const pair = (from, to, what) => {
            const a = money(from);
            const b = money(to);
            if (!a && !b) return {};
            if (!(a > 0) || !(b >= a)) throw new TripError(`${name}: enter a ${what} price per night, with "up to" at least the "from" price, or leave both empty.`);
            return { from: a, to: b };
        };
        const off = pair(p.offFrom, p.offTo, 'off-season');
        const peak = pair(p.peakFrom, p.peakTo, 'peak-season');
        // A month sits in one season only: closed beats peak beats off
        const taken = new Set();
        const months = (list) => [...new Set((Array.isArray(list) ? list : []).map(Number))]
            .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12 && !taken.has(m) && taken.add(m))
            .sort((a, b) => a - b);
        const closedMonths = months(p.closedMonths);
        const peakMonths = months(p.peakMonths);
        const offMonths = months(p.offMonths);
        if (closedMonths.length === 12) throw new TripError(`${name} cannot be closed all year. Hide it instead.`);
        return {
            id: uniqueId(p.id || name, placeIds),
            name,
            region: text(p.region, 80),
            country: text(p.country, 80),
            image: text(p.image, 500),
            images: (Array.isArray(p.images) ? p.images : []).map((u) => text(u, 500)).filter(Boolean).slice(0, 8),
            nightlyFrom,
            nightlyTo,
            ...(off.from ? { offFrom: off.from, offTo: off.to } : {}),
            ...(peak.from ? { peakFrom: peak.from, peakTo: peak.to } : {}),
            peakMonths,
            offMonths,
            closedMonths,
            seasonNote: text(p.seasonNote, 120),
            ...(money(p.visaTo) > 0 ? { visaFrom: Math.min(money(p.visaFrom) || 0, money(p.visaTo)), visaTo: money(p.visaTo) } : {}),
            zones: [...new Set((Array.isArray(p.zones) ? p.zones : []).map((z) => slug(z)).filter(Boolean))].slice(0, 6),
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

    const zoneIds = new Set();
    const zones = (Array.isArray(input.zones) ? input.zones : []).map((z, i) => {
        const label = text(z?.label, 60);
        if (!label) throw new TripError(`Region ${i + 1} needs a name.`);
        const range = (from, to, what) => {
            const a = money(from) || 0;
            const b = money(to) || 0;
            if (b < a) throw new TripError(`${label}: the ${what} "up to" must be at least "from".`);
            return [a, b];
        };
        const [hopFrom, hopTo] = range(z.hopFrom, z.hopTo, 'travel between regions');
        const [fareFrom, fareTo] = range(z.fareFrom, z.fareTo, 'return flight');
        return { id: uniqueId(z.id || label, zoneIds), label, hopFrom, hopTo, fareFrom, fareTo };
    });
    // Places can only point at regions that exist
    for (const p of places) p.zones = p.zones.filter((id) => zoneIds.has(id));

    const childShare = Number(input.childShare);
    const whole = (v, min, max, fallback) => Math.min(max, Math.max(min, Math.round(Number(v) || fallback)));
    return {
        currency: text(input.currency, 3).toUpperCase() || DEFAULTS.currency,
        childShare: Number.isFinite(childShare) && childShare >= 0 && childShare <= 1 ? childShare : DEFAULTS.childShare,
        maxStops: Math.min(15, Math.max(1, Math.round(Number(input.maxStops) || DEFAULTS.maxStops))),
        maxNights: Math.min(60, Math.max(1, Math.round(Number(input.maxNights) || DEFAULTS.maxNights))),
        multiRegionMinNights: whole(input.multiRegionMinNights, 1, 60, DEFAULTS.multiRegionMinNights || 10),
        maxRegions: whole(input.maxRegions, 1, 5, DEFAULTS.maxRegions || 2),
        zones,
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

// Seasons, regions and the budget below mirror client/src/lib/trip-builder.ts line for line.
const SEASON_LABELS = { off: 'Off season', regular: 'Regular season', peak: 'Peak season', closed: 'Closed' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const listWords = (w) => (w.length < 2 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`);

/** The season a place is in during a month (1–12) */
function seasonOf(place, month) {
    if ((place.closedMonths || []).includes(month)) return 'closed';
    if ((place.peakMonths || []).includes(month)) return 'peak';
    if ((place.offMonths || []).includes(month)) return 'off';
    return 'regular';
}

/** Price per person, per night in a season */
function nightPrice(place, season) {
    if (season === 'off' && place.offFrom && place.offTo) return [place.offFrom, place.offTo];
    if (season === 'peak' && place.peakFrom && place.peakTo) return [place.peakFrom, place.peakTo];
    return [place.nightlyFrom, place.nightlyTo];
}

/** The month (1–12) of each night, from a start date (yyyy-mm-dd text or a Date) */
function nightMonths(startDate, nights) {
    const iso = startDate instanceof Date ? startDate.toISOString() : String(startDate || '');
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return null;
    const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Array.from({ length: nights }, (_, i) => new Date(start + i * 864e5).getUTCMonth() + 1);
}

/** A place with no region set is a region of its own */
const zonesOf = (place) => (place.zones && place.zones.length ? place.zones : [`~${place.id}`]);

/** The fewest regions that cover every place, in the catalogue's region order */
function coverRegions(catalogue, places) {
    if (!places.length) return [];
    const order = (catalogue.zones || []).map((z) => z.id);
    for (const p of places) for (const z of zonesOf(p)) if (!order.includes(z)) order.push(z);
    const sets = places.map((p) => new Set(zonesOf(p)));
    const covers = (ids) => sets.every((st) => ids.some((id) => st.has(id)));
    const used = order.filter((id) => sets.some((st) => st.has(id)));
    for (const a of used) if (covers([a])) return [a];
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) if (covers([used[i], used[j]])) return [used[i], used[j]];
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) for (let k = j + 1; k < used.length; k++) {
        if (covers([used[i], used[j], used[k]])) return [used[i], used[j], used[k]];
    }
    // Four or more: enough to say the trip is too spread out
    const out = [];
    for (const st of sets) if (!out.some((id) => st.has(id))) out.push([...st][0]);
    return out;
}

/** Which regions the route covers, and where it moves from one to the next */
function planRoute(catalogue, stops) {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const list = stops.map((s) => places.get(s.placeId)).filter(Boolean);
    const cover = coverRegions(catalogue, list);
    // Runs of stops that share a region; a gateway city joins the run it sits in
    const runs = [];
    let current = [];
    list.forEach((p, i) => {
        const here = cover.filter((z) => zonesOf(p).includes(z));
        const shared = current.filter((z) => here.includes(z));
        if (i > 0 && !shared.length) runs.push({ zone: current[0], end: i - 1 });
        current = i > 0 && shared.length ? shared : here;
    });
    if (list.length) runs.push({ zone: current[0], end: list.length - 1 });
    const hops = runs.slice(1).map((r, i) => ({ after: runs[i].end, from: runs[i].zone, to: r.zone }));
    return { regions: [...new Set(runs.map((r) => r.zone))], hops };
}

const zoneLabel = (catalogue, id) =>
    (catalogue.zones || []).find((z) => z.id === id)?.label || catalogue.places.find((p) => `~${p.id}` === id)?.name || id;

/** Things that stop a trip being sent (and one tip), worded for the traveller */
function tripIssues(catalogue, trip) {
    const issues = [];
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const stops = (trip.stops || []).filter((s) => places.has(s.placeId));
    if (!stops.length) return issues;
    const { regions, hops } = planRoute(catalogue, stops);
    const names = regions.map((id) => zoneLabel(catalogue, id));
    const maxRegions = catalogue.maxRegions ?? 2;
    const minNights = catalogue.multiRegionMinNights ?? 10;
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    if (regions.length > maxRegions) {
        issues.push({ kind: 'too-far', message: `This trip covers ${regions.length} regions (${listWords(names)}), which are too far apart for one holiday. Keep it to ${maxRegions === 1 ? 'one region' : `${maxRegions} regions`}.` });
    } else if (regions.length > 1 && nights < minNights) {
        issues.push({ kind: 'short', message: `${listWords(names)} are far apart. A trip covering more than one region must be longer than ${minNights} days: add ${plural(minNights - nights, 'more night')}.` });
    }
    if (hops.length > Math.max(0, regions.length - 1)) {
        issues.push({ kind: 'zigzag', message: 'Your route goes back and forth between regions. Put the places of each region together to save on travel.' });
    }
    const months = nightMonths(trip.startDate, nights);
    if (months) {
        let night = 0;
        for (const s of stops) {
            const place = places.get(s.placeId);
            const shut = [...new Set(months.slice(night, night + s.nights).filter((m) => seasonOf(place, m) === 'closed'))];
            if (shut.length) {
                issues.push({ kind: 'closed', message: `${place.name} is usually closed to visitors in ${listWords(shut.map((m) => MONTH_NAMES[m - 1]))}${place.seasonNote ? ` (${place.seasonNote})` : ''}. Pick other dates or remove it.` });
            }
            night += s.nights;
        }
    }
    return issues;
}

/**
 * The budget for a trip, for everyone travelling, plus the lines it is made of.
 * trip: { stops: [{ placeId, nights }], hotelClass, extras: [id], adults, children, startDate }
 */
function estimateTrip(catalogue, trip) {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const zones = new Map((catalogue.zones || []).map((z) => [z.id, z]));
    const hotel = catalogue.hotelClasses.find((h) => h.key === trip.hotelClass) || catalogue.hotelClasses[0];
    const adults = Math.max(1, Number(trip.adults) || 1);
    const children = Math.max(0, Number(trip.children) || 0);
    const people = adults + children * catalogue.childShare;
    // Flights and visas cost the same for a child
    const heads = adults + children;
    const stops = (trip.stops || []).filter((s) => places.has(s.placeId));
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    const days = nights > 0 ? nights + 1 : 0;
    const months = nightMonths(trip.startDate, nights);

    const lines = [];
    let night = 0;
    for (const s of stops) {
        const p = places.get(s.placeId);
        let low = 0;
        let high = 0;
        const seasons = new Set();
        for (let i = 0; i < s.nights; i++) {
            const season = months ? seasonOf(p, months[night + i]) : 'regular';
            seasons.add(season);
            const [from, to] = nightPrice(p, season);
            low += (from + (hotel?.extraFrom || 0)) * people;
            high += (to + (hotel?.extraTo || 0)) * people;
        }
        night += s.nights;
        const season = seasons.size === 1 ? [...seasons][0] : 'mixed';
        const tag = !months ? '' : season === 'mixed' ? ' · mixed seasons' : season === 'regular' ? '' : ` · ${SEASON_LABELS[season].toLowerCase()}`;
        lines.push({ label: `${p.name} · ${plural(s.nights, 'night')}${tag}`, low, high, ...(months ? { season } : {}) });
    }

    const { regions, hops } = planRoute(catalogue, stops);
    for (const h of hops) {
        const a = zones.get(h.from);
        const b = zones.get(h.to);
        const from = Math.max(a?.hopFrom ?? 0, b?.hopFrom ?? 0);
        const to = Math.max(a?.hopTo ?? 0, b?.hopTo ?? 0);
        if (to > 0) lines.push({ label: `Travel ${zoneLabel(catalogue, h.from)} → ${zoneLabel(catalogue, h.to)}`, low: from * heads, high: to * heads });
    }
    // One visa per country visited
    const visas = new Map();
    for (const s of stops) {
        const p = places.get(s.placeId);
        if ((p.visaTo ?? 0) > 0 && !visas.has(p.country)) visas.set(p.country, p);
    }
    for (const [country, p] of visas) lines.push({ label: `Visa · ${country}`, low: (p.visaFrom ?? 0) * heads, high: (p.visaTo ?? 0) * heads });

    // A return flight: out to where the trip starts, home from where it ends
    const first = zones.get(regions[0]);
    const last = zones.get(regions[regions.length - 1]);
    const fare = (k) => ((first?.[k] ?? 0) + (last?.[k] ?? 0)) / 2;
    const units = { person: people, 'person-night': people * nights, day: days, trip: 1 };
    for (const id of trip.extras || []) {
        const x = catalogue.extras.find((e) => e.id === id);
        if (!x) continue;
        if (x.per === 'flight') {
            lines.push({ label: x.label, low: Math.max(x.priceFrom, fare('fareFrom')) * heads, high: Math.max(x.priceTo, fare('fareTo')) * heads });
        } else {
            lines.push({ label: x.label, low: x.priceFrom * units[x.per], high: x.priceTo * units[x.per] });
        }
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
        regions: regions.map((id) => zoneLabel(catalogue, id)),
        seasonal: !!months,
        issues: tripIssues(catalogue, { stops, startDate: trip.startDate }),
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
    // A route that is too spread out, too short for its regions or in a closed season cannot be sent
    const stop = estimate.issues.find((i) => i.kind !== 'zigzag');
    if (stop) throw new TripError(stop.message);
    return { ...trip, estimate: { ...estimate, hotelLabel: hotel.label } };
}

module.exports = { DEFAULTS, TripError, normalizeCatalogue, getCatalogue, estimateTrip, normalizeTrip, tripIssues, planRoute, seasonOf };
