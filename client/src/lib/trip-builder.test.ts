import { describe, expect, it } from "vitest";
import { draftFromTour, estimateTrip, moveItem, newStop, placeFit, planRoute, resizeStop, toPayload, tripIssues, type TripBuilderCatalogue } from "./trip-builder";
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

describe("regions and seasons", () => {
    const zoned = (id: string, zones: string[], extra: Partial<TripBuilderCatalogue["places"][number]> = {}) => ({ ...place(id, id, 1000, 2000), zones, ...extra });
    const regional: TripBuilderCatalogue = {
        ...catalogue,
        maxRegions: 2,
        multiRegionMinNights: 10,
        zones: [
            { id: "north", label: "North", hopFrom: 4000, hopTo: 8000, fareFrom: 6000, fareTo: 12000 },
            { id: "south", label: "South", hopFrom: 5000, hopTo: 10000, fareFrom: 9000, fareTo: 18000 },
            { id: "uae", label: "UAE", hopFrom: 9000, hopTo: 17000, fareFrom: 18000, fareTo: 30000 },
        ],
        places: [
            zoned("shimla", ["north"], { maxNights: 10, peakFrom: 3000, peakTo: 4000, offFrom: 500, offTo: 900, peakMonths: [5, 6], offMonths: [7, 8] }),
            zoned("delhi", ["north", "south"]),
            zoned("kochi", ["south"], { maxNights: 10 }),
            zoned("dubai", ["uae"], { visaFrom: 7000, visaTo: 10000, country: "UAE" }),
            zoned("spiti", ["north"], { closedMonths: [1], seasonNote: "roads are snowbound" }),
        ],
    };
    const s = (placeId: string, nights: number) => ({ placeId, nights });

    it("keeps one region together and says what a far place would do", () => {
        expect(planRoute(regional, [s("shimla", 2), s("delhi", 1)]).regions).toEqual(["north"]);
        const [shimla, , kochi, dubai] = regional.places;
        expect(placeFit(regional, [s("shimla", 2)], kochi)).toBe("new-region");
        expect(placeFit(regional, [s("shimla", 2), s("kochi", 2)], dubai)).toBe("too-far");
        expect(placeFit(regional, [s("kochi", 2)], shimla)).toBe("new-region");
    });

    it("needs a long trip for two regions, adds the travel, and refuses three", () => {
        const short = estimateTrip(regional, { stops: [s("shimla", 3), s("kochi", 2)] as never, hotelClass: "economy", extras: [], adults: 1, children: 0 });
        expect(short.issues?.map((i) => i.kind)).toEqual(["short"]);
        expect(short.lines.find((l) => l.label.startsWith("Travel"))).toMatchObject({ low: 5000, high: 10000 });
        const long = estimateTrip(regional, { stops: [s("shimla", 6), s("kochi", 4)] as never, hotelClass: "economy", extras: [], adults: 1, children: 0 });
        expect(long.issues).toEqual([]);
        const three = tripIssues(regional, { stops: [s("shimla", 4), s("kochi", 4), s("dubai", 4)] });
        expect(three[0].kind).toBe("too-far");
    });

    it("prices each night by its season and stops closed months", () => {
        const may = estimateTrip(regional, { stops: [s("shimla", 2)] as never, hotelClass: "economy", extras: [], adults: 1, children: 0, startDate: "2027-05-30" });
        // 30 and 31 May are peak
        expect(may.lines[0]).toMatchObject({ low: 6000, high: 8000, season: "peak" });
        const turn = estimateTrip(regional, { stops: [s("shimla", 2)] as never, hotelClass: "economy", extras: [], adults: 1, children: 0, startDate: "2027-06-30" });
        expect(turn.lines[0]).toMatchObject({ low: 3500, high: 4900, season: "mixed" });
        expect(tripIssues(regional, { stops: [s("spiti", 2)], startDate: "2027-01-10" })[0]).toMatchObject({ kind: "closed" });
    });

    it("adds a visa per country and flights for where the trip goes", () => {
        const withFlights = { ...regional, extras: [{ id: "flights", label: "Flights", description: "", icon: "Plane", priceFrom: 1000, priceTo: 2000, per: "flight" as const }] };
        const est = estimateTrip(withFlights, { stops: [s("dubai", 3)] as never, hotelClass: "economy", extras: ["flights"], adults: 2, children: 0 });
        expect(est.lines.find((l) => l.label === "Visa · UAE")).toMatchObject({ low: 14000, high: 20000 });
        expect(est.lines.find((l) => l.label === "Flights")).toMatchObject({ low: 36000, high: 60000 });
    });
});
