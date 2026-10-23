import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Mail, Phone, MessageSquare } from 'lucide-react';
import { EmptyState, PageHeader, SearchField, StatusTabs, TableFooter } from '@/components/admin/AdminUI';
import { toQuery } from '@/hooks/use-admin';
import { useDebounced } from '@/hooks/use-debounced';
import type { Pagination } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

// Mirrors server/src/models/UserInquiry.js
interface Inquiry {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    preferredTravelDate?: string;
    numberOfTravelers?: number;
    message?: string;
    topic?: 'trip' | 'booking' | 'question' | 'other';
    context?: string;
    source?: 'contact' | 'chat' | 'no-results' | 'tour' | 'destination';
    status: 'new' | 'read' | 'replied';
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    read: 'bg-slate-50 text-slate-600 border-slate-200',
    replied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TOPIC_LABELS: Record<string, string> = {
    trip: 'Trip request',
    booking: 'Booking question',
    question: 'General question',
    other: 'Other',
};

const SOURCE_LABELS: Record<string, string> = {
    contact: 'Contact page',
    chat: 'Homepage message box',
    'no-results': 'Empty search',
    tour: 'Tour page',
    destination: 'Destination page',
};

function tripSummary(i: Inquiry) {
    if (i.topic && i.topic !== 'trip') return TOPIC_LABELS[i.topic];
    // The homepage message box asks for no trip details, so don't show the defaults as if they were given
    if (i.source === 'chat') return i.context || 'Trip idea (message box)';
    const parts = [
        i.preferredTravelDate ? format(new Date(i.preferredTravelDate), 'MMM d, yyyy') : null,
        i.numberOfTravelers ? `${i.numberOfTravelers} traveller${i.numberOfTravelers === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    if (i.context) parts.unshift(i.context);
    return parts.length ? parts.join(' · ') : 'Dates flexible';
}

function useInquiries(params: { status: string; search: string; page: number }) {
    return useQuery({
        queryKey: ['admin', 'inquiries', params],
        queryFn: () => api.get<{ inquiries: Inquiry[]; statusCounts: Partial<Record<Inquiry['status'], number>>; pagination: Pagination }>(`/admin/inquiries${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

function useUpdateInquiry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/admin/inquiries/${id}`, { status }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] });
            qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
        },
    });
}

export const AdminInquiries = () => {
    const [params, setParams] = useSearchParams();
    const filter = params.get('status') ?? 'all';
    const page = Number(params.get('page') || 1);
    const [search, setSearch] = useState('');
    const debounced = useDebounced(search, 300);
    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== 'all' && !(key === 'page' && value === '1')) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };
    const [selected, setSelected] = useState<Inquiry | null>(null);
    const { data, isLoading } = useInquiries({ status: filter, search: debounced, page });
    const updateStatus = useUpdateInquiry();
    const inquiries = data?.inquiries ?? [];
    const counts = data?.statusCounts ?? {};

    const changeStatus = async (id: string, status: string, quiet = false) => {
        try {
            await updateStatus.mutateAsync({ id, status });
            if (!quiet) toast.success(`Marked ${status}`);
        } catch {
            toast.error('Failed to update');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Inquiries" description="Messages from the Contact page, the homepage message box, and tour and destination pages. Opening one marks it read." />

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs value={filter} onChange={(v) => setParam('status', v)} options={[
                        { id: 'all', label: 'All', count: (counts.new ?? 0) + (counts.read ?? 0) + (counts.replied ?? 0) },
                        { id: 'new', label: 'New', count: counts.new ?? 0, tone: 'orange' },
                        { id: 'read', label: 'Read', count: counts.read ?? 0 },
                        { id: 'replied', label: 'Replied', count: counts.replied ?? 0 },
                    ]} />
                    <SearchField value={search} onChange={(v) => { setSearch(v); setParam('page', '1'); }} placeholder="Name, email or message…" className="sm:w-80" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead className="hidden md:table-cell">Trip / Message</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inquiries.length > 0 ? inquiries.map(inquiry => (
                                    <TableRow key={inquiry._id} className="cursor-pointer" onClick={() => { setSelected(inquiry); if (inquiry.status === 'new') changeStatus(inquiry._id, 'read', true); }}>
                                        <TableCell>
                                            <p className="font-semibold">{inquiry.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <p className="text-sm font-medium truncate max-w-[220px]">{tripSummary(inquiry)}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{inquiry.message || 'No message'}</p>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                                            {format(new Date(inquiry.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_COLORS[inquiry.status]}`}>
                                                {inquiry.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${inquiry.fullName}`}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => changeStatus(inquiry._id, 'read')}>Mark Read</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changeStatus(inquiry._id, 'replied')}>Mark Replied</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => changeStatus(inquiry._id, 'new')}>Mark New</DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href={`mailto:${inquiry.email}`} className="flex items-center gap-2">
                                                            <Mail className="w-3.5 h-3.5" /> Reply via Email
                                                        </a>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5}><EmptyState icon={MessageSquare} title="No inquiries found" description={debounced || filter !== 'all' ? 'Try another search or status.' : 'Messages from travellers will appear here.'} /></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                    <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam('page', String(p))} noun="inquiries" />
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Inquiry from {selected?.fullName}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="flex gap-4 text-sm">
                                <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-brand-orange hover:underline">
                                    <Mail className="w-3.5 h-3.5" /> {selected.email}
                                </a>
                                {selected.phoneNumber && (
                                    <a href={`tel:${selected.phoneNumber}`} className="flex items-center gap-1 text-brand-orange hover:underline">
                                        <Phone className="w-3.5 h-3.5" /> {selected.phoneNumber}
                                    </a>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{selected.topic && selected.topic !== 'trip' ? 'Topic' : 'Trip'}</p>
                                    <p className="font-semibold">{tripSummary(selected)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sent from</p>
                                    <p className="font-semibold">{SOURCE_LABELS[selected.source ?? 'contact']}</p>
                                </div>
                            </div>
                            {selected.context && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">About</p>
                                    <p className="text-sm">{selected.context}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4">{selected.message || 'No message'}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" asChild>
                                    <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.context || 'Your Wandeazy inquiry'}`)}`}>
                                        <Mail className="w-3.5 h-3.5 mr-1.5" /> Reply via Email
                                    </a>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { changeStatus(selected._id, 'replied'); setSelected(null); }}>
                                    Mark Replied
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
