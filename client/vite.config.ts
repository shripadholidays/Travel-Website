import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 4321,
        strictPort: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
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
                    'animation-vendor': ['framer-motion', 'gsap'],
                    'carousel-vendor': ['swiper'],
                },
            },
        },
    },
})
