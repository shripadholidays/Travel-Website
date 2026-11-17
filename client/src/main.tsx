import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { config } from './config'

// Nudge the API awake the moment the site opens. On Render's free plan it sleeps when idle and takes
// up to a minute to start, so starting it now (before any page asks for data) shortens that wait.
try {
    const apiOrigin = new URL(config.api.baseUrl).origin
    fetch(`${apiOrigin}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
} catch { /* bad API_URL: the normal requests will report it */ }

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            onError: (error: Error) => {
                toast.error(error.message || 'Something went wrong');
            },
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </HelmetProvider>
    </React.StrictMode>,
)
