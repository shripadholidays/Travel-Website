import type { ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props<T extends { _key: string }> {
    items: T[];
    onChange: (items: T[]) => void;
    /** handle: the drag grip to place in the row */
    render: (item: T, index: number, handle: ReactNode) => ReactNode;
    label: (item: T) => string;
    /** Reordering makes no sense while a list is filtered */
    disabled?: boolean;
    className?: string;
}

/** A list whose rows reorder by dragging their grip (or with space and the arrow keys) */
export function SortableRows<T extends { _key: string }>({ items, onChange, render, label, disabled, className }: Props<T>) {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = items.findIndex((x) => x._key === active.id);
        const to = items.findIndex((x) => x._key === over.id);
        if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
    };
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((x) => x._key)} strategy={verticalListSortingStrategy} disabled={disabled}>
                <ul className={cn("space-y-2", className)}>
                    {items.map((item, i) => (
                        <Row key={item._key} id={item._key} label={label(item)} disabled={disabled}>
                            {(handle) => render(item, i, handle)}
                        </Row>
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
}

function Row({ id, label, disabled, children }: { id: string; label: string; disabled?: boolean; children: (handle: ReactNode) => ReactNode }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
    const handle = (
        <button
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            type="button"
            disabled={disabled}
            aria-label={`Move ${label || "row"}`}
            className="w-7 h-9 shrink-0 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none disabled:opacity-30 disabled:cursor-default"
        >
            <GripVertical className="w-4 h-4" />
        </button>
    );
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn("relative", isDragging && "z-10 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.4)] rounded-2xl")}
        >
            {children(handle)}
        </li>
    );
}
