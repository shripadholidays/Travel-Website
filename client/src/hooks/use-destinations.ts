import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Destination } from '@/types';

export function useDestinations(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ['destinations'],
        queryFn: () => api.get<{ destinations: Destination[] }>('/destinations'),
        enabled: options.enabled ?? true,
    });
}

/** Every destination, including switched-off ones (catalog staff only). */
export function useAdminDestinations() {
    return useQuery({
        queryKey: ['destinations', 'admin'],
        queryFn: () => api.get<{ destinations: Destination[] }>('/destinations?scope=admin'),
    });
}

export function useDestination(slug: string) {
    return useQuery({
        queryKey: ['destinations', slug],
        queryFn: () => api.get<{ destination: Destination }>(`/destinations/${slug}`),
        enabled: !!slug,
    });
}

export function useCreateDestination() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Destination>) =>
            api.post<{ destination: Destination }>('/destinations', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['destinations'] }),
    });
}

export function useUpdateDestination() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Destination> }) =>
            api.put<{ destination: Destination }>(`/destinations/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['destinations'] }),
    });
}

export function useDeleteDestination() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/destinations/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['destinations'] }),
    });
}
