import type { Tone } from "@/components/admin/AdminUI";
import type { Tour } from "@/types";

export type TourStatus = NonNullable<Tour["status"]>;

/** The words staff see for each tour status (the API keeps active/draft/inactive). */
export const TOUR_STATUS: Record<TourStatus, { label: string; tone: Tone; help: string }> = {
    active: { label: "Live", tone: "green", help: "On the site and bookable" },
    draft: { label: "Draft", tone: "amber", help: "Being prepared. Only staff can preview it" },
    inactive: { label: "Hidden", tone: "slate", help: "Taken off the site. Past bookings are kept" },
};

export const CURRENCY_OPTIONS = [
    { code: "INR", label: "INR · Indian rupee (₹)" },
    { code: "USD", label: "USD · US dollar ($)" },
    { code: "EUR", label: "EUR · Euro (€)" },
    { code: "GBP", label: "GBP · British pound (£)" },
    { code: "AED", label: "AED · UAE dirham" },
] as const;

/** An amount in its own currency, e.g. ₹45,000 or $1,200 (old data may hold a symbol). */
export function money(n: number, currency = "USD", decimals = 0) {
    const code = ({ "$": "USD", "₹": "INR", "€": "EUR", "£": "GBP" } as Record<string, string>)[currency] ?? currency;
    try {
        return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", { style: "currency", currency: code, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n || 0);
    } catch {
        return `${code} ${n}`;
    }
}
