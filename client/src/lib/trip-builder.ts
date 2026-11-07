// The trip builder's data and price range. The range is worked out the same way as on the
// server (server/src/services/trip-builder.js), which checks it again when a trip is sent.
import type { Tour } from "@/types";

/** "flight" is a return flight to the trip and back, priced from the regions the trip visits */
export type ExtraPer = "person" | "person-night" | "day" | "trip" | "flight";
export type Season = "off" | "regular" | "peak" | "closed";

export interface BuilderActivity { title: string; note?: string }
export interface BuilderPlace {
    id: string;
    name: string;
    region: string;
    country: string;
    image: string;
    /** More photos, for the place's gallery */
    images?: string[];
    /** Regular-season price per person, per night */
    nightlyFrom: number;
    nightlyTo: number;
    /** Off-season and peak-season prices; missing means the regular price */
    offFrom?: number;
    offTo?: number;
    peakFrom?: number;
    peakTo?: number;
    /** Months 1–12; any month not listed is regular season */
    peakMonths?: number[];
    offMonths?: number[];
    closedMonths?: number[];
    seasonNote?: string;
    /** The travel regions (circuits) this place belongs to; gateway cities can be in more than one */
    zones?: string[];
    /** Visa per person for an Indian passport (one per country in a trip) */
    visaFrom?: number;
    visaTo?: number;
    minNights: number;
    maxNights: number;
    suggestedNights: number;
    hidden?: boolean;
    activities: BuilderActivity[];
}
/**
 * A travel region: places in one region combine freely. Going between regions costs a
 * flight or long train (hop, one way, per person); fare is a return flight there from a
 * major Indian city.
 */
export interface BuilderZone {
    id: string;
    label: string;
    hopFrom: number;
    hopTo: number;
    fareFrom: number;
    fareTo: number;
}
export interface BuilderHotelClass { key: string; label: string; extraFrom: number; extraTo: number }
export interface BuilderExtra { id: string; label: string; description: string; icon: string; priceFrom: number; priceTo: number; per: ExtraPer }
export interface TripBuilderCatalogue {
    currency: string;
    childShare: number;
    maxStops: number;
    maxNights: number;
    /** Trips that cover more than one region need at least this many nights */
    multiRegionMinNights?: number;
    /** The most regions one trip can cover */
    maxRegions?: number;
    zones?: BuilderZone[];
    places: BuilderPlace[];
    hotelClasses: BuilderHotelClass[];
    extras: BuilderExtra[];
}

/** One thing to do on a day; uid only lives in the browser, for dragging */
export interface PlanItem { uid: string; title: string; note?: string }
export interface DraftStop { uid: string; placeId: string; nights: number; days: PlanItem[][] }
export interface TripDraft {
    title: string;
    stops: DraftStop[];
    hotelClass: string;
    extras: string[];
    adults: number;
    children: number;
    startDate: string | null;
    notes: string;
    basedOn?: string;
}

export interface TripIssue {
    /** too-far and short and closed stop a trip being sent; zigzag is only a tip */
    kind: "too-far" | "short" | "closed" | "zigzag";
    message: string;
}
export interface TripEstimate {
    currency: string;
    nights: number;
    days: number;
    people: number;
    low: number;
    high: number;
    lines: { label: string; low: number; high: number; season?: Season | "mixed" }[];
    hotelLabel?: string;
    /** Region names the trip covers, in route order */
    regions?: string[];
    /** Whether the prices follow the travel dates (a start date is picked) */
    seasonal?: boolean;
    issues?: TripIssue[];
}

/** A trip as saved (what the dashboards show) */
export interface CustomTrip {
    _id: string;
    user?: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    title: string;
    startDate?: string | null;
    adults: number;
    children: number;
    hotelClass: string;
    stops: { placeId: string; name: string; nights: number; days: { title: string; note?: string }[][] }[];
    extras: { id: string; label: string }[];
    notes?: string;
    basedOn?: string;
    estimate: TripEstimate | null;
    status: "new" | "quoted" | "booked" | "closed";
    quote?: number | null;
    quoteNote?: string;
    staffNote?: string;
    createdAt: string;
    updatedAt: string;
}

