import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { User } from '@/types';

// Auth/session is managed by AuthContext; this hook only handles profile updates.
export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { displayName?: string; profilePicture?: string }) =>
            api.patch<{ user: User }>('/users/profile', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
    });
}
