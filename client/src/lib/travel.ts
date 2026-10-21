import type { Cabin, FlightOffer, HotelOffer } from '@/types/travel';

export const CABIN_LABELS: Record<Cabin, string> = {
    economy: 'Economy',
    premium_economy: 'Premium Economy',
    business: 'Business',
};

export function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

/** YYYY-MM-DD for today + n days (local calendar). */
export function isoDate(daysFromToday = 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysIso(date: string, days: number) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function prettyDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export type DepartureBucket = 'morning' | 'afternoon' | 'evening' | 'night';

export function departureBucket(time: string): DepartureBucket {
    const hour = Number(time.slice(0, 2));
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export function totalDuration(offer: FlightOffer) {
    return offer.slices.reduce((sum, s) => sum + s.durationMinutes, 0);
}

/** First part of a tour location ("Dubai, UAE" → "Dubai"). */
export function cityFromLocation(location?: string) {
    return (location || '').split(',')[0].trim();
}

export function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hotelLink(offer: HotelOffer, linkedBooking?: string) {
    const qs = new URLSearchParams({
        in: offer.checkIn, out: offer.checkOut, rooms: String(offer.rooms), adults: String(offer.adults),
    });
    if (linkedBooking) qs.set('linkedBooking', linkedBooking);
    return `/hotels/${offer.hotel.id}?${qs}`;
}
