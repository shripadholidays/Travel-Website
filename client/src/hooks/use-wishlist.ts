import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Wishlist } from '@/types';

export function useWishlist() {
    return useQuery({
        queryKey: ['wishlist'],
        queryFn: () => api.get<{ wishlist: Wishlist }>('/wishlist'),
    });
}

export function useAddToWishlist() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tourId: string) =>
            api.post<{ wishlist: Wishlist }>(`/wishlist/${tourId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
    });
}

export function useRemoveFromWishlist() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tourId: string) =>
            api.delete<{ wishlist: Wishlist }>(`/wishlist/${tourId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
    });
}
