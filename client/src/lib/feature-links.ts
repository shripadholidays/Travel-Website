// Keeps menus honest with the admin switches: Flights/Hotels links appear right after
// Tours when on, and any admin-entered links to them disappear when off.

export interface TravelFeatures {
    flights: boolean;
    hotels: boolean;
}

interface LinkLike {
    label: string;
    path: string;
}

const FEATURE_LINKS: { feature: keyof TravelFeatures; label: string; path: string }[] = [
    { feature: 'flights', label: 'Flights', path: '/flights' },
    { feature: 'hotels', label: 'Hotels', path: '/hotels' },
];

const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`);

export function withFeatureLinks<T extends LinkLike>(links: T[], features: TravelFeatures): T[] {
    const hidden = FEATURE_LINKS.filter((l) => !features[l.feature]).map((l) => l.path);
    const result = links.filter((link) => !hidden.some((base) => isUnder(link.path, base)));

    const toAdd = FEATURE_LINKS
        .filter((l) => features[l.feature] && !result.some((link) => isUnder(link.path, l.path)))
        .map((l) => ({ ...(result[0] ?? {}), label: l.label, path: l.path }) as T);
    if (toAdd.length === 0) return result;

    const toursIndex = result.findIndex((link) => link.path === '/tours');
    const at = toursIndex === -1 ? result.length : toursIndex + 1;
    return [...result.slice(0, at), ...toAdd, ...result.slice(at)];
}

export function addonsCopy(features: TravelFeatures): string {
    if (features.flights && features.hotels) return 'Hotels, flights & activities';
    if (features.flights) return 'Flights & activities';
    if (features.hotels) return 'Hotels & activities';
    return 'Activities & experiences';
}

/** Rewrites copy that promises hotels/flights so it matches what is actually switched on. */
export function stripTravelMentions(text: string, features: TravelFeatures): string {
    return /\b(hotels?|flights?)\b/i.test(text) ? addonsCopy(features) : text;
}
