import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Ban, Check, Plane, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { placeFit, seasonOf, zoneLabel, type BuilderPlace, type DraftStop, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { StepHeading, thumb, type DragData } from "./shared";

const ALL = "all";
const NEARBY = "nearby";
type Fit = ReturnType<typeof placeFit>;

interface Props {
    places: BuilderPlace[];
    catalogue: TripBuilderCatalogue;
    stops: DraftStop[];
    /** How many times each place is already in the trip */
    inTrip: Map<string, number>;
    onAdd: (place: BuilderPlace) => void;
    full: boolean;
}

/** Step 1: the places travellers drag (or tap Add) into their route, filtered by travel region */
export function PlacePalette({ places, catalogue, stops, inTrip, onAdd, full }: Props) {
    const [search, setSearch] = useState("");
    const [group, setGroup] = useState(ALL);
    // How each place fits the trip so far: same region, a second region, or too far
    const fits = useMemo(() => new Map(places.map((p) => [p.id, placeFit(catalogue, stops, p)])), [places, catalogue, stops]);
    const hasTrip = stops.length > 0;
    const active = group === NEARBY && !hasTrip ? ALL : group;

    // Filters are the travel regions, in the catalogue's order
    const filters = useMemo(() => {
        const used = new Set(places.flatMap((p) => p.zones ?? []));
        const zones = (catalogue.zones ?? []).filter((z) => used.has(z.id)).map((z) => ({ id: z.id, label: z.label }));
        return [{ id: ALL, label: "All places" }, ...(hasTrip ? [{ id: NEARBY, label: "Goes with my trip" }] : []), ...zones];
    }, [places, catalogue.zones, hasTrip]);

    const q = search.trim().toLowerCase();
    const shown = places.filter((p) =>
        (active === ALL || (active === NEARBY ? fits.get(p.id) === "fits" : (p.zones ?? []).includes(active))) &&
        (!q || `${p.name} ${p.region} ${p.country} ${p.activities.map((a) => a.title).join(" ")}`.toLowerCase().includes(q)));

    return (
        <section aria-labelledby="places-heading">
            <StepHeading id="places-heading" step={1} title="Pick your places" hint="Tap Add, or drag a place into your route below. Places in the same region go together." />
            <div className="flex flex-col gap-3 mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search places or things to do"
                        aria-label="Search places"
                        className="pl-10 h-11 rounded-xl text-base"
                    />
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by region">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setGroup(f.id)}
                            aria-pressed={active === f.id}
                            className={cn(
                                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                                active === f.id ? "bg-brand-blue text-white" : f.id === NEARBY ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-3 sm:p-4">
                <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 lg:max-h-[34rem] lg:overflow-y-auto lg:pr-1">
                    {shown.map((p) => (
                        <PlaceCard
                            key={p.id}
                            place={p}
                            regionLabel={p.zones?.[0] ? zoneLabel(catalogue, p.zones[0]) : p.region}
                            currency={catalogue.currency}
                            count={inTrip.get(p.id) ?? 0}
                            onAdd={() => onAdd(p)}
                            full={full}
                            fit={fits.get(p.id) ?? "fits"}
                            minNights={catalogue.multiRegionMinNights ?? 10}
                        />
                    ))}
                    {shown.length === 0 && (
                        <li className="col-span-full text-base text-muted-foreground text-center py-10">
                            No places match{q ? ` "${search}"` : ""}.{" "}
                            <button type="button" className="text-brand-orange font-medium hover:underline" onClick={() => { setSearch(""); setGroup(ALL); }}>Show all places</button>
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
}

function PlaceCard({ place, regionLabel, currency, count, onAdd, full, fit, minNights }: {
    place: BuilderPlace; regionLabel: string; currency: string; count: number; onAdd: () => void; full: boolean; fit: Fit; minNights: number;
}) {
    const { formatPrice } = useCurrency();
    const data: DragData = { type: "place", placeId: place.id };
    const blocked = full || fit === "too-far";
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `place:${place.id}`, data, disabled: blocked });
    const season = seasonOf(place, new Date().getMonth() + 1);
    const from = Math.min(place.offFrom || place.nightlyFrom, place.nightlyFrom);

    return (
        <li
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            aria-label={`${place.name}. Drag into your route.`}
            aria-roledescription="draggable place"
            className={cn(
                "group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition-[box-shadow,opacity] touch-manipulation select-none",
                blocked ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:shadow-md",
                fit === "too-far" && "opacity-60",
                isDragging && "opacity-40",
            )}
        >
            <div className="relative aspect-[16/9] bg-slate-100">
                <img src={thumb(place.image, 480)} alt="" loading="lazy" draggable={false} className="absolute inset-0 size-full object-cover" />
                {count > 0 && (
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-xs font-semibold">
                        <Check className="size-3.5" aria-hidden /> {count > 1 ? `In your trip ×${count}` : "In your trip"}
                    </span>
                )}
                {season === "peak" && (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 text-orange-700 px-2.5 py-1 text-xs font-semibold">Peak season now</span>
                )}
                {season === "closed" && (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 text-slate-700 px-2.5 py-1 text-xs font-semibold">Closed this month</span>
                )}
            </div>
            <div className="flex flex-1 items-end gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-900 leading-snug truncate">{place.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{place.country === "India" ? place.region : place.country}</p>
                    <p className="text-sm text-slate-700 tabular-nums mt-1">
                        from <span className="font-semibold">{formatPrice(from, currency)}</span><span className="text-muted-foreground"> a night</span>
                    </p>
                    {fit === "new-region" && (
                        <p className="text-xs text-sky-800 mt-1.5 flex items-start gap-1.5 text-pretty" title={`${regionLabel}: needs a trip longer than ${minNights} days, with travel added`}>
                            <Plane className="size-3.5 shrink-0 mt-px" aria-hidden /> Another region: trip must be {minNights + 1}+ days
                        </p>
                    )}
                    {fit === "too-far" && (
                        <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1.5">
                            <Ban className="size-3.5 shrink-0 mt-px" aria-hidden /> Too far for this trip
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    // Taps on the button must not start a drag
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={blocked}
                    aria-label={fit === "too-far" ? `${place.name} is too far from the rest of your trip` : `Add ${place.name} to your trip`}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand-orange/10 text-brand-orange px-3.5 h-9 text-sm font-semibold transition-[background-color,color,scale] hover:bg-brand-orange hover:text-white active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Plus className="size-4" aria-hidden /> Add
                </button>
            </div>
        </li>
    );
}
