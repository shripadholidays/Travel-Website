import { useState } from "react";
import {
    DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection,
    useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarDays, MoreHorizontal, Users } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import type { CustomTrip } from "@/lib/trip-builder";
import { timeAgo } from "./AdminUI";

export type TripStatus = CustomTrip["status"];

export const TRIP_COLUMNS: { id: TripStatus; label: string; hint: string; dot: string }[] = [
    { id: "new", label: "New", hint: "Waiting for a price", dot: "bg-brand-orange" },
    { id: "quoted", label: "Priced", hint: "Final price sent", dot: "bg-blue-500" },
    { id: "booked", label: "Booked", hint: "Going ahead", dot: "bg-emerald-500" },
    { id: "closed", label: "Closed", hint: "Not going ahead", dot: "bg-slate-400" },
];

// Cards only drop on columns; the pointer decides which one
const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length ? hits : rectIntersection(args);
};

interface Props {
    trips: CustomTrip[];
    onMove: (trip: CustomTrip, status: TripStatus) => void;
    onOpen: (trip: CustomTrip) => void;
}

/** Custom trips as cards in New / Priced / Booked / Closed: drag a card to move it along */
export function CustomTripBoard({ trips, onMove, onOpen }: Props) {
    const [dragging, setDragging] = useState<CustomTrip | null>(null);
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        // Space picks a card up (Enter opens it)
        useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } }),
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDragging(null);
        const trip = trips.find((t) => t._id === active.id);
        const status = over?.id as TripStatus | undefined;
        if (trip && status && status !== trip.status) onMove(trip, status);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={(e) => setDragging(trips.find((t) => t._id === e.active.id) ?? null)}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(null)}
        >
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible">
                {TRIP_COLUMNS.map((col) => (
                    <Column
                        key={col.id}
                        column={col}
                        trips={trips.filter((t) => t.status === col.id)}
                        onOpen={onOpen}
                        onMove={onMove}
                        active={!!dragging && dragging.status !== col.id}
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                {dragging ? <TripCard trip={dragging} overlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function Column({ column, trips, onOpen, onMove, active }: {
    column: (typeof TRIP_COLUMNS)[number]; trips: CustomTrip[]; onOpen: (t: CustomTrip) => void; onMove: Props["onMove"]; active: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });
    return (
        <section
            ref={setNodeRef}
            aria-label={`${column.label} trips`}
            className={cn(
                "snap-start shrink-0 w-[82vw] sm:w-80 lg:w-auto rounded-3xl p-2.5 flex flex-col transition-[background-color,box-shadow] duration-150 min-h-[16rem]",
                isOver ? "bg-orange-50 shadow-[inset_0_0_0_2px_#F97316]" : active ? "bg-slate-100/80 shadow-[inset_0_0_0_1.5px_rgba(249,115,22,0.3)]" : "bg-slate-100/70",
            )}
        >
            <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                <span className={cn("w-2 h-2 rounded-full", column.dot)} aria-hidden />
                <h3 className="text-sm font-semibold text-slate-900">{column.label}</h3>
                <span className="text-xs font-medium text-slate-500 tabular-nums">{trips.length}</span>
                <span className="ml-auto text-[11px] text-slate-500 hidden xl:inline">{column.hint}</span>
            </header>
            <ul className="space-y-2 flex-1">
                {trips.map((t) => <DraggableCard key={t._id} trip={t} onOpen={() => onOpen(t)} onMove={onMove} />)}
                {trips.length === 0 && (
                    <li className="text-xs text-slate-500 text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200">
                        Drag a trip here
                    </li>
                )}
            </ul>
        </section>
    );
}

function DraggableCard({ trip, onOpen, onMove }: { trip: CustomTrip; onOpen: () => void; onMove: Props["onMove"] }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: trip._id });
    return (
        <li ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
            <TripCard trip={trip} onOpen={onOpen} onMove={onMove} dragProps={{ ...attributes, ...listeners }} />
        </li>
    );
}

function TripCard({ trip, onOpen, onMove, dragProps, overlay }: {
    trip: CustomTrip; onOpen?: () => void; onMove?: Props["onMove"]; dragProps?: Record<string, unknown>; overlay?: boolean;
}) {
    const { formatPrice } = useCurrency();
    const est = trip.estimate;
    const currency = est?.currency ?? "INR";
    const nights = trip.stops.reduce((n, s) => n + s.nights, 0);
    return (
        <div
            {...dragProps}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter") onOpen?.();
                (dragProps?.onKeyDown as ((e: React.KeyboardEvent) => void) | undefined)?.(e);
            }}
            aria-label={`${trip.title} from ${trip.fullName}. Press Enter to open, or space to pick up and move.`}
            className={cn(
                "group relative rounded-2xl bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.06)] cursor-grab active:cursor-grabbing select-none touch-manipulation transition-shadow hover:shadow-[0_4px_14px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
                overlay && "rotate-[1.5deg] shadow-[0_18px_40px_-12px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.06)]",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2 text-pretty">{trip.title}</p>
                {onMove && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                aria-label={`Move ${trip.title}`}
                                className="-mr-1 -mt-1 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
                            {TRIP_COLUMNS.filter((c) => c.id !== trip.status).map((c) => (
                                <DropdownMenuItem key={c.id} onClick={() => onMove(trip, c.id)}>
                                    <span className={cn("w-2 h-2 rounded-full mr-2", c.dot)} aria-hidden /> {c.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{trip.fullName}</p>
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                {trip.stops.map((s) => `${s.name} ${s.nights}N`).join(" → ")}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 tabular-nums">
                <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" aria-hidden />{trip.adults + trip.children}</span>
                <span>{nights}N · {est?.hotelLabel}</span>
                <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" aria-hidden />{trip.startDate ? format(new Date(trip.startDate), "d MMM") : "Flexible"}
                </span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                {trip.quote ? (
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{formatPrice(trip.quote, currency)}</span>
                ) : (
                    <span className="text-xs text-slate-600 tabular-nums">{est ? `${formatPrice(est.low, currency)}–${formatPrice(est.high, currency)}` : "—"}</span>
                )}
                <span className="text-[11px] text-slate-400" title={new Date(trip.createdAt).toLocaleString()}>{timeAgo(trip.createdAt)}</span>
            </div>
        </div>
    );
}
