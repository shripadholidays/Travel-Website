import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Tour, PaginatedData } from '@/types';

interface TourFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    place?: string;
    /** Destination slug: its tours, by the same rule as its tour count */
    destination?: string;
    /** Comma-separated tour ids */
    ids?: string;
    minPrice?: number;
    maxPrice?: number;
    minDays?: number;
    maxDays?: number;
    minRating?: number;
    sort?: string;
}

export function useTours(filters: TourFilters = {}, options: { enabled?: boolean } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value));
    });
    const query = params.toString();

    return useQuery({
        queryKey: ['tours', filters],
        queryFn: () => api.get<PaginatedData<Tour>>(`/tours${query ? `?${query}` : ''}`),
        enabled: options.enabled ?? true,
    });
}

export interface TourFacet { name: string; count: number }

/** Categories and places that live tours cover, for the search filters. */
export function useTourFacets() {
    return useQuery({
        queryKey: ['tours', 'facets'],
        queryFn: () => api.get<{ categories: TourFacet[]; places: TourFacet[] }>('/tours/facets'),
        staleTime: 5 * 60 * 1000,
    });
}

export function useTour(id: string) {
    return useQuery({
        queryKey: ['tours', id],
        queryFn: () => api.get<{ tour: Tour }>(`/tours/${id}`),
        enabled: !!id,
    });
}

export function useRecommendedTours() {
    return useQuery({
        queryKey: ['tours', 'recommended'],
        queryFn: () => api.get<{ tours: Tour[] }>('/tours/recommended'),
    });
}

export function useCreateTour() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tour: Partial<Tour>) => api.post<{ tour: Tour }>('/tours', tour),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
    });
}

export function useUpdateTour() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Tour> }) =>
            api.put<{ tour: Tour }>(`/tours/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
    });
}

export function useDeleteTour() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/tours/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
    });
}

export function useBulkCreateTours() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tours: Partial<Tour>[]) =>
            api.post<{ tours: Tour[] }>('/tours/bulk', { tours }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
    });
}
