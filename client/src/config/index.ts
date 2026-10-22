/**
 * Central client configuration — every tuneable value lives here.
 * All values read from import.meta.env (VITE_ prefixed) with documented defaults.
 */

export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED';

const env = import.meta.env;

export const config = {
    api: {
        baseUrl:   env.VITE_API_URL      || 'http://localhost:7654/api/v1',
    },

    app: {
        name:      env.VITE_APP_NAME     || 'WandEazy',
        logoText:  env.VITE_LOGO_TEXT    || 'WandEazy',
    },

    auth: {
        cookieName:    env.VITE_AUTH_COOKIE_NAME || 'wandeazy.token',
        sidCookieName: env.VITE_SID_COOKIE_NAME  || 'wandeazy.sid',
    },

    currency: {
        default: (env.VITE_DEFAULT_CURRENCY || 'USD') as Currency,
        rates: {
            USD: 1,
            INR: Number(env.VITE_RATE_INR)  || 83.5,
            EUR: Number(env.VITE_RATE_EUR)  || 0.92,
            GBP: Number(env.VITE_RATE_GBP)  || 0.79,
            AED: Number(env.VITE_RATE_AED)  || 3.67,
        } satisfies Record<Currency, number>,
    },

    query: {
        staleTimeMs: Number(env.VITE_QUERY_STALE_MS) || 5 * 60_000,
    },
} as const;
