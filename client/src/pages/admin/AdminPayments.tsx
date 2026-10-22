import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CreditCard, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Payment {
    _id: string;
    booking?: string;
    user?: { displayName: string; email: string };
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed' | 'refunded';
    stripePaymentId?: string;
    createdAt: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
    succeeded: 'success',
    pending: 'outline',
    failed: 'destructive',
    refunded: 'secondary',
};

function usePayments() {
    return useQuery({
        queryKey: ['admin', 'payments'],
        queryFn: () => api.get<{ payments: Payment[] }>('/admin/payments'),
    });
}

function formatCurrency(amount: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

export const AdminPayments = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { data, isLoading } = usePayments();

    const payments = (data?.payments ?? []).filter(p => {
        const matchSearch = (p.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.user?.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.stripePaymentId || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalRevenue = (data?.payments ?? [])
        .filter(p => p.status === 'succeeded')
        .reduce((acc, p) => acc + p.amount, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Payments</h2>
                <p className="text-muted-foreground">Stripe payment records and transaction history.</p>
            </div>

            {/* Summary card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total Revenue</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Transactions</p>
                            <p className="text-2xl font-bold">{(data?.payments ?? []).length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Successful</p>
                            <p className="text-2xl font-bold">
                                {(data?.payments ?? []).filter(p => p.status === 'succeeded').length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle>All Transactions</CardTitle>
                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="succeeded">Succeeded</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search payments…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.length > 0 ? payments.map(p => (
                                    <TableRow key={p._id}>
                                        <TableCell>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {p.stripePaymentId ? p.stripePaymentId.slice(0, 24) + '…' : p._id.slice(-12)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-sm">{p.user?.displayName || '—'}</p>
                                            <p className="text-xs text-muted-foreground">{p.user?.email || '—'}</p>
                                        </TableCell>
                                        <TableCell className="font-bold text-brand-blue">
                                            {formatCurrency(p.amount, p.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[p.status] ?? 'secondary'}>
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(p.createdAt), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No payments found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
