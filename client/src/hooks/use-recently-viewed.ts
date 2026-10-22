import { useCallback, useEffect, useState } from "react";
import type { Tour } from "@/types";

const STORAGE_KEY = "wandeazy.recentlyViewed";
const MAX_ITEMS = 6;

function readStorage(): Tour[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Tour[]) : [];
    } catch {
        return [];
    }
}

function writeStorage(tours: Tour[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    } catch {
        // storage full — ignore
    }
}

export function useRecentlyViewed() {
    const [tours, setTours] = useState<Tour[]>(readStorage);

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setTours(readStorage());
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    const addTour = useCallback((tour: Tour) => {
        setTours((prev) => {
            const filtered = prev.filter((t) => t._id !== tour._id);
            const next = [tour, ...filtered].slice(0, MAX_ITEMS);
            writeStorage(next);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setTours([]);
    }, []);

    return { tours, addTour, clearAll };
}
