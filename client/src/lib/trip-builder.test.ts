import { describe, expect, it } from "vitest";
import { draftFromTour, estimateTrip, moveItem, newStop, resizeStop, toPayload, type TripBuilderCatalogue } from "./trip-builder";
import type { Tour } from "@/types";

const place = (id: string, name: string, nightlyFrom: number, nightlyTo: number, activities: string[] = []) => ({
    id, name, region: "", country: "India", image: "", nightlyFrom, nightlyTo,
    minNights: 1, maxNights: 5, suggestedNights: 2, activities: activities.map((title) => ({ title })),
});
const catalogue: TripBuilderCatalogue = {
    currency: "INR", childShare: 0.5, maxStops: 8, maxNights: 30,
    places: [place("shimla", "Shimla", 3000, 4000, ["Mall Road", "Kufri"]), place("manali", "Manali", 3500, 4500, ["Solang"])],
    hotelClasses: [{ key: "economy", label: "Economy", extraFrom: 0, extraTo: 0 }, { key: "deluxe", label: "Deluxe", extraFrom: 1000, extraTo: 2000 }],
    extras: [{ id: "cab", label: "Cab", description: "", icon: "Car", priceFrom: 2000, priceTo: 3000, per: "day" }],
};
const [shimla, manali] = catalogue.places;

describe("trip builder", () => {
    it("works out the same range as the server", () => {
        const stops = [newStop(shimla, 2), newStop(manali, 3)];
        const est = estimateTrip(catalogue, { stops, hotelClass: "deluxe", extras: ["cab"], adults: 2, children: 1 });
        // 2.5 people: Shimla 2 × 4000 × 2.5 = 20000 … 2 × 6000 × 2.5 = 30000; Manali 3 × 4500 × 2.5 = 33750 … 3 × 6500 × 2.5 = 48750; cab 6 days
        expect(est).toMatchObject({ nights: 5, days: 6, people: 3, low: 65500, high: 97000, hotelLabel: "Deluxe" });
    });

    it("plans one idea a day for a new place and keeps plans when nights shrink", () => {
        const stop = newStop(shimla, 3);
        expect(stop.days.map((d) => d.map((x) => x.title))).toEqual([["Mall Road"], ["Kufri"], []]);
        const shorter = resizeStop(stop, shimla, 1);
        expect(shorter.days.map((d) => d.map((x) => x.title))).toEqual([["Mall Road", "Kufri"]]);
        expect(resizeStop(stop, shimla, 99).nights).toBe(5);
    });

    it("moves a plan between days and places", () => {
        const stops = [newStop(shimla, 2), newStop(manali, 1)];
        const kufri = stops[0].days[1][0];
        const moved = moveItem(stops, kufri.uid, { stopUid: stops[1].uid, day: 0 }, 0);
        expect(moved[0].days[1]).toEqual([]);
        expect(moved[1].days[0].map((x) => x.title)).toEqual(["Kufri", "Solang"]);
        expect(toPayload({ title: "", stops: moved, hotelClass: "economy", extras: [], adults: 2, children: 0, startDate: null, notes: "" }).stops[1].days[0])
            .toEqual([{ title: "Kufri" }, { title: "Solang" }]);
    });

    it("starts from a package's places, nights and day plans", () => {
        const tour = {
            title: "Shimla & Manali", location: "Himachal Pradesh, India", duration: { days: 5, nights: 4 },
            itinerary: [
                { day: 1, location: "Arrival Shimla", activity: "Mall Road" },
                { day: 2, location: "Kufri", activity: "Snow" },
                { day: 3, location: "Shimla to Manali", activity: "Drive" },
                { day: 4, location: "Solang Valley", activity: "Cable car" },
                { day: 5, location: "Departure", activity: "Home" },
            ],
        } as unknown as Tour;
        const draft = draftFromTour(catalogue, tour);
        expect(draft.basedOn).toBe("Shimla & Manali");
        expect(draft.stops.map((s) => [s.placeId, s.nights])).toEqual([["shimla", 2], ["manali", 2]]);
        expect(draft.stops[1].days[0][0]).toMatchObject({ title: "Shimla to Manali", note: "Drive" });
    });
});
