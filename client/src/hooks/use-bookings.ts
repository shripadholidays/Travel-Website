import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Booking } from '@/types';

interface CreateBookingPayload {
    tour: string;
    travelDate: string;
    numberOfTravelers: number;
    contactInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    /** What the traveller pays in (falls back to the site's base currency) */
    currency?: string;
    // Add-ons and coupons are priced by the server
    addons?: { name: string }[];
    couponCode?: string;
    specialRequests?: string;
}

export function useUserBookings() {
    return useQuery({
        queryKey: ['bookings', 'mine'],
        queryFn: () => api.get<{ bookings: Booking[] }>('/bookings'),
    });
}

export function useBooking(id: string) {
    return useQuery({
        queryKey: ['bookings', id],
        queryFn: () => api.get<{ booking: Booking }>(`/bookings/${id}`),
        enabled: !!id,
    });
}

export function useCreateBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBookingPayload) =>
            api.post<{ booking: Booking; clientSecret?: string }>('/bookings', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    });
}

export function useCancelBooking() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.patch<{ booking: Booking }>(`/bookings/${id}/cancel`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    });
}
