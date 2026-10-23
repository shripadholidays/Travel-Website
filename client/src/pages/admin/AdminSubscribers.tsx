import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { PageHeader, SearchField, TableFooter } from '@/components/admin/AdminUI';
import { toQuery } from '@/hooks/use-admin';
import { useDebounced } from '@/hooks/use-debounced';
import type { Pagination } from '@/types';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Download, Mail, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Subscriber {
    _id: string;
    email: string;
    subscribedAt?: string;
    createdAt: string;
}

function useSubscribers(params: { search: string; page: number }) {
    return useQuery({
        queryKey: ['admin', 'subscribers', params],
        queryFn: () => api.get<{ subscribers: Subscriber[]; pagination: Pagination }>(`/admin/subscribers${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

function useDeleteSubscriber() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`/admin/subscribers/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'subscribers'] }),
    });
}

function exportCsv(subscribers: Subscriber[]) {
    const rows = ['Email,Subscribed on', ...subscribers.map(s => `"${s.email.replace(/"/g, '""')}",${(s.subscribedAt || s.createdAt).slice(0, 10)}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export const AdminSubscribers = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debounced = useDebounced(search, 300);
    const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
    const [exporting, setExporting] = useState(false);
    const { data, isLoading } = useSubscribers({ search: debounced, page });
    const deleteSubscriber = useDeleteSubscriber();
    const subscribers = data?.subscribers ?? [];

    // The whole list (with the search applied), not just this page
    const exportAll = async () => {
        setExporting(true);
        try {
            const res = await api.get<{ subscribers: Subscriber[] }>(`/admin/subscribers${toQuery({ search: debounced, all: true })}`);
            exportCsv(res.subscribers);
            toast.success(`Exported ${res.subscribers.length} subscribers.`);
        } catch (err) {
            toast.error((err as Error).message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading('Removing subscriber…');
        try {
            await deleteSubscriber.mutateAsync(deleteTarget._id);
            toast.success('Removed', { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error('Failed to remove', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Newsletter Subscribers"
                description={`${data?.pagination.total ?? 0} people get the newsletter. Export the list to your email tool to send campaigns.`}
                actions={
                    <Button variant="outline" onClick={exportAll} className="gap-1.5" disabled={exporting || !data?.pagination.total}>
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
                    </Button>
                }
            />

            <Card>
                <CardHeader className="pb-3">
                    <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search email…" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Subscribed On</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscribers.length > 0 ? subscribers.map(s => (
                                    <TableRow key={s._id}>
                                        <TableCell className="font-medium">
                                            <span className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{s.email}</span></span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(s.subscribedAt || s.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                                onClick={() => setDeleteTarget(s)}
                                                aria-label={`Remove ${s.email}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No subscribers found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                    <TableFooter pagination={data?.pagination} onPageChange={setPage} noun="subscribers" />
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={o => !o && setDeleteTarget(null)}
                title="Remove subscriber?"
                description={`${deleteTarget?.email} will be removed from the newsletter list.`}
                confirmLabel="Remove"
                destructive
                loading={deleteSubscriber.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
