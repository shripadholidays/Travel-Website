import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    closestCenter, DndContext, DragOverlay, KeyboardSensor, MouseSensor, pointerWithin, rectIntersection, TouchSensor,
    useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical, Loader2, MapPinned, Package, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";
import { PlacePalette } from "@/components/trip-builder/PlacePalette";
import { RouteBoard } from "@/components/trip-builder/RouteBoard";
import { DayPlanner } from "@/components/trip-builder/DayPlanner";
import { TripSummary } from "@/components/trip-builder/TripSummary";
import { SendTripDialog } from "@/components/trip-builder/SendTripDialog";
import { thumb, useAnimatedNumber, type DragData, type DropData } from "@/components/trip-builder/shared";
import { useCurrency } from "@/context/CurrencyContext";
import { useTripBuilder } from "@/hooks/use-trip-builder";
import { useTour } from "@/hooks/use-tours";
import { cn } from "@/lib/utils";
import {
    draftFromTour, emptyDraft, estimateTrip, insertItem, moveItem, newStop, quietestDay, removeItem, resizeStop, uid,
    type BuilderActivity, type DaySlot, type TripBuilderCatalogue, type TripDraft,
} from "@/lib/trip-builder";

const STORAGE_KEY = "wandeazy.tripDraft";

// Which drops each kind of drag can land on
const ACCEPTS: Record<DragData["type"], DropData["type"][]> = {
    place: ["route", "stop"],
    stop: ["stop", "trash"],
    idea: ["day", "item"],
    item: ["day", "item", "trash"],
    extra: ["extras"],
};
// When the pointer is over several drop targets, the most precise one wins
const RANK: Partial<Record<DropData["type"], number>> = { trash: 0, item: 1, stop: 1, day: 2, route: 3, extras: 3 };

const collision: CollisionDetection = (args) => {
    const type = (args.active.data.current as DragData | undefined)?.type;
    const allowed = type ? ACCEPTS[type] : [];
    const droppableContainers = args.droppableContainers.filter((c) => allowed.includes((c.data.current as DropData | undefined)?.type as DropData["type"]));
    const scoped = { ...args, droppableContainers };
    const hits = pointerWithin(scoped);
    if (hits.length) {
        const rank = (id: string | number) => RANK[(droppableContainers.find((c) => c.id === id)?.data.current as DropData)?.type] ?? 9;
        return [...hits].sort((a, b) => rank(a.id) - rank(b.id));
    }
    // Keyboard moves have no pointer
    return type === "stop" || type === "item" ? closestCenter(scoped) : rectIntersection(scoped);
};

/** Fixes up a saved draft against the current price list (places can be removed or renamed) */
function restore(catalogue: TripBuilderCatalogue, saved: TripDraft | null): TripDraft {
    const base = emptyDraft(catalogue);
    if (!saved || !Array.isArray(saved.stops)) return base;
    const places = new Map(catalogue.places.map((p) => [p.id, p]));
    const stops = saved.stops
        .filter((s) => places.has(s.placeId))
        .map((s) => {
            const days = Array.isArray(s.days) ? s.days : [];
            return resizeStop({ ...s, uid: s.uid || uid(), days: Array.from({ length: s.nights }, (_, i) => days[i] ?? []) }, places.get(s.placeId)!, s.nights);
        });
    return {
        ...base,
        ...saved,
        stops,
        hotelClass: catalogue.hotelClasses.some((h) => h.key === saved.hotelClass) ? saved.hotelClass : base.hotelClass,
        extras: (saved.extras ?? []).filter((id) => catalogue.extras.some((x) => x.id === id)),
        startDate: saved.startDate && new Date(saved.startDate) >= new Date(new Date().setHours(0, 0, 0, 0)) ? saved.startDate : null,
    };
}

function readSaved(): TripDraft | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as TripDraft) : null;
    } catch {
        return null;
    }
}

