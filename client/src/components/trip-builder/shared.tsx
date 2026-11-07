import { useEffect, useRef, useState } from "react";
import type { BuilderActivity, DaySlot } from "@/lib/trip-builder";

// What is being dragged, and what it is dropped on (dnd-kit's data on each draggable/droppable)
export type DragData =
    | { type: "place"; placeId: string }
    | { type: "stop"; stopUid: string }
    | { type: "idea"; placeId: string; idea: BuilderActivity }
    | { type: "item"; itemUid: string; slot: DaySlot; title: string }
    | { type: "extra"; extraId: string };

export type DropData =
    | { type: "route" }
    | { type: "stop"; stopUid: string }
    | { type: "day"; slot: DaySlot }
    | { type: "item"; itemUid: string; slot: DaySlot }
    | { type: "extras" }
    | { type: "trash" };

/** A smaller copy of a photo for thumbnails: our own destination photos have a "-sm" copy, Unsplash takes a width */
export function thumb(url: string, width = 320) {
    if (!url) return url;
    if (width <= 480 && /^\/images\/trips\/[^/]+\.webp$/.test(url)) return url.replace(/\.webp$/, "-sm.webp");
    return /images\.unsplash\.com/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${width}`) : url;
}

/** A numbered step title, so the page reads as 1, 2, 3… */
export function StepHeading({ id, step, title, hint, children }: { id: string; step: number; title: string; hint?: string; children?: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-5">
            <div className="flex items-start gap-3 min-w-0">
                <span className="size-8 shrink-0 rounded-full bg-brand-blue text-white text-sm font-bold flex items-center justify-center tabular-nums" aria-hidden>{step}</span>
                <div className="min-w-0">
                    <h2 id={id} className="text-xl font-semibold text-slate-900 text-balance leading-8">{title}</h2>
                    {hint && <p className="text-sm text-muted-foreground text-pretty mt-0.5">{hint}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

const reducedMotion =() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts smoothly from the last value to the new one, so the price visibly reacts */
export function useAnimatedNumber(value: number, ms = 450) {
    const [shown, setShown] = useState(value);
    const from = useRef(value);
    useEffect(() => {
        if (reducedMotion()) { setShown(value); from.current = value; return; }
        const start = performance.now();
        const a = from.current;
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / ms);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = Math.round(a + (value - a) * eased);
            setShown(v);
            from.current = v;
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, ms]);
    return shown;
}
