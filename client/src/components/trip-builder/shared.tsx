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

/** A smaller copy of an Unsplash photo for thumbnails; other images as they are */
export function thumb(url: string, width = 320) {
    if (!url) return url;
    return /images\.unsplash\.com/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${width}`) : url;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