type Panel = "places" | "trip" | "summary";
const isNarrow = () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023px)").matches;

export const TripBuilderPage = () => {
    const { data, isLoading, isError, refetch } = useTripBuilder();
    const catalogue = data?.builder;
    const [params, setParams] = useSearchParams();
    const fromTour = params.get("from") ?? "";
    const tourQuery = useTour(fromTour);
    const [draft, setDraft] = useState<TripDraft | null>(null);

    // Start from the package the traveller came from, else their last draft, else empty
    useEffect(() => {
        if (!catalogue || draft) return;
        if (fromTour) {
            if (tourQuery.isLoading) return;
            const tour = tourQuery.data?.tour;
            const next = tour ? draftFromTour(catalogue, tour) : restore(catalogue, readSaved());
            if (tour && next.stops.length === 0) toast.info("We couldn't match this package's places. Pick them from the list.");
            setDraft(next);
            setParams({}, { replace: true });
            return;
        }
        setDraft(restore(catalogue, readSaved()));
    }, [catalogue, draft, fromTour, tourQuery.isLoading, tourQuery.data, setParams]);

    // The draft survives reloads and signing in
    useEffect(() => {
        if (!draft) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
    }, [draft]);

    if (isError) {
        return (
            <Shell>
                <div className="text-center py-24">
                    <p className="text-lg font-semibold mb-2">The trip builder didn't load</p>
                    <p className="text-muted-foreground mb-6">Check your connection and try again.</p>
                    <Button onClick={() => refetch()}>Try again</Button>
                </div>
            </Shell>
        );
    }
    if (isLoading || !catalogue || !draft) {
        return (
            <Shell>
                <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground" role="status">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> Loading the trip builder…
                </div>
            </Shell>
        );
    }
    return <Builder catalogue={catalogue} draft={draft} setDraft={setDraft as React.Dispatch<React.SetStateAction<TripDraft>>} />;
};

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Build Your Own Trip"
                description="Pick your places, nights, hotels and extras, plan each day, and see a price range straight away. Our team confirms your final price within 24 hours."
            />
            <Container>{children}</Container>
        </div>
    );
}

