import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lightbulb, Plane, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderActivity, BuilderPlace, DaySlot, DraftStop, PlanItem } from "@/lib/trip-builder";
import type { DragData, DropData } from "./shared";

interface Props {
    stops: DraftStop[];
    places: Map<string, BuilderPlace>;
    onAddIdea: (stopUid: string, idea: BuilderActivity) => void;
    onAddOwn: (slot: DaySlot, title: string) => void;
    onRemoveItem: (itemUid: string) => void;
    /** A plan or idea is being dragged, so days should invite the drop */
    planDragging: boolean;
}

/** Day by day: drag ideas into days, and plans between days */
export function DayPlanner({ stops, places, onAddIdea, onAddOwn, onRemoveItem, planDragging }: Props) {
    if (stops.length === 0) return null;
    let day = 0;

    return (
        <section aria-labelledby="days-heading">
            <div className="flex items-baseline justify-between gap-2 mb-3">
                <h2 id="days-heading" className="font-semibold text-slate-900">Day by day</h2>
                <p className="text-xs text-muted-foreground">Drag ideas into days, or plans between days</p>
            </div>
            <div className="space-y-5">
                {stops.map((stop) => {
                    const place = places.get(stop.placeId);
                    if (!place) return null;
                    const first = day + 1;
                    day += stop.nights;
                    const used = new Set(stop.days.flat().map((x) => x.title));
                    const ideas = place.activities.filter((a) => !used.has(a.title));
                    return (
                        <div key={stop.uid} className="rounded-3xl bg-slate-50/80 p-3 sm:p-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 px-1">
                                {place.name}
                                <span className="font-normal text-muted-foreground tabular-nums"> · {stop.nights === 1 ? `Day ${first}` : `Days ${first}–${first + stop.nights - 1}`}</span>
                            </h3>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {stop.days.map((items, i) => (
                                    <DayBox
                                        key={i}
                                        number={first + i}
                                        slot={{ stopUid: stop.uid, day: i }}
                                        items={items}
                                        onAddOwn={onAddOwn}
                                        onRemoveItem={onRemoveItem}
                                        highlight={planDragging}
                                    />
                                ))}
                            </div>
                            {ideas.length > 0 && (
                                <div className="mt-3 px-1">
                                    <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" aria-hidden /> Ideas for {place.name}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {ideas.map((idea) => (
                                            <IdeaChip key={idea.title} placeId={place.id} idea={idea} onAdd={() => onAddIdea(stop.uid, idea)} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
                    <span className="inline-flex h-7 items-center rounded-full bg-slate-100 px-2.5 text-xs font-bold text-slate-700 tabular-nums">Day {day + 1}</span>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5"><Plane className="w-4 h-4 text-slate-400" aria-hidden /> Head home</p>
                </div>
            </div>
        </section>
    );
}

function DayBox({ number, slot, items, onAddOwn, onRemoveItem, highlight }: {
    number: number; slot: DaySlot; items: PlanItem[];
    onAddOwn: (slot: DaySlot, title: string) => void; onRemoveItem: (uid: string) => void; highlight: boolean;
}) {
    const drop: DropData = { type: "day", slot };
    const { setNodeRef, isOver } = useDroppable({ id: `day:${slot.stopUid}:${slot.day}`, data: drop });
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState("");
    const save = () => {
        if (text.trim()) onAddOwn(slot, text.trim());
        setText("");
        setAdding(false);
    };

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "rounded-2xl bg-white p-2.5 min-h-[6.5rem] flex flex-col transition-[box-shadow,background-color] duration-150",
                isOver ? "shadow-[0_0_0_2px_#F97316] bg-orange-50/50" : highlight ? "shadow-[0_0_0_1.5px_rgba(249,115,22,0.35)]" : "shadow-[0_1px_2px_rgba(15,23,42,0.05),0_0_0_1px_rgba(15,23,42,0.06)]",
            )}
        >
            <span className="inline-flex self-start h-6 items-center rounded-full bg-brand-blue px-2.5 text-[11px] font-bold text-white tabular-nums mb-2">Day {number}</span>
            <SortableContext items={items.map((x) => `item:${x.uid}`)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5 flex-1">
                    {items.map((item) => <PlanChip key={item.uid} item={item} slot={slot} onRemove={() => onRemoveItem(item.uid)} />)}
                    {items.length === 0 && !adding && (
                        <li className="text-xs text-muted-foreground px-1 py-2">Free day. Drop an idea here.</li>
                    )}
                </ul>
            </SortableContext>
            {adding ? (
                <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-2 flex gap-1.5">
                    <input
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={save}
                        onKeyDown={(e) => e.key === "Escape" && (setText(""), setAdding(false))}
                        maxLength={80}
                        placeholder="e.g. Cafe hopping in Old Manali"
                        aria-label={`Your own plan for day ${number}`}
                        className="min-w-0 flex-1 rounded-lg border border-input px-2.5 py-1.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                    />
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="mt-2 self-start inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-500 hover:text-brand-orange hover:bg-orange-50 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" aria-hidden /> Add your own
                </button>
            )}
        </div>
    );
}

function PlanChip({ item, slot, onRemove }: { item: PlanItem; slot: DaySlot; onRemove: () => void }) {
    const data: DragData & DropData = { type: "item", itemUid: item.uid, slot, title: item.title };
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: `item:${item.uid}`, data });
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn("group flex items-start gap-1 rounded-xl bg-slate-50 pl-0.5 pr-1 py-1", isDragging && "opacity-40")}
        >
            <button
                ref={setActivatorNodeRef}
                {...listeners}
                {...attributes}
                type="button"
                aria-label={`Move "${item.title}". Use the arrow keys after pressing space.`}
                className="w-6 h-7 shrink-0 flex items-center justify-center rounded-md text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </button>
            <div className="min-w-0 flex-1 py-0.5">
                <p className="text-[13px] font-medium text-slate-800 leading-snug">{item.title}</p>
                {item.note && <p className="text-[11px] text-slate-500 leading-snug line-clamp-2 text-pretty">{item.note}</p>}
            </div>
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove "${item.title}"`}
                className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </li>
    );
}

function IdeaChip({ placeId, idea, onAdd }: { placeId: string; idea: BuilderActivity; onAdd: () => void }) {
    const data: DragData = { type: "idea", placeId, idea };
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `idea:${placeId}:${idea.title}`, data });
    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            type="button"
            onClick={onAdd}
            title={idea.note}
            aria-label={`${idea.title}. Tap to add to the freest day, or drag to a day.`}
            className={cn(
                "inline-flex items-center gap-1 rounded-full bg-white pl-2 pr-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-[0_0_0_1px_rgba(15,23,42,0.1)] hover:shadow-[0_0_0_1px_rgba(249,115,22,0.6)] hover:text-brand-orange transition-[box-shadow,color,scale] active:scale-[0.96] cursor-grab touch-manipulation select-none",
                isDragging && "opacity-40",
            )}
        >
            <Plus className="w-3 h-3" aria-hidden /> {idea.title}
        </button>
    );
}
