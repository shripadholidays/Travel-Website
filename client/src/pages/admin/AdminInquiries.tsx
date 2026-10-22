import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Inquiry {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    status: 'new' | 'read' | 'replied';
    createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    read: 'bg-slate-50 text-slate-600 border-slate-200',
    replied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function useInquiries() {
    return useQuery({
        queryKey: ['admin', 'inquiries'],
        queryFn: () => api.get<{ inquiries: Inquiry[] }>('/admin/inquiries'),
    });
}

function useUpdateInquiry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            api.patch(`/admin/inquiries/${id}`, { status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] }),
    });
}

export const AdminInquiries = () => {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<string>('all');
    const [selected, setSelected] = useState<Inquiry | null>(null);
    const { data, isLoading } = useInquiries();
    const updateStatus = useUpdateInquiry();

    const inquiries = (data?.inquiries ?? []).filter(i => {
        const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || i.status === filter;
        return matchSearch && matchFilter;
    });

    const changeStatus = async (id: string, status: string) => {
        const toastId = toast.loading('Updating…');
        try {
            await updateStatus.mutateAsync({ id, status });
            toast.success('Status updated', { id: toastId });
        } catch {
            toast.error('Failed to update', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Inquiries</h2>
                <p className="text-muted-foreground">Contact form submissions from potential customers.</p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle>All Inquiries</CardTitle>
                        <div className="flex items-center gap-2">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="read">Read</SelectItem>
                                    <SelectItem value="replied">Replied</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>Subject / Message</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inquiries.length > 0 ? inquiries.map(inquiry => (
                                    <TableRow key={inquiry._id} className="cursor-pointer" onClick={() => { setSelected(inquiry); changeStatus(inquiry._id, inquiry.status === 'new' ? 'read' : inquiry.status); }}>
                                        <TableCell>
                                            <p className="font-semibold">{inquiry.name}</p>
                                            <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium truncate max-w-[200px]">{inquiry.subject || 'No subject'}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{inquiry.message}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
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
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No inquiries found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Inquiry from {selected?.name}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="flex gap-4 text-sm">
                                <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-brand-orange hover:underline">
                                    <Mail className="w-3.5 h-3.5" /> {selected.email}
                                </a>
                                {selected.phone && (
                                    <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-brand-orange hover:underline">
                                        <Phone className="w-3.5 h-3.5" /> {selected.phone}
                                    </a>
                                )}
                            </div>
                            {selected.subject && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                                    <p className="font-semibold">{selected.subject}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4">{selected.message}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" asChild>
                                    <a href={`mailto:${selected.email}?subject=Re: ${selected.subject || 'Your Inquiry'}`}>
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