function Builder({ catalogue, draft, setDraft }: { catalogue: TripBuilderCatalogue; draft: TripDraft; setDraft: React.Dispatch<React.SetStateAction<TripDraft>> }) {
    const { formatPrice } = useCurrency();
    const [active, setActive] = useState<DragData | null>(null);
    const [panel, setPanel] = useState<Panel>(draft.stops.length ? "trip" : "places");
    const [sending, setSending] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const places = useMemo(() => new Map(catalogue.places.map((p) => [p.id, p])), [catalogue]);
    const visiblePlaces = useMemo(() => catalogue.places.filter((p) => !p.hidden), [catalogue]);
    const estimate = useMemo(() => estimateTrip(catalogue, draft), [catalogue, draft]);
    const inTrip = useMemo(() => {
        const m = new Map<string, number>();
        draft.stops.forEach((s) => m.set(s.placeId, (m.get(s.placeId) ?? 0) + 1));
        return m;
    }, [draft.stops]);
    const full = draft.stops.length >= catalogue.maxStops;
    const tooLong = estimate.nights > catalogue.maxNights;
    const routeLabel = draft.stops.map((s) => places.get(s.placeId)?.name).filter(Boolean).join(" → ");

    const update = useCallback((changes: Partial<TripDraft>) => setDraft((d) => ({ ...d, ...changes })), [setDraft]);
    const setStops = (fn: (stops: TripDraft["stops"]) => TripDraft["stops"]) => setDraft((d) => ({ ...d, stops: fn(d.stops) }));

    const addPlace = (placeId: string, index?: number) => {
        const place = places.get(placeId);
        if (!place) return;
        if (full) { toast.error(`A trip can have up to ${catalogue.maxStops} places.`); return; }
        setStops((stops) => {
            const copy = [...stops];
            copy.splice(index ?? copy.length, 0, newStop(place));
            return copy;
        });
        if (isNarrow()) toast.success(`${place.name} added`, { action: { label: "See trip", onClick: () => setPanel("trip") } });
    };
    const removeStop = (stopUid: string) => setStops((stops) => stops.filter((s) => s.uid !== stopUid));
    const setNights = (stopUid: string, nights: number) =>
        setStops((stops) => stops.map((s) => (s.uid === stopUid ? resizeStop(s, places.get(s.placeId)!, nights) : s)));
    const addIdea = (stopUid: string, idea: BuilderActivity) =>
        setStops((stops) => {
            const stop = stops.find((s) => s.uid === stopUid);
            return stop ? insertItem(stops, { uid: uid(), ...idea }, { stopUid, day: quietestDay(stop) }) : stops;
        });
    const addOwn = (slot: DaySlot, title: string) => setStops((stops) => insertItem(stops, { uid: uid(), title }, slot));
    const toggleExtra = (id: string) => setDraft((d) => ({ ...d, extras: d.extras.includes(id) ? d.extras.filter((x) => x !== id) : [...d.extras, id] }));

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        // A short press starts a drag on phones, so the page still scrolls with a normal swipe
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragStart = (e: DragStartEvent) => {
        setActive(e.active.data.current as DragData);
        navigator.vibrate?.(8);
    };

    const onDragEnd = ({ active: a, over }: DragEndEvent) => {
        setActive(null);
        const drag = a.data.current as DragData | undefined;
        const drop = over?.data.current as DropData | undefined;
        if (!drag || !drop || !over) return;
        // Dropped on the lower half of a card: it goes after that card
        const mid = over.rect.top + over.rect.height / 2;
        const box = a.rect.current.translated;
        const after = box ? box.top + box.height / 2 > mid : false;

        if (drop.type === "trash") {
            if (drag.type === "stop") removeStop(drag.stopUid);
            if (drag.type === "item") setStops((stops) => removeItem(stops, drag.itemUid));
            return;
        }
        switch (drag.type) {
            case "place": {
                const at = drop.type === "stop" ? draft.stops.findIndex((s) => s.uid === drop.stopUid) + (after ? 1 : 0) : undefined;
                addPlace(drag.placeId, at);
                break;
            }
            case "stop":
                if (drop.type === "stop" && drop.stopUid !== drag.stopUid) {
                    setStops((stops) => arrayMove(stops, stops.findIndex((s) => s.uid === drag.stopUid), stops.findIndex((s) => s.uid === drop.stopUid)));
                }
                break;
            case "idea": {
                const item = { uid: uid(), ...drag.idea };
                if (drop.type === "day") setStops((stops) => insertItem(stops, item, drop.slot));
                if (drop.type === "item") setStops((stops) => insertItem(stops, item, drop.slot, indexIn(stops, drop) + (after ? 1 : 0)));
                break;
            }
            case "item":
                if (drop.type === "day") setStops((stops) => moveItem(stops, drag.itemUid, drop.slot));
                if (drop.type === "item" && drop.itemUid !== drag.itemUid) setStops((stops) => moveItem(stops, drag.itemUid, drop.slot, indexIn(stops, drop)));
                break;
            case "extra":
                if (drop.type === "extras" && !draft.extras.includes(drag.extraId)) toggleExtra(drag.extraId);
                break;
        }
    };

    const removable = active?.type === "stop" || active?.type === "item";

    return (
        <div className="bg-background min-h-screen pt-24 pb-36 lg:pb-16">
            <PageTitle
                title="Build Your Own Trip"
                description="Pick your places, nights, hotels and extras, plan each day, and see a price range straight away. Our team confirms your final price within 24 hours."
            />
            <Container>
                <header className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-balance">Build your own trip</h1>
                        <p className="text-muted-foreground mt-1 text-pretty max-w-xl">
                            Drag in the places you want, set the nights, plan your days. The price range updates as you go.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {draft.basedOn && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-800 pl-3 pr-1 py-1 text-xs font-medium">
                                <Package className="w-3.5 h-3.5" aria-hidden /> Based on {draft.basedOn}
                                <button type="button" onClick={() => update({ basedOn: undefined })} aria-label="Not based on a package" className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-orange-100">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/tours"><Package className="w-4 h-4 mr-1.5" aria-hidden /> Start from a package</Link>
                        </Button>
                        {draft.stops.length > 0 && (confirmReset ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                                Clear everything?
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => { setDraft(emptyDraft(catalogue)); setConfirmReset(false); setPanel("places"); }}>Yes</Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>No</Button>
                            </span>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
                                <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden /> Start over
                            </Button>
                        ))}
                    </div>
                </header>

                <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
                        <aside className={cn(panel === "places" ? "block" : "hidden", "lg:block lg:sticky lg:top-24 min-w-0")}>
                            <PlacePalette places={visiblePlaces} currency={catalogue.currency} inTrip={inTrip} onAdd={(p) => addPlace(p.id)} full={full} />
                        </aside>

                        <main className={cn(panel === "trip" ? "block" : "hidden", "lg:block space-y-8 min-w-0")}>
                            <div>
                                <label htmlFor="trip-title" className="sr-only">Trip name</label>
                                <input
                                    id="trip-title"
                                    value={draft.title}
                                    onChange={(e) => update({ title: e.target.value })}
                                    maxLength={120}
                                    placeholder={routeLabel || "Name your trip"}
                                    className="w-full bg-transparent text-xl font-semibold text-slate-900 placeholder:text-slate-400 border-b border-transparent hover:border-slate-200 focus:border-brand-orange focus:outline-none py-1 transition-colors"
                                />
                            </div>
                            <RouteBoard stops={draft.stops} places={places} onNights={setNights} onRemove={removeStop} placeDragging={active?.type === "place"} />
                            {draft.stops.length === 0 && (
                                <Button variant="outline" className="w-full lg:hidden" onClick={() => setPanel("places")}>
                                    <MapPinned className="w-4 h-4 mr-2" aria-hidden /> Pick places
                                </Button>
                            )}
                            <DayPlanner
                                stops={draft.stops}
                                places={places}
                                onAddIdea={addIdea}
                                onAddOwn={addOwn}
                                onRemoveItem={(id) => setStops((stops) => removeItem(stops, id))}
                                planDragging={active?.type === "idea" || active?.type === "item"}
                            />
                        </main>

                        <aside className={cn(panel === "summary" ? "block" : "hidden", "lg:block lg:sticky lg:top-24 min-w-0")}>
                            {tooLong && (
                                <p className="mb-3 rounded-2xl bg-red-50 text-red-700 text-sm px-4 py-3" role="alert">
                                    Trips can be up to {catalogue.maxNights} nights. Take off {estimate.nights - catalogue.maxNights} to send this one.
                                </p>
                            )}
                            <TripSummary
                                catalogue={catalogue}
                                draft={draft}
                                estimate={estimate}
                                update={update}
                                toggleExtra={toggleExtra}
                                onSend={() => (tooLong ? toast.error(`Trips can be up to ${catalogue.maxNights} nights.`) : setSending(true))}
                                extraDragging={active?.type === "extra"}
                            />
                        </aside>
                    </div>

                    {removable && <TrashZone />}

                    <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                        {active ? <DragPreview data={active} catalogue={catalogue} draft={draft} /> : null}
                    </DragOverlay>
                </DndContext>
            </Container>

            <MobileBar
                panel={panel}
                setPanel={setPanel}
                stops={draft.stops.length}
                low={estimate.low}
                high={estimate.high}
                format={(n) => formatPrice(n, catalogue.currency)}
                onSend={() => (tooLong ? toast.error(`Trips can be up to ${catalogue.maxNights} nights.`) : setSending(true))}
            />

            <SendTripDialog
                open={sending}
                onOpenChange={setSending}
                draft={draft}
                estimate={estimate}
                routeLabel={routeLabel}
                onNotes={(notes) => update({ notes })}
                onSent={() => {
                    // Sent trips live in the dashboard; the builder starts fresh
                    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
                    setDraft(emptyDraft(catalogue));
                    setPanel("places");
                }}
            />
        </div>
    );
}

