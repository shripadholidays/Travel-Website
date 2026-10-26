import { describe, expect, it } from "vitest";
import { defaultChoice, describePackageChoice, withChoice } from "./package-options";
import type { Tour } from "@/types";

const day = (location: string) => ({ day: 1, location, activity: "" });
const tour = {
    _id: "t1", title: "Shimla & Manali", price: 18999, currency: "INR",
    duration: { days: 6, nights: 5 }, itinerary: [day("Short")],
    packageOptions: {
        durations: [
            { label: "6 Nights / 7 Days", days: 7, nights: 6, price: 22999, itinerary: [day("Long"), day("Long 2")] },
            { label: "5 Nights / 6 Days", days: 6, nights: 5, price: 18999, itinerary: [day("Short")] },
        ],
        hotelClasses: [
            { key: "deluxe", label: "Deluxe", hotel: "Honeymoon Inn", features: "", extraPerPerson: 5500 },
            { key: "economy", label: "Economy", hotel: "Willow Banks", features: "", extraPerPerson: 0 },
        ],
    },
} as unknown as Tour;

describe("package options", () => {
    it("starts on the cheapest length and hotel class, matching the tour's price", () => {
        const choice = defaultChoice(tour);
        expect(choice).toEqual({ duration: 1, hotelClass: "economy" });
        expect(withChoice(tour, choice).price).toBe(tour.price);
    });

    it("prices, lengthens and re-plans the trip for the choice", () => {
        const picked = withChoice(tour, { duration: 0, hotelClass: "deluxe" });
        expect(picked.price).toBe(22999 + 5500);
        expect(picked.duration).toEqual({ days: 7, nights: 6 });
        expect(picked.itinerary.map((d) => d.location)).toEqual(["Long", "Long 2"]);
    });

    it("leaves a tour without choices as it is", () => {
        const plain = { ...tour, packageOptions: null } as Tour;
        expect(defaultChoice(plain)).toEqual({});
        expect(withChoice(plain, { duration: 0 })).toBe(plain);
    });

    it("describes a booking's choice in one line", () => {
        expect(describePackageChoice({ duration: "5 Nights / 6 Days", hotelLabel: "Deluxe", hotel: "Honeymoon Inn" })).toBe("5 Nights / 6 Days · Deluxe (Honeymoon Inn)");
        expect(describePackageChoice(null)).toBe("");
    });
});
