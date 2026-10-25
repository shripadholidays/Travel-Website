/**
 * Central client configuration — every tuneable value lives here.
 * Values come from the build environment as VITE_NAME or plain NAME (see vite.config.ts), with defaults.
 */

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED';

const vite = import.meta.env as unknown as Record<string, string | undefined>;
// Plain names (API_URL…) whitelisted in vite.config.ts; empty in tests
const plain: Record<string, string> = typeof __PUBLIC_ENV__ === 'undefined' ? {} : __PUBLIC_ENV__;
// VITE_API_URL or API_URL, whichever is set
const read = (name: string): string | undefined => vite[`VITE_${name}`] || plain[name] || undefined;

export const config = {
    api: {
        baseUrl:   read('API_URL')      || 'http://localhost:7654/api/v1',
    },

    app: {
        name:      read('APP_NAME')     || 'WandEazy',
        logoText:  read('LOGO_TEXT')    || 'WandEazy',
    },

    auth: {
        cookieName:    read('AUTH_COOKIE_NAME') || 'wandeazy.token',
        sidCookieName: read('SID_COOKIE_NAME')  || 'wandeazy.sid',
    },

    currency: {
        default: (read('DEFAULT_CURRENCY') || 'INR') as Currency,
        rates: {
            USD: 1,
            INR: Number(read('RATE_INR'))  || 83.5,
            EUR: Number(read('RATE_EUR'))  || 0.92,
            GBP: Number(read('RATE_GBP'))  || 0.79,
            AED: Number(read('RATE_AED'))  || 3.67,
        } satisfies Record<Currency, number>,
    },

    /** Google sign-in (blank = the Google button is hidden) */
    googleClientId: read('GOOGLE_OAUTH_CLIENT_ID') || '',

    query: {
        staleTimeMs: Number(read('QUERY_STALE_MS')) || 5 * 60_000,
    },
} as const;