export const PER_LABELS: Record<ExtraPer, string> = {
    person: "per person",
    "person-night": "per person, per night",
    day: "per day",
    trip: "for the trip",
    flight: "per person, by destination",
};

export const SEASON_LABELS: Record<Season, string> = { off: "Off season", regular: "Regular season", peak: "Peak season", closed: "Closed" };
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let counter = 0;
export const uid = () => `u${Date.now().toString(36)}${(counter++).toString(36)}`;

const roundDown = (n: number) => Math.floor(n / 500) * 500;
const roundUp = (n: number) => Math.ceil(n / 500) * 500;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── Seasons ─────────────────────────────────────────────────────────────
// Everything from here to estimateTrip is mirrored in server/src/services/trip-builder.js.

/** The season a place is in during a month (1–12) */
export function seasonOf(place: BuilderPlace, month: number): Season {
    if (place.closedMonths?.includes(month)) return "closed";
    if (place.peakMonths?.includes(month)) return "peak";
    if (place.offMonths?.includes(month)) return "off";
    return "regular";
}

/** Price per person, per night in a season */
export function nightPrice(place: BuilderPlace, season: Season): [number, number] {
    if (season === "off" && place.offFrom && place.offTo) return [place.offFrom, place.offTo];
    if (season === "peak" && place.peakFrom && place.peakTo) return [place.peakFrom, place.peakTo];
    return [place.nightlyFrom, place.nightlyTo];
}

/** The month (1–12) of each night of the trip, from a yyyy-mm-dd start date */
export function nightMonths(startDate: string | null | undefined, nights: number): number[] | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate ?? "");
    if (!m) return null;
    const start = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Array.from({ length: nights }, (_, i) => new Date(start + i * 864e5).getUTCMonth() + 1);
}

// ── Regions ─────────────────────────────────────────────────────────────

/** A place with no region set is a region of its own */
const zonesOf = (place: BuilderPlace) => (place.zones?.length ? place.zones : [`~${place.id}`]);

/**
 * The fewest regions that cover every place, preferring the catalogue's region order.
 * Returns up to 3 region ids; more than 3 comes back as 4 ids or more (the trip is too spread out anyway).
 */
export function coverRegions(catalogue: TripBuilderCatalogue, places: BuilderPlace[]): string[] {
    if (!places.length) return [];
    const order = [...(catalogue.zones ?? []).map((z) => z.id)];
    for (const p of places) for (const z of zonesOf(p)) if (!order.includes(z)) order.push(z);
    const sets = places.map((p) => new Set(zonesOf(p)));
    const covers = (ids: string[]) => sets.every((s) => ids.some((id) => s.has(id)));
    const used = order.filter((id) => sets.some((s) => s.has(id)));
    for (const a of used) if (covers([a])) return [a];
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) if (covers([used[i], used[j]])) return [used[i], used[j]];
    for (let i = 0; i < used.length; i++) for (let j = i + 1; j < used.length; j++) for (let k = j + 1; k < used.length; k++) {
        if (covers([used[i], used[j], used[k]])) return [used[i], used[j], used[k]];
    }
    // Four or more: one region per place that is not covered yet, enough to say "too spread out"
    const out: string[] = [];
    for (const s of sets) if (!out.some((id) => s.has(id))) out.push([...s][0]);
    return out;
}

export interface RoutePlan {
    /** Region ids in the order the route first reaches them */
    regions: string[];
    /** Moves between regions, between stop index and stop index + 1 */
    hops: { after: number; from: string; to: string }[];
}

