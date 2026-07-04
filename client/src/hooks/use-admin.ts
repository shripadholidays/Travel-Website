import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { DashboardStats, User, Booking } from '@/types';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: () => api.get<DashboardStats>('/admin/stats'),
    });
}

// Admin users
export function useAdminUsers(params?: { search?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const query = searchParams.toString();

    return useQuery({
        queryKey: ['admin', 'users', params],
        queryFn: () => api.get<{ users: User[]; pagination: { total: number; page: number; limit: number; pages: number } }>(`/admin/users${query ? `?${query}` : ''}`),
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
            api.put<{ user: User }>(`/admin/users/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    });
}

// Admin bookings
export function useAdminBookings() {
    return useQuery({
        queryKey: ['admin', 'bookings'],
        queryFn: () => api.get<{ bookings: Booking[] }>('/admin/bookings'),
    });
}

export function useUpdateBookingStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch<{ booking: Booking }>(`/admin/bookings/${id}/status`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}
