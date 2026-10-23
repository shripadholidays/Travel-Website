import type { Tone } from "@/components/admin/AdminUI";
import type { Tour } from "@/types";

export type TourStatus = NonNullable<Tour["status"]>;

/** The words staff see for each tour status (the API keeps active/draft/inactive). */
export const TOUR_STATUS: Record<TourStatus, { label: string; tone: Tone; help: string }> = {
    active: { label: "Live", tone: "green", help: "On the site and bookable" },
    draft: { label: "Draft", tone: "amber", help: "Being prepared. Only staff can preview it" },
    inactive: { label: "Hidden", tone: "slate", help: "Taken off the site. Past bookings are kept" },
};

export const usd = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
