// Where to send someone after they sign in, so a guest who hits "Book Now"
// (or the wishlist heart, or a protected page) lands back where they were —
// with the booking's tour/date/guests (router state) intact.
// Kept in sessionStorage so it survives a full-page OAuth round trip.

const KEY = 'wandeazy.returnTo';
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

export interface ReturnTo {
    pathname: string;
    search?: string;
    state?: unknown;
}

function isSafe(target: ReturnTo | null): target is ReturnTo {
    return !!target
        && typeof target.pathname === 'string'
        && target.pathname.startsWith('/')
        && !target.pathname.startsWith('//')
        && !AUTH_PAGES.some((p) => target.pathname.startsWith(p));
}

export function rememberReturnTo(location: { pathname: string; search?: string; state?: unknown }) {
    const target: ReturnTo = { pathname: location.pathname, search: location.search, state: location.state ?? undefined };
    if (!isSafe(target)) return;
    try {
        sessionStorage.setItem(KEY, JSON.stringify(target));
    } catch {
        // storage unavailable — fall back to the default landing page
    }
}

/** Reads and clears the saved destination. */
export function takeReturnTo(): ReturnTo | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        const target = raw ? (JSON.parse(raw) as ReturnTo) : null;
        return isSafe(target) ? target : null;
    } catch {
        return null;
    }
}
