import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { BlogPost } from '@/types';

export function useBlogPosts(options: { limit?: number } = {}) {
    const qs = options.limit ? `?limit=${options.limit}` : '';
    return useQuery({
        queryKey: ['blog', 'list', options],
        queryFn: () => api.get<{ posts: BlogPost[] }>(`/blog${qs}`),
    });
}

/** The signed-in writer's own articles, every status. */
export function useMyBlogPosts(enabled = true) {
    return useQuery({
        queryKey: ['blog', 'mine'],
        queryFn: () => api.get<{ posts: BlogPost[] }>('/blog/mine'),
        enabled,
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
