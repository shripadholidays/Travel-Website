import type { ApiResponse } from '@/types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const BASE_URL = API_BASE_URL;

class ApiError extends Error {
    status: number;
    errors?: { field: string; message: string }[];

    constructor(status: number, message: string, errors?: { field: string; message: string }[]) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const config: RequestInit = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    // Don't set Content-Type for FormData (browser sets multipart boundary)
    if (options.body instanceof FormData) {
        const headers = { ...options.headers } as Record<string, string>;
        delete headers['Content-Type'];
        config.headers = headers;
    }

    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    const json: ApiResponse<T> = await response.json();

    if (!response.ok || json.status === 'error' || json.status === 'fail') {
        // Redirect to login on 401
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        throw new ApiError(response.status, json.message, json.errors);
    }

    return json.data;
}

// Convenience methods
const api = {
    get: <T>(endpoint: string) => request<T>(endpoint),

    post: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(endpoint: string, body?: unknown) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(endpoint: string) =>
        request<T>(endpoint, { method: 'DELETE' }),
};

export { api, ApiError };
