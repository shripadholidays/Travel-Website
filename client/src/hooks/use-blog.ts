import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { BlogPost } from '@/types';

export function useBlogPosts() {
    return useQuery({
        queryKey: ['blog'],
        queryFn: () => api.get<{ posts: BlogPost[] }>('/blog'),
    });
}

export function useBlogPost(slug: string) {
    return useQuery({
        queryKey: ['blog', slug],
        queryFn: () => api.get<{ post: BlogPost }>(`/blog/${slug}`),
        enabled: !!slug,
    });
}

export function useCreateBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<BlogPost>) =>
            api.post<{ post: BlogPost }>('/blog', data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
    });
}

export function useUpdateBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<BlogPost> }) =>
            api.put<{ post: BlogPost }>(`/blog/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
    });
}

export function useDeleteBlogPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/blog/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog'] }),
    });
}
