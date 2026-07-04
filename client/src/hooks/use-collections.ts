import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Collection } from '@/types';

export function useCollections() {
    return useQuery({
        queryKey: ['collections'],
        queryFn: () => api.get<{ collections: Collection[] }>('/collections'),
    });
}

/** Admin: returns ALL collections including inactive */
export function useAdminCollections() {
    return useQuery({
        queryKey: ['admin', 'collections'],
        queryFn: () => api.get<{ collections: Collection[] }>('/admin/collections'),
    });
}

export function useCollection(slug: string) {
    return useQuery({
        queryKey: ['collections', slug],
        queryFn: () => api.get<{ collection: Collection }>(`/collections/${slug}`),
        enabled: !!slug,
    });
}

export function useCreateCollection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Collection>) =>
            api.post<{ collection: Collection }>('/admin/collections', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
        },
    });
}

export function useUpdateCollection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Collection> }) =>
            api.put<{ collection: Collection }>(`/admin/collections/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
        },
    });
}

export function useDeleteCollection() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/collections/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
        },
    });
}
