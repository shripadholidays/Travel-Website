/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
    const port = Number(env.VITE_PORT) || 4321;

    return {
    plugins: [react()],
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
                    'animation-vendor': ['framer-motion', 'gsap', '@gsap/react'],
                    'carousel-vendor': ['swiper'],
                },
            },
        },
    },
    };
});
