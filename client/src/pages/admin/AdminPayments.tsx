import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CreditCard, TrendingUp, RotateCcw, AlertCircle, Plane, BedDouble, Map } from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, PageHeader, SearchField, StatusPill, StatusTabs, TableFooter, type Tone } from '@/components/admin/AdminUI';
import { toQuery } from '@/hooks/use-admin';
import { useDebounced } from '@/hooks/use-debounced';
import type { Pagination } from '@/types';

// Mirrors server/src/models/Payment.js (amounts are in dollars, not cents)
interface Payment {
    _id: string;
    booking?: { _id: string; status: string; tour?: { _id: string; title: string } | null } | null;
    order?: { _id: string; kind: 'flight' | 'hotel'; status: string; providerRef?: string } | null;
    user?: { displayName: string; email: string } | null;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    stripePaymentIntentId?: string;
    createdAt: string;
}

type Summary = Partial<Record<Payment['status'], { count: number; amount: number }>>;

const STATUS: Record<Payment['status'], { label: string; tone: Tone }> = {
    completed: { label: 'Paid', tone: 'green' },
    pending: { label: 'Pending', tone: 'amber' },
    failed: { label: 'Failed', tone: 'red' },
    refunded: { label: 'Refunded', tone: 'slate' },
};

const money = (amount: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount || 0);

function usePayments(params: { status: string; search: string; page: number }) {
    return useQuery({
        queryKey: ['admin', 'payments', params],
        queryFn: () => api.get<{ payments: Payment[]; summary: Summary; pagination: Pagination }>(`/admin/payments${toQuery(params)}`),
        placeholderData: keepPreviousData,
    });
}

export const AdminPayments = () => {
    const [params, setParams] = useSearchParams();
    const status = params.get('status') ?? 'all';
    const page = Number(params.get('page') || 1);
    const [search, setSearch] = useState('');
    const debounced = useDebounced(search, 300);
    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== 'all' && !(key === 'page' && value === '1')) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    };

    const { data, isLoading } = usePayments({ status, search: debounced, page });
    const payments = data?.payments ?? [];
    const s = data?.summary ?? {};
    const totalCount = Object.values(s).reduce((n, x) => n + (x?.count ?? 0), 0);

    const cards = [
        { label: 'Collected', value: money(s.completed?.amount ?? 0), sub: `${s.completed?.count ?? 0} payments`, icon: TrendingUp, accent: true },
        { label: 'Refunded', value: money(s.refunded?.amount ?? 0), sub: `${s.refunded?.count ?? 0} payments`, icon: RotateCcw },
        { label: 'Failed or pending', value: String((s.failed?.count ?? 0) + (s.pending?.count ?? 0)), sub: 'not charged', icon: AlertCircle },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Payments" description="Every card payment for tours, flights and hotels, as recorded from Stripe. Amounts are in US dollars." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cards.map(({ label, value, sub, icon: Icon, accent }) => (
                    <Card key={label} className={accent ? 'bg-emerald-50 border-emerald-100' : ''}>
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={accent ? 'w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center' : 'w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center'}>
                                <Icon className={accent ? 'w-5 h-5 text-white' : 'w-5 h-5 text-slate-500'} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                                {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : <p className="text-2xl font-bold tabular-nums text-brand-blue">{value}</p>}
                                <p className="text-xs text-muted-foreground">{sub}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs value={status} onChange={(v) => setParam('status', v)} options={[
                        { id: 'all', label: 'All', count: totalCount },
                        { id: 'completed', label: 'Paid', count: s.completed?.count ?? 0 },
                        { id: 'refunded', label: 'Refunded', count: s.refunded?.count ?? 0 },
                        { id: 'pending', label: 'Pending', count: s.pending?.count ?? 0 },
                        { id: 'failed', label: 'Failed', count: s.failed?.count ?? 0 },
                    ]} />
                    <SearchField value={search} onChange={(v) => { setSearch(v); setParam('page', '1'); }} placeholder="Customer or Stripe ID…" className="sm:w-80" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : payments.length === 0 ? (
                        <EmptyState icon={CreditCard} title="No payments found" description={debounced || status !== 'all' ? 'Try another search or status.' : 'Payments appear here once travellers pay by card.'} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="hidden md:table-cell">For</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p) => (
                                        <TableRow key={p._id}>
                                            <TableCell>
                                                <p className="font-medium text-sm">{p.user?.displayName || '—'}</p>
                                                <p className="text-xs text-muted-foreground">{p.user?.email || '—'}</p>
                                                {p.stripePaymentIntentId && <p className="font-mono text-[11px] text-slate-400 truncate max-w-[200px]" title={p.stripePaymentIntentId}>{p.stripePaymentIntentId}</p>}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm">
                                                {p.booking ? (
                                                    <Link to={`/bookings/${p.booking._id}`} target="_blank" className="inline-flex items-center gap-1.5 hover:text-brand-orange">
                                                        <Map className="w-3.5 h-3.5 text-muted-foreground" /> {p.booking.tour?.title ?? 'Tour booking'}
                                                    </Link>
                                                ) : p.order ? (
                                                    <span className="inline-flex items-center gap-1.5 capitalize">
                                                        {p.order.kind === 'flight' ? <Plane className="w-3.5 h-3.5 text-muted-foreground" /> : <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />}
                                                        {p.order.kind} {p.order.providerRef && <span className="font-mono text-xs text-muted-foreground">{p.order.providerRef}</span>}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums text-brand-blue">{money(p.amount, p.currency)}</TableCell>
                                            <TableCell><StatusPill tone={STATUS[p.status]?.tone ?? 'slate'}>{STATUS[p.status]?.label ?? p.status}</StatusPill></TableCell>
                                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">{format(new Date(p.createdAt), 'd MMM yyyy, HH:mm')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam('page', String(p))} noun="payments" />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
