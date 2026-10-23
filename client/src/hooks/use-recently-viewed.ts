import { useCallback, useEffect, useState } from "react";
import type { Tour } from "@/types";

const STORAGE_KEY = "wandeazy.recentlyViewed";
const MAX_ITEMS = 6;

// Only tour ids are kept; prices, ratings and photos are always fetched fresh,
// so the list never shows numbers that have since changed.
function readStorage(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        // Older versions stored whole tours; keep just their ids
        return parsed
            .map((item) => (typeof item === "string" ? item : (item as Partial<Tour>)?._id))
            .filter((id): id is string => typeof id === "string")
            .slice(0, MAX_ITEMS);
    } catch {
        return [];
    }
}

function writeStorage(ids: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // storage full or blocked — ignore
    }
}

export function useRecentlyViewed() {
    const [ids, setIds] = useState<string[]>(readStorage);

    // Sync across tabs
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setIds(readStorage());
        };
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    const addTour = useCallback((tour: Pick<Tour, "_id">) => {
        setIds((prev) => {
            const next = [tour._id, ...prev.filter((id) => id !== tour._id)].slice(0, MAX_ITEMS);
            writeStorage(next);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
        setIds([]);
    }, []);

    return { ids, addTour, clearAll };
}
