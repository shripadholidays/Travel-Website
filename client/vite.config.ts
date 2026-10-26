/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// Settings the site may also read without the VITE_ prefix (e.g. API_URL on Vercel).
// Only these exact names reach the browser; nothing else in the environment does.
const PUBLIC_KEYS = [
    'API_URL', 'SITE_URL', 'APP_NAME', 'LOGO_TEXT', 'DEFAULT_CURRENCY', 'GOOGLE_OAUTH_CLIENT_ID',
    'AUTH_COOKIE_NAME', 'SID_COOKIE_NAME', 'QUERY_STALE_MS', 'RATE_INR', 'RATE_EUR', 'RATE_GBP', 'RATE_AED',
];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
    const own = loadEnv(mode, __dirname, '');
    const port = Number(env.VITE_PORT) || 4321;

    return {
    plugins: [react()],
    define: {
        __PUBLIC_ENV__: JSON.stringify(Object.fromEntries(PUBLIC_KEYS.filter((k) => own[k]).map((k) => [k, own[k]]))),
    },
    server: {
        port,
        strictPort: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: false,
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'query-vendor': ['@tanstack/react-query'],
                    'form-vendor': ['react-hook-form', 'zod', 'date-fns'],
                    'map-vendor': ['leaflet', 'react-leaflet'],
                    'stripe-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
                    'animation-vendor': ['framer-motion', 'gsap', '@gsap/react'],
                    'carousel-vendor': ['swiper'],
                },
            },
        },
    },
    };
});
