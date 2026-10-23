import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Star, Trash2, BadgeCheck } from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader, SearchField, StatusTabs, TableFooter } from '@/components/admin/AdminUI';
import { toQuery } from '@/hooks/use-admin';
import { useDebounced } from '@/hooks/use-debounced';
import type { Pagination, Review } from '@/types';

function useAdminReviews(params: { search: string; rating: string; page: number }) {
    return useQuery({
        queryKey: ['admin', 'reviews', params],
        queryFn: () => api.get<{ reviews: Review[]; pagination: Pagination }>(`/admin/reviews${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

function useDeleteReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
            // The tour's rating is recalculated
            qc.invalidateQueries({ queryKey: ['tours'] });
        },
    });
}

export const AdminReviews = () => {
    const [params, setParams] = useSearchParams();
    const rating = params.get('rating') ?? 'all';
    const page = Number(params.get('page') || 1);
    const [search, setSearch] = useState('');
    const debounced = useDebounced(search, 300);
    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== 'all' && !(key === 'page' && value === '1')) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };

    const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
    const { data, isLoading } = useAdminReviews({ search: debounced, rating, page });
    const deleteReview = useDeleteReview();
    const reviews = data?.reviews ?? [];

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading('Removing review…');
        try {
            await deleteReview.mutateAsync(deleteTarget._id);
            toast.success('Review removed. The tour rating has been updated.', { id: toastId });
            setDeleteTarget(null);
        } catch (err) {
            toast.error((err as Error).message || 'Failed to remove the review', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Reviews" description="What travellers say about each tour. Remove only reviews that break the rules (spam, abuse, private details); low ratings are honest feedback." />

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs value={rating} onChange={(v) => setParam('rating', v)} label="Filter by rating" options={[
                        { id: 'all', label: 'All ratings', count: rating === 'all' ? data?.pagination.total : undefined },
                        ...['5', '4', '3', '2', '1'].map((r) => ({ id: r, label: `${r} ★` })),
                    ]} />
                    <SearchField value={search} onChange={(v) => { setSearch(v); setParam('page', '1'); }} placeholder="Text, traveller or tour…" className="sm:w-80" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                    ) : reviews.length === 0 ? (
                        <EmptyState icon={Star} title="No reviews found" description={debounced || rating !== 'all' ? 'Try another search or rating.' : 'Reviews appear once travellers rate their tours.'} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Review</TableHead>
                                        <TableHead className="hidden md:table-cell">Tour</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reviews.map((review) => {
                                        const tour = typeof review.tour === 'object' && review.tour ? review.tour : null;
                                        return (
                                            <TableRow key={review._id}>
                                                <TableCell className="max-w-md">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                                            ))}
                                                        </span>
                                                        <span className="text-sm font-medium truncate">{review.user?.displayName || 'Deleted account'}</span>
                                                        {review.isVerifiedBooking && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Booked this tour" />}
                                                    </div>
                                                    {review.title && <p className="mt-1 text-sm font-semibold">{review.title}</p>}
                                                    <p className="mt-0.5 text-sm text-slate-600 line-clamp-3">{review.content}</p>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-sm">
                                                    {tour ? <Link to={`/tour/${tour._id}`} target="_blank" className="hover:text-brand-orange line-clamp-2">{tour.title}</Link> : <span className="text-muted-foreground">Tour removed</span>}
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">{format(new Date(review.createdAt), 'd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => setDeleteTarget(review)} aria-label={`Remove review by ${review.user?.displayName ?? 'traveller'}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam('page', String(p))} noun="reviews" />
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Remove this review?"
                description="It is permanently removed from the tour and the tour's rating is recalculated."
                confirmLabel="Remove"
                destructive
                loading={deleteReview.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
