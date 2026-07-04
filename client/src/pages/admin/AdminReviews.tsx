import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Search, Star, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Review } from '@/types';

function useAdminReviews() {
    return useQuery({
        queryKey: ['admin', 'reviews'],
        queryFn: () => api.get<{ reviews: Review[] }>('/admin/reviews'),
    });
}

function useDeleteReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
    });
}

export const AdminReviews = () => {
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
    const { data, isLoading } = useAdminReviews();
    const deleteReview = useDeleteReview();

    const reviews = (data?.reviews ?? []).filter(r =>
        (r.user?.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
        r.content.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading('Deleting review…');
        try {
            await deleteReview.mutateAsync(deleteTarget._id);
            toast.success('Review deleted', { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error('Failed to delete', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Reviews</h2>
                <p className="text-muted-foreground">Moderate customer reviews across all tours.</p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle>All Reviews ({(data?.reviews ?? []).length})</CardTitle>
                        <div className="relative w-56">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search reviews…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Review</TableHead>
                                    <TableHead>Tour</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.length > 0 ? reviews.map(review => (
                                    <TableRow key={review._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {review.user?.profilePicture && (
                                                    <img src={review.user.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                )}
                                                <span className="font-medium text-sm">{review.user?.displayName || 'Unknown'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                                ))}
                                                <span className="ml-1 text-xs font-bold">{review.rating}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm line-clamp-2 max-w-[250px]">{review.content}</p>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[80px]">
                                            {typeof review.tour === 'string' ? review.tour.slice(-8) : ''}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(review.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                                onClick={() => setDeleteTarget(review)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No reviews found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={o => !o && setDeleteTarget(null)}
                title="Delete review?"
                description="This review will be permanently removed from the tour."
                confirmLabel="Delete"
                destructive
                loading={deleteReview.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
