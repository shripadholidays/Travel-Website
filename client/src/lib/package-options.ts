import type { Booking, HotelClass, PackageChoice, Tour, TripLength } from "@/types";

/** The cheapest trip length and hotel class, which is what the tour's own price describes. */
export function defaultChoice(tour?: Pick<Tour, "packageOptions"> | null): PackageChoice {
    const options = tour?.packageOptions;
    if (!options) return {};
    const durations = options.durations ?? [];
    const hotels = options.hotelClasses ?? [];
    const duration = durations.length ? durations.reduce((best, d, i) => (d.price < durations[best].price ? i : best), 0) : undefined;
    const hotel = hotels.length ? hotels.reduce((a, b) => (b.extraPerPerson < a.extraPerPerson ? b : a)) : undefined;
    return { duration, hotelClass: hotel?.key };
}

export function pickedLength(tour: Tour, choice: PackageChoice): TripLength | undefined {
    const durations = tour.packageOptions?.durations ?? [];
    return choice.duration !== undefined ? durations[choice.duration] : undefined;
}

export function pickedHotel(tour: Tour, choice: PackageChoice): HotelClass | undefined {
    return tour.packageOptions?.hotelClasses?.find((h) => h.key === choice.hotelClass);
}

/**
 * The tour as it is with this choice: its per-person price, length and day plan. Matches how the
 * server prices the booking (services/package-options.js), which has the final say.
 */
export function withChoice(tour: Tour, choice: PackageChoice): Tour {
    if (!tour.packageOptions) return tour;
    const length = pickedLength(tour, choice);
    const hotel = pickedHotel(tour, choice);
    const base = length ? length.price : tour.price;
    return {
        ...tour,
        price: base + (hotel?.extraPerPerson ?? 0),
        ...(length && { duration: { days: length.days, nights: length.nights }, itinerary: length.itinerary }),
    };
}

/** "6 Nights / 7 Days · Deluxe (Honeymoon Inn Manali)" for a booking, or "" */
export function describePackageChoice(choice?: Booking["packageChoice"]): string {
    if (!choice) return "";
    const hotel = choice.hotelLabel ? `${choice.hotelLabel}${choice.hotel ? ` (${choice.hotel})` : ""}` : "";
    return [choice.duration, hotel].filter(Boolean).join(" · ");
}
