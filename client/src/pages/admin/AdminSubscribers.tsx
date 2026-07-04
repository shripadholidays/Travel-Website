import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Search, Download, Mail, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Subscriber {
    _id: string;
    email: string;
    subscribedAt?: string;
    createdAt: string;
}

function useSubscribers() {
    return useQuery({
        queryKey: ['admin', 'subscribers'],
        queryFn: () => api.get<{ subscribers: Subscriber[] }>('/admin/subscribers'),
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
    const rows = ['Email,Subscribed At', ...subscribers.map(s => `${s.email},${s.subscribedAt || s.createdAt}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export const AdminSubscribers = () => {
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
    const { data, isLoading } = useSubscribers();
    const deleteSubscriber = useDeleteSubscriber();

    const subscribers = (data?.subscribers ?? []).filter(s =>
        s.email.toLowerCase().includes(search.toLowerCase())
    );

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
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Newsletter Subscribers</h2>
                <p className="text-muted-foreground">Manage email newsletter subscriptions.</p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <CardTitle>Subscribers</CardTitle>
                            <span className="text-sm text-muted-foreground">({(data?.subscribers ?? []).length} total)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="sm"
                                onClick={() => exportCsv(data?.subscribers ?? [])}
                                className="gap-1.5"
                                disabled={!data?.subscribers?.length}
                            >
                                <Download className="w-3.5 h-3.5" /> Export CSV
                            </Button>
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search email…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
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
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            {s.email}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(s.subscribedAt || s.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500"
                                                onClick={() => setDeleteTarget(s)}
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
