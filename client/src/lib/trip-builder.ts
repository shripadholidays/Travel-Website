// The trip builder's data and price range. The range is worked out the same way as on the
// server (server/src/services/trip-builder.js), which checks it again when a trip is sent.
import type { Tour } from "@/types";

export type ExtraPer = "person" | "person-night" | "day" | "trip";

export interface BuilderActivity { title: string; note?: string }
export interface BuilderPlace {
    id: string;
    name: string;
    region: string;
    country: string;
    image: string;
    nightlyFrom: number;
    nightlyTo: number;
    minNights: number;
    maxNights: number;
    suggestedNights: number;
    hidden?: boolean;
    activities: BuilderActivity[];
}
export interface BuilderHotelClass { key: string; label: string; extraFrom: number; extraTo: number }
export interface BuilderExtra { id: string; label: string; description: string; icon: string; priceFrom: number; priceTo: number; per: ExtraPer }
export interface TripBuilderCatalogue {
    currency: string;
    childShare: number;
    maxStops: number;
    maxNights: number;
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

export interface TripEstimate {
    currency: string;
    nights: number;
    days: number;
    people: number;
    low: number;
    high: number;
    lines: { label: string; low: number; high: number }[];
    hotelLabel?: string;
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
};

let counter = 0;
export const uid = () => `u${Date.now().toString(36)}${(counter++).toString(36)}`;

const roundDown = (n: number) => Math.floor(n / 500) * 500;
const roundUp = (n: number) => Math.ceil(n / 500) * 500;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function estimateTrip(catalogue: TripBuilderCatalogue, trip: Pick<TripDraft, "stops" | "hotelClass" | "extras" | "adults" | "children">): TripEstimate {
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const hotel = catalogue.hotelClasses.find((h) => h.key === trip.hotelClass) ?? catalogue.hotelClasses[0];
    const adults = Math.max(1, trip.adults || 1);
    const children = Math.max(0, trip.children || 0);
    const people = adults + children * catalogue.childShare;
    const stops = trip.stops.filter((s) => places.has(s.placeId));
    const nights = stops.reduce((n, s) => n + s.nights, 0);
    const days = nights > 0 ? nights + 1 : 0;

    const lines = stops.map((s) => {
        const p = places.get(s.placeId)!;
        return {
            label: `${p.name} · ${plural(s.nights, "night")}`,
            low: s.nights * (p.nightlyFrom + (hotel?.extraFrom ?? 0)) * people,
            high: s.nights * (p.nightlyTo + (hotel?.extraTo ?? 0)) * people,
        };
    });
    const units: Record<ExtraPer, number> = { person: people, "person-night": people * nights, day: days, trip: 1 };
    for (const id of trip.extras) {
        const x = catalogue.extras.find((e) => e.id === id);
        if (x) lines.push({ label: x.label, low: x.priceFrom * units[x.per], high: x.priceTo * units[x.per] });
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
