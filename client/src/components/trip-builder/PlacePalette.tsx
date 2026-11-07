import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Ban, Check, GripVertical, Plane, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { placeFit, seasonOf, type BuilderPlace, type DraftStop, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { thumb, type DragData } from "./shared";

const ABROAD = "Abroad";
const NEARBY = "Goes with my trip";
type Fit = ReturnType<typeof placeFit>;
const groupOf = (p: BuilderPlace) => (p.country === "India" ? p.region : ABROAD);

interface Props {
    places: BuilderPlace[];
    catalogue: TripBuilderCatalogue;
    stops: DraftStop[];
    /** How many times each place is already in the trip */
    inTrip: Map<string, number>;
    onAdd: (place: BuilderPlace) => void;
    full: boolean;
}

/** The places travellers drag (or tap +) into their route */
export function PlacePalette({ places, catalogue, stops, inTrip, onAdd, full }: Props) {
    const [search, setSearch] = useState("");
    const [group, setGroup] = useState("All");
    const currency = catalogue.currency;
    // How each place fits the trip so far: same region, a second region, or too far
    const fits = useMemo(() => new Map(places.map((p) => [p.id, placeFit(catalogue, stops, p)])), [places, catalogue, stops]);
    const hasTrip = stops.length > 0;
    const active = group === NEARBY && !hasTrip ? "All" : group;

    // Regions in the order they first appear, abroad last
    const groups = useMemo(() => {
        const seen = [...new Set(places.map(groupOf))].filter((g) => g !== ABROAD);
        return ["All", ...(hasTrip ? [NEARBY] : []), ...seen.sort(), ...(places.some((p) => groupOf(p) === ABROAD) ? [ABROAD] : [])];
    }, [places, hasTrip]);

    const q = search.trim().toLowerCase();
    const shown = places.filter((p) =>
        (active === "All" || (active === NEARBY ? fits.get(p.id) === "fits" : groupOf(p) === active)) &&
        (!q || `${p.name} ${p.region} ${p.country} ${p.activities.map((a) => a.title).join(" ")}`.toLowerCase().includes(q)));

    return (
        <section aria-labelledby="places-heading" className="flex flex-col min-h-0">
            <div className="flex items-baseline justify-between gap-2 mb-3">
                <h2 id="places-heading" className="font-semibold text-slate-900">Places</h2>
                <p className="text-xs text-muted-foreground">Drag into your route or tap +</p>
            </div>
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search places or things to do"
                    aria-label="Search places"
                    className="pl-9 h-10 rounded-xl"
                />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 mb-1 [scrollbar-width:none]" role="group" aria-label="Filter by region">
                {groups.map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => setGroup(g)}
                        aria-pressed={active === g}
                        className={cn(
                            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            active === g ? "bg-brand-blue text-white" : g === NEARBY ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                        )}
                    >
                        {g}
                    </button>
                ))}
            </div>
            <ul className="space-y-2 overflow-y-auto lg:max-h-[calc(100svh-17rem)] pr-1 -mr-1">
                {shown.map((p) => (
                    <PlaceCard key={p.id} place={p} currency={currency} count={inTrip.get(p.id) ?? 0} onAdd={() => onAdd(p)} full={full} fit={fits.get(p.id) ?? "fits"} minNights={catalogue.multiRegionMinNights ?? 10} />
                ))}
                {shown.length === 0 && (
                    <li className="text-sm text-muted-foreground text-center py-8">No places match "{search}".</li>
                )}
            </ul>
        </section>
    );
}

function PlaceCard({ place, currency, count, onAdd, full, fit, minNights }: {
    place: BuilderPlace; currency: string; count: number; onAdd: () => void; full: boolean; fit: Fit; minNights: number;
}) {
    const { formatPrice } = useCurrency();
    const data: DragData = { type: "place", placeId: place.id };
    const blocked = full || fit === "too-far";
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `place:${place.id}`, data, disabled: blocked });
    const peakNow = seasonOf(place, new Date().getMonth() + 1);

    return (
        <li>
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                aria-label={`${place.name}. Drag into your route.`}
                aria-roledescription="draggable place"
                className={cn(
                    "group flex items-center gap-3 rounded-2xl bg-white p-2 pr-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.06)] transition-[box-shadow,opacity] touch-manipulation select-none",
                    blocked ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.08)]",
                    fit === "too-far" && "opacity-60",
                    isDragging && "opacity-40",
                )}
            >
                <GripVertical className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-slate-400 hidden sm:block" aria-hidden />
                <img
                    src={thumb(place.image, 160)}
                    alt=""
                    loading="lazy"
                    className="w-14 h-14 rounded-xl object-cover shrink-0 outline outline-1 -outline-offset-1 outline-black/10"
                />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 truncate">{place.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {place.country === "India" ? place.region : place.country}
                        {peakNow === "peak" && <span className="text-orange-700 font-medium"> · Peak now</span>}
                        {peakNow === "closed" && <span className="text-slate-600 font-medium"> · Closed now</span>}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums mt-0.5 whitespace-nowrap">
                        from {formatPrice(Math.min(place.offFrom || place.nightlyFrom, place.nightlyFrom), currency)}<span className="text-muted-foreground"> /night</span>
                    </p>
                    {fit === "new-region" && (
                        <p className="text-[11px] text-sky-700 mt-0.5 flex items-center gap-1" title={`Another region: needs a trip longer than ${minNights} days, with travel added`}>
                            <Plane className="w-3 h-3 shrink-0" aria-hidden /> <span className="truncate">Another region · trip of {minNights + 1}+ days</span>
                        </p>
                    )}
                    {fit === "too-far" && (
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Ban className="w-3 h-3 shrink-0" aria-hidden /> <span className="truncate">Too far for this trip</span>
                        </p>
                    )}
                </div>
                {count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[11px] font-medium shrink-0" title="In your trip">
                        <Check className="w-3 h-3" aria-hidden />
                        {count > 1 ? `×${count}` : <span className="sr-only">Added</span>}
                    </span>
                )}
                <button
                    type="button"
                    onClick={onAdd}
                    // Taps on the button must not start a drag
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={blocked}
                    aria-label={fit === "too-far" ? `${place.name} is too far from the rest of your trip` : `Add ${place.name} to your trip`}
                    className="relative w-9 h-9 shrink-0 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center transition-[background-color,scale] hover:bg-brand-orange hover:text-white active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none after:absolute after:-inset-1"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </li>
    );
}
