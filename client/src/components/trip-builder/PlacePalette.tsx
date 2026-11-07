import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Ban, Check, GripVertical, Plane, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { placeFit, seasonOf, type BuilderPlace, type DraftStop, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { StepHeading, thumb, type DragData } from "./shared";

const ALL = "all";
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

/** Step 1: the places travellers drag (or tap +) into their route */
export function PlacePalette({ places, catalogue, stops, inTrip, onAdd, full }: Props) {
    const [search, setSearch] = useState("");
    const [region, setRegion] = useState(ALL);
    const [nearby, setNearby] = useState(false);
    // How each place fits the trip so far: same region, a second region, or too far
    const fits = useMemo(() => new Map(places.map((p) => [p.id, placeFit(catalogue, stops, p)])), [places, catalogue, stops]);
    const hasTrip = stops.length > 0;
    const onlyNearby = nearby && hasTrip;

    // Travel regions that have places, in the catalogue's order
    const regions = useMemo(() => {
        const used = new Set(places.flatMap((p) => p.zones ?? []));
        return (catalogue.zones ?? []).filter((z) => used.has(z.id));
    }, [places, catalogue.zones]);

    const q = search.trim().toLowerCase();
    const shown = places.filter((p) =>
        (region === ALL || (p.zones ?? []).includes(region)) &&
        (!onlyNearby || fits.get(p.id) === "fits") &&
        (!q || `${p.name} ${p.region} ${p.country} ${p.activities.map((a) => a.title).join(" ")}`.toLowerCase().includes(q)));

    return (
        <section aria-labelledby="places-heading" className="flex flex-col min-h-0">
            <StepHeading id="places-heading" step={1} title="Pick your places" hint="Drag into your route, or tap +" />
            <div className="relative mb-2.5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search places or things to do"
                    aria-label="Search places"
                    className="pl-10 h-11 rounded-xl text-base sm:text-sm"
                />
            </div>
            <div className="flex gap-2 mb-3">
                <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger aria-label="Filter by region" className="h-10 rounded-xl text-sm flex-1 min-w-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All regions</SelectItem>
                        {regions.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasTrip && (
                    <button
                        type="button"
                        onClick={() => setNearby((n) => !n)}
                        aria-pressed={onlyNearby}
                        className={cn(
                            "shrink-0 rounded-xl px-3 h-10 text-sm font-medium transition-colors",
                            onlyNearby ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                        )}
                    >
                        Fits my trip
                    </button>
                )}
            </div>
            <ul className="space-y-2.5 overflow-y-auto lg:max-h-[calc(100svh-19rem)] pr-1 -mr-1">
                {shown.map((p) => (
                    <PlaceCard key={p.id} place={p} currency={catalogue.currency} count={inTrip.get(p.id) ?? 0} onAdd={() => onAdd(p)} full={full} fit={fits.get(p.id) ?? "fits"} minNights={catalogue.multiRegionMinNights ?? 10} />
                ))}
                {shown.length === 0 && (
                    <li className="text-sm text-muted-foreground text-center py-8 text-pretty">
                        No places match.{" "}
                        <button type="button" className="text-brand-orange font-medium hover:underline" onClick={() => { setSearch(""); setRegion(ALL); setNearby(false); }}>Show all</button>
                    </li>
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
    const season = seasonOf(place, new Date().getMonth() + 1);

    return (
        <li>
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                aria-label={`${place.name}. Drag into your route.`}
                aria-roledescription="draggable place"
                className={cn(
                    "group flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-3 shadow-sm ring-1 ring-slate-900/5 transition-[box-shadow,opacity] touch-manipulation select-none",
                    blocked ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:shadow-md",
                    fit === "too-far" && "opacity-60",
                    isDragging && "opacity-40",
                )}
            >
                <GripVertical className="size-4 shrink-0 text-slate-300 group-hover:text-slate-400 hidden sm:block" aria-hidden />
                <div className="relative shrink-0">
                    <img
                        src={thumb(place.image, 160)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="size-16 rounded-xl object-cover outline outline-1 -outline-offset-1 outline-black/10"
                    />
                    {count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white text-xs font-bold tabular-nums" title="In your trip">
                            {count > 1 ? count : <Check className="size-3.5" aria-hidden />}
                            <span className="sr-only">In your trip</span>
                        </span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base text-slate-900 leading-snug truncate">{place.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{place.country === "India" ? place.region : place.country}</p>
                    <p className="text-sm text-slate-700 tabular-nums whitespace-nowrap">
                        from {formatPrice(Math.min(place.offFrom || place.nightlyFrom, place.nightlyFrom), currency)}<span className="text-muted-foreground"> /night</span>
                    </p>
                    {season === "peak" && <p className="text-xs font-medium text-orange-700 mt-0.5">Peak season now</p>}
                    {season === "closed" && <p className="text-xs font-medium text-slate-600 mt-0.5">Closed this month</p>}
                    {fit === "new-region" && (
                        <p className="text-xs text-sky-800 mt-0.5 flex items-center gap-1" title={`Another region: needs a trip longer than ${minNights} days, with travel added`}>
                            <Plane className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">Other region · {minNights + 1}+ days</span>
                        </p>
                    )}
                    {fit === "too-far" && (
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                            <Ban className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">Too far for this trip</span>
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
                    className="relative size-10 shrink-0 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center transition-[background-color,scale] hover:bg-brand-orange hover:text-white active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none after:absolute after:-inset-1"
                >
                    <Plus className="size-5" />
                </button>
            </div>
        </li>
    );
}