/** Which regions the route covers, and where it travels from one to the next */
export function planRoute(catalogue: TripBuilderCatalogue, stops: { placeId: string }[]): RoutePlan {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const list = stops.map((s) => places.get(s.placeId)).filter((p): p is BuilderPlace => !!p);
    const cover = coverRegions(catalogue, list);
    // Runs of stops that share a region; a gateway city joins the run it sits in
    const runs: { zone: string; end: number }[] = [];
    let current: string[] = [];
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

/** What adding a place would do to the trip: fit in, open a second region, or spread it too far */
export function placeFit(catalogue: TripBuilderCatalogue, stops: { placeId: string }[], place: BuilderPlace): "fits" | "new-region" | "too-far" {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const list = stops.map((s) => places.get(s.placeId)).filter((p): p is BuilderPlace => !!p);
    if (!list.length) return "fits";
    const before = coverRegions(catalogue, list).length;
    const after = coverRegions(catalogue, [...list, place]).length;
    if (after <= before) return "fits";
    return after > (catalogue.maxRegions ?? 2) ? "too-far" : "new-region";
}

export const zoneLabel = (catalogue: TripBuilderCatalogue, id: string) =>
    catalogue.zones?.find((z) => z.id === id)?.label ?? catalogue.places.find((p) => `~${p.id}` === id)?.name ?? id;

const listWords = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

/** Things that stop a trip being sent (and one tip), worded for the traveller */
export function tripIssues(
    catalogue: TripBuilderCatalogue,
    trip: { stops: { placeId: string; nights: number }[]; startDate?: string | null },
): TripIssue[] {
    const issues: TripIssue[] = [];
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const stops = trip.stops.filter((s) => places.has(s.placeId));
    if (!stops.length) return issues;
    const { regions, hops } = planRoute(catalogue, stops);
    const names = regions.map((id) => zoneLabel(catalogue, id));
    const maxRegions = catalogue.maxRegions ?? 2;
    const minNights = catalogue.multiRegionMinNights ?? 10;
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    if (regions.length > maxRegions) {
        issues.push({ kind: "too-far", message: `This trip covers ${regions.length} regions (${listWords(names)}), which are too far apart for one holiday. Keep it to ${maxRegions === 1 ? "one region" : `${maxRegions} regions`}.` });
    } else if (regions.length > 1 && nights < minNights) {
        issues.push({ kind: "short", message: `${listWords(names)} are far apart. A trip covering more than one region must be longer than ${minNights} days: add ${plural(minNights - nights, "more night")}.` });
    }
    if (hops.length > Math.max(0, regions.length - 1)) {
        issues.push({ kind: "zigzag", message: "Your route goes back and forth between regions. Put the places of each region together to save on travel." });
    }
    const months = nightMonths(trip.startDate, nights);
    if (months) {
        let night = 0;
        for (const s of stops) {
            const place = places.get(s.placeId)!;
            const shut = [...new Set(months.slice(night, night + s.nights).filter((m) => seasonOf(place, m) === "closed"))];
            if (shut.length) {
                issues.push({ kind: "closed", message: `${place.name} is usually closed to visitors in ${listWords(shut.map((m) => MONTH_NAMES[m - 1]))}${place.seasonNote ? ` (${place.seasonNote})` : ""}. Pick other dates or remove it.` });
            }
            night += s.nights;
        }
    }
    return issues;
}

/** Issues that mean a trip cannot be sent yet */
export const blocking = (issues: TripIssue[] = []) => issues.filter((i) => i.kind !== "zigzag");

// ── The budget ──────────────────────────────────────────────────────────

export function estimateTrip(
    catalogue: TripBuilderCatalogue,
    trip: Pick<TripDraft, "stops" | "hotelClass" | "extras" | "adults" | "children"> & { startDate?: string | null },
): TripEstimate {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const zones = new Map((catalogue.zones ?? []).map((z) => [z.id, z]));
    const hotel = catalogue.hotelClasses.find((h) => h.key === trip.hotelClass) ?? catalogue.hotelClasses[0];
    const adults = Math.max(1, trip.adults || 1);
    const children = Math.max(0, trip.children || 0);
    const people = adults + children * catalogue.childShare;
    // Flights and visas cost the same for a child
    const heads = adults + children;
    const stops = trip.stops.filter((s) => places.has(s.placeId));
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    const days = nights > 0 ? nights + 1 : 0;
    const months = nightMonths(trip.startDate, nights);

    const lines: TripEstimate["lines"] = [];
    let night = 0;
    for (const s of stops) {
        const p = places.get(s.placeId)!;
        let low = 0;
        let high = 0;
        const seasons = new Set<Season>();
        for (let i = 0; i < s.nights; i++) {
            const season = months ? seasonOf(p, months[night + i]) : "regular";
            seasons.add(season);
            const [from, to] = nightPrice(p, season);
            low += (from + (hotel?.extraFrom ?? 0)) * people;
            high += (to + (hotel?.extraTo ?? 0)) * people;
        }
        night += s.nights;
        const season = seasons.size === 1 ? [...seasons][0] : "mixed";
        const tag = !months ? "" : season === "mixed" ? " · mixed seasons" : season === "regular" ? "" : ` · ${SEASON_LABELS[season].toLowerCase()}`;
        lines.push({ label: `${p.name} · ${plural(s.nights, "night")}${tag}`, low, high, ...(months ? { season } : {}) });
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
    const visas = new Map<string, BuilderPlace>();
    for (const s of stops) {
        const p = places.get(s.placeId)!;
        if ((p.visaTo ?? 0) > 0 && !visas.has(p.country)) visas.set(p.country, p);
    }
    for (const [country, p] of visas) lines.push({ label: `Visa · ${country}`, low: (p.visaFrom ?? 0) * heads, high: (p.visaTo ?? 0) * heads });

    // A return flight: out to where the trip starts, home from where it ends
    const first = zones.get(regions[0]);
    const last = zones.get(regions[regions.length - 1]);
    const fare = (k: "fareFrom" | "fareTo") => ((first?.[k] ?? 0) + (last?.[k] ?? 0)) / 2;
    const units: Record<Exclude<ExtraPer, "flight">, number> = { person: people, "person-night": people * nights, day: days, trip: 1 };
    for (const id of trip.extras) {
        const x = catalogue.extras.find((e) => e.id === id);
        if (!x) continue;
        if (x.per === "flight") {
            lines.push({ label: x.label, low: Math.max(x.priceFrom, fare("fareFrom")) * heads, high: Math.max(x.priceTo, fare("fareTo")) * heads });
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
        hotelLabel: hotel?.label,
        regions: regions.map((id) => zoneLabel(catalogue, id)),
        seasonal: !!months,
        issues: tripIssues(catalogue, { stops, startDate: trip.startDate }),
    };
}

export const emptyDraft = (catalogue?: TripBuilderCatalogue): TripDraft => ({
    title: "",
    stops: [],
    hotelClass: catalogue?.hotelClasses[1]?.key ?? catalogue?.hotelClasses[0]?.key ?? "",
    extras: [],
    adults: 2,
    children: 0,
    startDate: null,
    notes: "",
});

const clampNights = (place: BuilderPlace, n: number) => Math.min(place.maxNights, Math.max(place.minNights, Math.round(n)));

/** A new stop with the place's suggested nights, one of its ideas planned on each day */
export function newStop(place: BuilderPlace, nights = place.suggestedNights): DraftStop {
    const n = clampNights(place, nights);
    return {
        uid: uid(),
        placeId: place.id,
        nights: n,
        days: Array.from({ length: n }, (_, i) => (place.activities[i] ? [{ uid: uid(), ...place.activities[i] }] : [])),
    };
}

/** Changes a stop's nights; plans on days that go away move to its last remaining day */
export function resizeStop(stop: DraftStop, place: BuilderPlace, nights: number): DraftStop {
    const n = clampNights(place, nights);
    if (n === stop.nights) return stop;
    const days = stop.days.slice(0, n).map((d) => [...d]);
    while (days.length < n) days.push([]);
    const dropped = stop.days.slice(n).flat();
    if (dropped.length) days[n - 1] = [...days[n - 1], ...dropped];
    return { ...stop, nights: n, days };
}

export interface DaySlot { stopUid: string; day: number }

/** Moves a plan to another day (or another place in the same day) */
export function moveItem(stops: DraftStop[], itemUid: string, to: DaySlot, index?: number): DraftStop[] {
    const moved = stops.flatMap((s) => s.days.flat()).find((x) => x.uid === itemUid);
    if (!moved) return stops;
    // Taken out first, then put in at the index: within a day this lands it where it was dropped
    const next = stops.map((s) => ({ ...s, days: s.days.map((d) => d.filter((x) => x.uid !== itemUid)) }));
    return insertItem(next, moved, to, index);
}

export function insertItem(stops: DraftStop[], item: PlanItem, to: DaySlot, index?: number): DraftStop[] {
    return stops.map((s) => {
        if (s.uid !== to.stopUid) return s;
        return {
            ...s,
            days: s.days.map((d, di) => {
                if (di !== to.day) return d;
                const copy = [...d];
                copy.splice(index === undefined ? copy.length : Math.max(0, Math.min(index, copy.length)), 0, item);
                return copy;
            }),
        };
    });
}

export const removeItem = (stops: DraftStop[], itemUid: string) =>
    stops.map((s) => ({ ...s, days: s.days.map((d) => d.filter((x) => x.uid !== itemUid)) }));

/** The day with the fewest plans at a stop, for "add" buttons */
export function quietestDay(stop: DraftStop) {
    let best = 0;
    stop.days.forEach((d, i) => { if (d.length < stop.days[best].length) best = i; });
    return best;
}

/** What gets sent to the server */
export function toPayload(draft: TripDraft) {
    return {
        title: draft.title.trim(),
        adults: draft.adults,
        children: draft.children,
        hotelClass: draft.hotelClass,
        extras: draft.extras,
        startDate: draft.startDate,
        notes: draft.notes.trim(),
        basedOn: draft.basedOn,
        stops: draft.stops.map((s) => ({
            placeId: s.placeId,
            nights: s.nights,
            days: s.days.map((d) => d.map(({ title, note }) => (note ? { title, note } : { title }))),
        })),
    };
}

/** Words that name a place in itinerary text: "Dharamshala & McLeod Ganj" → Dharamshala, McLeod Ganj */
const placeWords = (p: BuilderPlace) =>
    p.name.split(/\s*(?:&|,|\(|\))\s*/).map((w) => w.trim().toLowerCase()).filter((w) => w.length > 2);

/**
 * Starts a trip from a package: its places in the order the itinerary visits them, nights
 * from the days spent in each, and the package's own day plans.
 */
export function draftFromTour(catalogue: TripBuilderCatalogue, tour: Tour): TripDraft {
    const draft = { ...emptyDraft(catalogue), basedOn: tour.title, title: tour.title };
    const days = tour.itinerary ?? [];
    const visible = catalogue.places.filter((p) => !p.hidden);
    const lastMention = (p: BuilderPlace, text: string) => Math.max(...placeWords(p).map((w) => text.toLowerCase().lastIndexOf(w)));
    const matches = (p: BuilderPlace, text: string) => lastMention(p, text) >= 0;
    // "Shimla to Manali" is a night in Manali: the place named last wins
    const placeIn = (text: string) => visible
        .map((p) => ({ p, at: lastMention(p, text) }))
        .filter((x) => x.at >= 0)
        .sort((a, b) => b.at - a.at)[0]?.p;

    // Which place each itinerary day belongs to (a day naming none stays with the place before it)
    const owner: (BuilderPlace | undefined)[] = [];
    for (const d of days) owner.push(placeIn(d.location ?? "") ?? owner[owner.length - 1]);
    const stops: DraftStop[] = [];
    // The last day is the trip home, so it plans nothing
    days.slice(0, Math.max(1, days.length - 1)).forEach((d, i) => {
        const place = owner[i];
        if (!place) return;
        let stop = stops[stops.length - 1];
        if (!stop || stop.placeId !== place.id) {
            stop = { uid: uid(), placeId: place.id, nights: 0, days: [] };
            stops.push(stop);
        }
        stop.nights += 1;
        stop.days.push(d.location ? [{ uid: uid(), title: d.location.slice(0, 80), note: d.activity?.slice(0, 300) || undefined }] : []);
    });

    if (!stops.length) {
        // Nothing in the itinerary names a place: fall back to the tour's location
        const place = visible.find((p) => matches(p, `${tour.title} ${tour.location}`));
        if (place) stops.push(newStop(place, tour.duration?.nights || place.suggestedNights));
    }
    // Keep each stop within the nights its place allows
    draft.stops = stops.slice(0, catalogue.maxStops).map((s) => {
        const place = catalogue.places.find((p) => p.id === s.placeId)!;
        return resizeStop(s, place, s.nights);
    });
    return draft;
}
