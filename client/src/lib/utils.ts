import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** "1 tour", "3 tours", or "Coming soon" when a destination has none yet. */
export function tourCountLabel(count: number | undefined) {
    if (!count) return 'Coming soon';
    return `${count} ${count === 1 ? 'tour' : 'tours'}`;
}
