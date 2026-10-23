import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { DashboardStats, User, Booking, Pagination, Permission } from '@/types';

/** Builds "?a=1&b=x" from the set values only. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'all') search.append(k, String(v));
    });
    const q = search.toString();
    return q ? `?${q}` : '';
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: () => api.get<DashboardStats>('/admin/stats'),
    });
}

export interface RoleInfo { id: User['role']; label: string; description: string; permissions: Permission[] }

export function useRoles() {
    return useQuery({
        queryKey: ['admin', 'roles'],
        queryFn: () => api.get<{ roles: RoleInfo[] }>('/admin/roles'),
        staleTime: Infinity,
    });
}

// Admin users
export function useAdminUsers(params: { search?: string; role?: string; page?: number } = {}) {
    return useQuery({
        queryKey: ['admin', 'users', params],
        queryFn: () => api.get<{ users: User[]; roleCounts: Record<string, number>; pagination: Pagination }>(`/admin/users${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Pick<User, 'role' | 'isSuspended'>> }) =>
            api.patch<{ user: User }>(`/admin/users/${id}`, data),
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
export type BookingStatus = Booking['status'];

export function useAdminBookings(params: { search?: string; status?: string; page?: number } = {}) {
    return useQuery({
        queryKey: ['admin', 'bookings', params],
        queryFn: () => api.get<{
            bookings: Booking[];
            statusCounts: Partial<Record<BookingStatus, number>>;
            statusChanges: Record<BookingStatus, BookingStatus[]>;
            pagination: Pagination;
        }>(`/admin/bookings${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

export function useUpdateBookingStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
            api.patch<{ booking: Booking }>(`/admin/bookings/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}

// Staff activity log
export interface ActivityEntry {
    _id: string;
    actor?: string;
    actorName?: string;
    actorRole?: User['role'];
    action: 'create' | 'update' | 'delete' | 'import' | 'status';
    resource: string;
    resourceId?: string;
    label?: string;
    detail?: string;
    createdAt: string;
}

export function useActivity(params: { resource?: string; page?: number } = {}) {
    return useQuery({
        queryKey: ['admin', 'activity', params],
        queryFn: () => api.get<{ entries: ActivityEntry[]; resources: string[]; pagination: Pagination }>(`/admin/activity${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}
