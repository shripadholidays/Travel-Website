import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { PaymentResult } from '@/lib/checkout';
import type {
    AdminTravelOrder, Airport, CreateTravelOrderPayload, CreateTravelOrderResult, FlightOffer, FlightSearchParams,
    HotelDetails, HotelOffer, HotelSearchParams, Place, TravelKind, TravelOrder, TravelOrderStatus,
} from '@/types/travel';

const qs = (params: object) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    }
    return search.toString();
};

// 4xx means the request itself is wrong (bad dates, expired offer, switched off): don't retry.
const retryUnlessClientError = (count: number, error: unknown) => {
    const status = (error as { status?: number })?.status ?? 0;
    return status >= 400 && status < 500 ? false : count < 2;
};

export function useAirports(q: string) {
    return useQuery({
        queryKey: ['airports', q],
        queryFn: () => api.get<{ airports: Airport[] }>(`/flights/airports?${qs({ q })}`),
        enabled: q.trim().length >= 1,
        staleTime: 60 * 60 * 1000,
    });
}

export function usePlaces(q: string) {
    return useQuery({
        queryKey: ['hotel-places', q],
        queryFn: () => api.get<{ places: Place[] }>(`/hotels/places?${qs({ q })}`),
        staleTime: 60 * 60 * 1000,
    });
}

export function useFlightSearch(params: FlightSearchParams | null) {
    return useQuery({
        queryKey: ['flights', 'search', params],
        queryFn: () => api.get<{ offers: FlightOffer[] }>(`/flights/search?${qs(params!)}`),
        enabled: !!params,
        staleTime: 5 * 60 * 1000,
        retry: retryUnlessClientError,
    });
}

export function useFlightOffer(id: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ['flights', 'offer', id],
        queryFn: () => api.get<{ offer: FlightOffer }>(`/flights/offers/${encodeURIComponent(id!)}`),
        enabled: !!id && enabled,
        retry: retryUnlessClientError,
    });
}

export function useHotelSearch(params: HotelSearchParams | null) {
    return useQuery({
        queryKey: ['hotels', 'search', params],
        queryFn: () => api.get<{ offers: HotelOffer[] }>(`/hotels/search?${qs(params!)}`),
        enabled: !!params,
        staleTime: 5 * 60 * 1000,
        retry: retryUnlessClientError,
    });
}

export function useHotel(id: string | undefined, stay: Omit<HotelSearchParams, 'place'> | null) {
    return useQuery({
        queryKey: ['hotels', 'detail', id, stay],
        queryFn: () => api.get<{ hotel: HotelDetails }>(`/hotels/${encodeURIComponent(id!)}?${qs(stay!)}`),
        enabled: !!id && !!stay,
        retry: retryUnlessClientError,
    });
}

export function useHotelOffer(id: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ['hotels', 'offer', id],
        queryFn: () => api.get<{ offer: HotelOffer }>(`/hotels/offers/${encodeURIComponent(id!)}`),
        enabled: !!id && enabled,
        retry: retryUnlessClientError,
    });
}

export function useCreateTravelOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateTravelOrderPayload) => api.post<CreateTravelOrderResult>('/travel-orders', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travel-orders'] }),
    });
}

export function useConfirmTravelOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, paid }: { id: string; paid?: PaymentResult }) => api.post<{ order: TravelOrder }>(`/travel-orders/${id}/confirm`, paid ?? {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travel-orders'] }),
    });
}

export function useMyTravelOrders(enabled: boolean) {
    return useQuery({
        queryKey: ['travel-orders', 'mine'],
        queryFn: () => api.get<{ orders: TravelOrder[] }>('/travel-orders'),
        enabled,
    });
}

export function useCancelTravelOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.patch<{ order: TravelOrder }>(`/travel-orders/${id}/cancel`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travel-orders'] }),
    });
}

export function useAdminTravelOrders(filters: { kind?: TravelKind | ''; status?: TravelOrderStatus | '' }) {
    return useQuery({
        queryKey: ['admin', 'travel-orders', filters],
        queryFn: () => api.get<{ orders: AdminTravelOrder[] }>(`/admin/travel-orders?${qs(filters)}`),
    });
}

export function useUpdateAdminTravelOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: TravelOrderStatus }) =>
            api.patch<{ order: AdminTravelOrder }>(`/admin/travel-orders/${id}`, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'travel-orders'] }),
    });
}
