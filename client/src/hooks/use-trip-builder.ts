import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toQuery } from '@/hooks/use-admin';
import { toPayload, type CustomTrip, type TripBuilderCatalogue, type TripDraft } from '@/lib/trip-builder';
import type { Pagination } from '@/types';

/** GET /trip-builder — the places, hotel classes and extras travellers build from */
export function useTripBuilder() {
    return useQuery({
        queryKey: ['trip-builder'],
        queryFn: () => api.get<{ builder: TripBuilderCatalogue }>('/trip-builder'),
        staleTime: 5 * 60_000,
    });
}

export interface SendTripInput { draft: TripDraft; fullName: string; email: string; phoneNumber?: string }

/** POST /custom-trips */
export function useSendTrip() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ draft, ...contact }: SendTripInput) =>
            api.post<{ trip: CustomTrip }>('/custom-trips', { ...toPayload(draft), ...contact }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-trips', 'mine'] }),
    });
}

/** GET /custom-trips/mine — the signed-in traveller's trips */
export function useMyCustomTrips(enabled = true) {
    return useQuery({
        queryKey: ['custom-trips', 'mine'],
        queryFn: () => api.get<{ trips: CustomTrip[] }>('/custom-trips/mine'),
        enabled,
    });
}

// Admin
export function useAdminCustomTrips(params: { search?: string } = {}) {
    return useQuery({
        queryKey: ['admin', 'custom-trips', params],
        queryFn: () => api.get<{ trips: CustomTrip[]; statusCounts: Partial<Record<CustomTrip['status'], number>>; pagination: Pagination }>(
            `/admin/custom-trips${toQuery({ ...params, limit: 200 })}`,
        ),
        placeholderData: keepPreviousData,
    });
}

export type CustomTripChanges = Partial<Pick<CustomTrip, 'status' | 'quote' | 'quoteNote' | 'staffNote'>> & { notify?: boolean };

export function useUpdateCustomTrip() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, changes }: { id: string; changes: CustomTripChanges }) =>
            api.patch<{ trip: CustomTrip }>(`/admin/custom-trips/${id}`, changes),
        // The board moves the card straight away; a failed save puts it back
        onMutate: async ({ id, changes }) => {
            await qc.cancelQueries({ queryKey: ['admin', 'custom-trips'] });
            const before = qc.getQueriesData<{ trips: CustomTrip[] }>({ queryKey: ['admin', 'custom-trips'] });
            qc.setQueriesData<{ trips: CustomTrip[] }>({ queryKey: ['admin', 'custom-trips'] }, (old) => old && ({
                ...old,
                trips: old.trips.map((t) => (t._id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t)),
            }));
            return { before };
        },
        onError: (_err, _vars, ctx) => ctx?.before.forEach(([key, data]) => qc.setQueryData(key, data)),
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'custom-trips'] });
            qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}

export function useAdminTripBuilder() {
    return useQuery({
        queryKey: ['admin', 'trip-builder'],
        queryFn: () => api.get<{ builder: TripBuilderCatalogue; isStartingList: boolean }>('/admin/trip-builder'),
    });
}

export function useSaveTripBuilder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (builder: TripBuilderCatalogue) => api.put<{ builder: TripBuilderCatalogue; isStartingList: boolean }>('/admin/trip-builder', { builder }),
        onSuccess: (data) => {
            qc.setQueryData(['admin', 'trip-builder'], data);
            qc.invalidateQueries({ queryKey: ['trip-builder'] });
        },
    });
}