// Where a plan sits in its day, for dropping before it
function indexIn(stops: TripDraft["stops"], drop: { itemUid: string; slot: DaySlot }) {
    const day = stops.find((s) => s.uid === drop.slot.stopUid)?.days[drop.slot.day] ?? [];
    const i = day.findIndex((x) => x.uid === drop.itemUid);
    return i < 0 ? day.length : i;
}

function TrashZone() {
    const drop: DropData = { type: "trash" };
    const { setNodeRef, isOver } = useDroppable({ id: "trash", data: drop });
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "fixed z-40 left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35)] transition-[background-color,color,scale] duration-150 animate-in fade-in slide-in-from-bottom-2",
                isOver ? "bg-red-600 text-white scale-105" : "bg-white text-slate-700",
            )}
        >
            <Trash2 className="w-4 h-4" aria-hidden /> Drop here to remove
        </div>
    );
}

function DragPreview({ data, catalogue, draft }: { data: DragData; catalogue: TripBuilderCatalogue; draft: TripDraft }) {
    const card = "flex items-center gap-2.5 rounded-2xl bg-white p-2 pr-4 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.06)] rotate-[1.5deg] cursor-grabbing";
    if (data.type === "place" || data.type === "stop") {
        const placeId = data.type === "place" ? data.placeId : draft.stops.find((s) => s.uid === data.stopUid)?.placeId;
        const place = catalogue.places.find((p) => p.id === placeId);
        if (!place) return null;
        return (
            <div className={cn(card, "w-64")}>
                <GripVertical className="w-4 h-4 text-slate-400" aria-hidden />
                <img src={thumb(place.image, 160)} alt="" className="w-11 h-11 rounded-xl object-cover" />
                <span className="font-medium text-sm truncate">{place.name}</span>
            </div>
        );
    }
    if (data.type === "extra") {
        const x = catalogue.extras.find((e) => e.id === data.extraId);
        return x ? <div className={cn(card, "py-2.5 px-4 text-sm font-medium")}>{x.label}</div> : null;
    }
    const title = data.type === "idea" ? data.idea.title : data.title;
    return <div className={cn(card, "py-2 px-3 text-[13px] font-medium max-w-xs")}><GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />{title}</div>;
}

function MobileBar({ panel, setPanel, stops, low, high, format, onSend }: {
    panel: Panel; setPanel: (p: Panel) => void; stops: number; low: number; high: number; format: (n: number) => string; onSend: () => void;
}) {
    const shownLow = useAnimatedNumber(low);
    const shownHigh = useAnimatedNumber(high);
    const tabs: { id: Panel; label: string }[] = [
        { id: "places", label: "Places" },
        { id: "trip", label: stops ? `Your trip (${stops})` : "Your trip" },
        { id: "summary", label: "Price & send" },
    ];
    return (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between gap-3 px-4 pt-2.5">
                <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground leading-none">Estimated price</p>
                    <p className="font-bold tabular-nums text-slate-900 truncate">{stops ? `${format(shownLow)} – ${format(shownHigh)}` : "Add a place"}</p>
                </div>
                <Button variant="brand" size="sm" className="shrink-0 rounded-full px-4" disabled={!stops} onClick={onSend}>Send my trip</Button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-2" role="tablist" aria-label="Trip builder sections">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={panel === t.id}
                        onClick={() => { setPanel(t.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={cn(
                            "h-10 rounded-xl text-xs font-semibold transition-colors",
                            panel === t.id ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-100",
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
