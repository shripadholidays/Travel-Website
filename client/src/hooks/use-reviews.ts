import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Review } from '@/types';

export function useTourReviews(tourId: string) {
    return useQuery({
        queryKey: ['reviews', tourId],
        queryFn: () => api.get<{ reviews: Review[] }>(`/tours/${tourId}/reviews`),
        enabled: !!tourId,
    });
}

export function useCreateReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tourId, data }: { tourId: string; data: { rating: number; title?: string; content: string } }) =>
            api.post<{ review: Review }>(`/tours/${tourId}/reviews`, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reviews', variables.tourId] });
            queryClient.invalidateQueries({ queryKey: ['tours', variables.tourId] });
        },
    });
}
