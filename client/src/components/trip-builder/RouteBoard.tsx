import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment } from "react";
import { GripVertical, MapPinned, Minus, Plane, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { zoneLabel, type BuilderPlace, type DraftStop, type RoutePlan, type TripBuilderCatalogue } from "@/lib/trip-builder";
import { StepHeading, thumb, type DragData, type DropData } from "./shared";

interface Props {
    stops: DraftStop[];
    places: Map<string, BuilderPlace>;
    catalogue: TripBuilderCatalogue;
    route: RoutePlan;
    onNights: (stopUid: string, nights: number) => void;
    onRemove: (stopUid: string) => void;
    /** A place is being dragged, so the route should invite the drop */
    placeDragging: boolean;
    /** The trip name field, shown beside the heading */
    title?: React.ReactNode;
}

/** The trip's places in order: drag to reorder, drop new places in */
export function RouteBoard({ stops, places, catalogue, route, onNights, onRemove, placeDragging, title }: Props) {
    const drop: DropData = { type: "route" };
    const { setNodeRef, isOver } = useDroppable({ id: "route", data: drop });
    // Day numbers each stop covers
    let day = 1;
    const ranges = stops.map((s) => {
        const r = [day, day + s.nights - 1];
        day += s.nights;
        return r;
    });

    return (
        <section aria-labelledby="route-heading">
            <StepHeading id="route-heading" step={2} title="Your route" hint={stops.length > 1 ? "Set the nights in each place. Drag the handle to change the order." : "Set how many nights you stay in each place."}>
                {title}
            </StepHeading>
            {route.regions.length > 0 && (
                <ul className="flex flex-wrap items-center gap-2 mb-4" aria-label="Regions this trip covers">
                    <li className="text-sm text-muted-foreground mr-1">{route.regions.length === 1 ? "Region:" : "Regions:"}</li>
                    {route.regions.map((id, i) => (
                        <li key={id} className={cn(
                            "rounded-full px-3 py-1 text-sm font-medium",
                            i === 0 ? "bg-emerald-50 text-emerald-800" : i < (catalogue.maxRegions ?? 2) ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-900",
                        )}>
                            {zoneLabel(catalogue, id)}
                        </li>
                    ))}
                </ul>
            )}
            <div
                ref={setNodeRef}
                className={cn(
                    "rounded-3xl transition-[background-color,box-shadow] duration-200",
                    stops.length === 0 ? "border-2 border-dashed p-8" : "p-1.5 -m-1.5",
                    stops.length === 0 && (isOver ? "border-brand-orange bg-orange-50/70" : placeDragging ? "border-brand-orange/50 bg-orange-50/40" : "border-slate-200"),
                    stops.length > 0 && (isOver || placeDragging) && "bg-orange-50/60 shadow-[0_0_0_2px_rgba(249,115,22,0.35)]",
                )}
            >
                {stops.length === 0 ? (
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-brand-orange flex items-center justify-center mx-auto mb-3">
                            <MapPinned className="w-6 h-6" aria-hidden />
                        </div>
                        <p className="text-lg font-semibold text-slate-900">Your route is empty</p>
                        <p className="text-base text-muted-foreground mt-1 text-pretty max-w-md mx-auto">Tap Add on a place above, or drag it here. Add as many as you like, in any order.</p>
                    </div>
                ) : (
                    <SortableContext items={stops.map((s) => `stop:${s.uid}`)} strategy={verticalListSortingStrategy}>
                        <ol className="space-y-3">
                            {stops.map((s, i) => {
                                const place = places.get(s.placeId);
                                if (!place) return null;
                                const hop = route.hops.find((h) => h.after === i);
                                return (
                                    <Fragment key={s.uid}>
                                        <StopCard
                                            stop={s}
                                            place={place}
                                            index={i}
                                            last={i === stops.length - 1 || !!hop}
                                            days={ranges[i]}
                                            onNights={(n) => onNights(s.uid, n)}
                                            onRemove={() => onRemove(s.uid)}
                                        />
                                        {hop && (
                                            <li aria-label={`Travel to ${zoneLabel(catalogue, hop.to)}`} className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-900">
                                                <Plane className="size-4 shrink-0" aria-hidden />
                                                Travel to {zoneLabel(catalogue, hop.to)} · flight or train added to your budget
                                            </li>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </ol>
                    </SortableContext>
                )}
            </div>
        </section>
    );
}

function StopCard({ stop, place, index, last, days, onNights, onRemove }: {
    stop: DraftStop; place: BuilderPlace; index: number; last: boolean; days: number[];
    onNights: (n: number) => void; onRemove: () => void;
}) {
    const data: DragData & DropData = { type: "stop", stopUid: stop.uid };
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `stop:${stop.uid}`, data });
    const style = { transform: CSS.Translate.toString(transform), transition };
    const stopKeys = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

    return (
        <li ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-10 opacity-40")}>
            {/* The line joining one stop to the next */}
            {!last && <span aria-hidden className="absolute left-[2.6rem] top-full h-3 w-0.5 bg-slate-200" />}
            <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 sm:p-3 shadow-sm ring-1 ring-slate-900/5">
                <button
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    type="button"
                    aria-label={`Move ${place.name}. Use the arrow keys after pressing space.`}
                    className="relative w-8 h-10 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-grab active:cursor-grabbing touch-none after:absolute after:-inset-1"
                >
                    <GripVertical className="w-4 h-4" />
                </button>
                <div className="relative shrink-0">
                    <img src={thumb(place.image, 160)} alt="" className="size-14 sm:size-16 rounded-xl object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                    <span className="absolute -top-2 -left-2 size-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center tabular-nums ring-2 ring-white">
                        {index + 1}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base text-slate-900 truncate">{place.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {days[0] === days[1] ? `Day ${days[0]}` : `Days ${days[0]}–${days[1]}`}
                    </p>
                </div>
                <div className="flex items-center rounded-full bg-slate-100 p-0.5" role="group" aria-label={`Nights in ${place.name}`}>
                    <button
                        type="button" {...stopKeys}
                        onClick={() => onNights(stop.nights - 1)}
                        disabled={stop.nights <= place.minNights}
                        aria-label={`One night less in ${place.name}`}
                        className="size-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-white disabled:opacity-30 transition-[background-color,scale] active:scale-[0.96]"
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-slate-800" aria-live="polite">
                        {stop.nights} {stop.nights === 1 ? "night" : "nights"}
                    </span>
                    <button
                        type="button" {...stopKeys}
                        onClick={() => onNights(stop.nights + 1)}
                        disabled={stop.nights >= place.maxNights}
                        aria-label={`One night more in ${place.name}`}
                        className="size-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-white disabled:opacity-30 transition-[background-color,scale] active:scale-[0.96]"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                <button
                    type="button" {...stopKeys}
                    onClick={onRemove}
                    aria-label={`Remove ${place.name}`}
                    className="relative w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors after:absolute after:-inset-1"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </li>
    );
}
