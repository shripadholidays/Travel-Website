/// <reference types="vite/client" />

/** Whitelisted build settings without the VITE_ prefix (see vite.config.ts) */
declare const __PUBLIC_ENV__: Record<string, string>;
