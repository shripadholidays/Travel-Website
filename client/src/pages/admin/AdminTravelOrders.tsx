import { useState } from 'react';
import { format } from 'date-fns';
import { BedDouble, Plane, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminTravelOrders, useUpdateAdminTravelOrder } from '@/hooks/use-travel';
import { useEnabledFeatures } from '@/hooks/use-feature';
import { PageHeader } from '@/components/admin/AdminUI';
import type { AdminTravelOrder, FlightOffer, HotelOffer, TravelKind, TravelOrderStatus } from '@/types/travel';

const STATUS_VARIANT: Record<TravelOrderStatus, 'success' | 'secondary' | 'destructive' | 'outline'> = {
    confirmed: 'success',
    pending: 'outline',
    cancelled: 'secondary',
    failed: 'destructive',
};

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function describe(order: AdminTravelOrder) {
    if (order.kind === 'flight') {
        const o = order.offer as FlightOffer;
        const s = o.slices[0];
        return { title: `${s.from} → ${s.to}${o.slices.length > 1 ? ' (return)' : ''}`, sub: `${o.airline.name} · ${s.departDate} ${s.departTime}` };
    }
    const o = order.offer as HotelOffer;
    return { title: o.hotel.name, sub: `${o.roomName} · ${o.checkIn} → ${o.checkOut}` };
}

export const AdminTravelOrders = () => {
    const [kind, setKind] = useState<TravelKind | ''>('');
    const [status, setStatus] = useState<TravelOrderStatus | ''>('');
    const [search, setSearch] = useState('');
    const { data, isLoading } = useAdminTravelOrders({ kind, status });
    const update = useUpdateAdminTravelOrder();
    const features = useEnabledFeatures();

    const orders = (data?.orders ?? []).filter((o) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return [o.user?.email, o.user?.displayName, o.providerRef, o.contact?.email, describe(o).title]
            .some((v) => (v || '').toLowerCase().includes(q));
    });

    const revenue = (data?.orders ?? []).filter((o) => o.status === 'confirmed');
    const margin = revenue.reduce((s, o) => s + o.pricing.markupAmount, 0);

    const setOrderStatus = async (order: AdminTravelOrder, next: TravelOrderStatus) => {
        try {
            await update.mutateAsync({ id: order._id, status: next });
            toast.success(`Order marked ${next}`);
        } catch (err) {
            toast.error((err as Error).message || 'Failed to update order');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Flight & Hotel Orders"
                description={<>Flight and hotel bookings. Listed here even when a service is switched off (flights {features.flights ? 'on' : 'off'}, hotels {features.hotels ? 'on' : 'off'} on the public site).</>}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="p-5">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Confirmed orders</p>
                    <p className="text-2xl font-bold">{revenue.length}</p>
                </CardContent></Card>
                <Card><CardContent className="p-5">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Booked value</p>
                    <p className="text-2xl font-bold">{usd(revenue.reduce((s, o) => s + o.pricing.total, 0))}</p>
                </CardContent></Card>
                <Card className="bg-orange-50 border-orange-100"><CardContent className="p-5">
                    <p className="text-xs text-orange-700 font-semibold uppercase tracking-wider">Markup earned</p>
                    <p className="text-2xl font-bold text-orange-700">{usd(margin)}</p>
                </CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle>All orders</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={kind || 'all'} onValueChange={(v) => setKind(v === 'all' ? '' : (v as TravelKind))}>
                                <SelectTrigger className="w-32 h-9" aria-label="Type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="flight">Flights</SelectItem>
                                    <SelectItem value="hotel">Hotels</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : (v as TravelOrderStatus))}>
                                <SelectTrigger className="w-36 h-9" aria-label="Status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative w-56">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search orders…" aria-label="Search orders" className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : orders.length === 0 ? (
                        <p className="py-10 text-center text-muted-foreground">No travel orders yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking</TableHead>
                                    <TableHead>Traveller</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Supplier</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((o) => {
                                    const d = describe(o);
                                    return (
                                        <TableRow key={o._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {o.kind === 'flight' ? <Plane className="w-4 h-4 text-brand-orange" /> : <BedDouble className="w-4 h-4 text-brand-orange" />}
                                                    <div>
                                                        <p className="font-semibold">{d.title}</p>
                                                        <p className="text-xs text-muted-foreground">{d.sub}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{o.user?.displayName ?? '—'}</p>
                                                <p className="text-xs text-muted-foreground">{o.contact?.email}</p>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {o.providerRef || '—'}
                                                <span className="block text-muted-foreground font-sans">{o.provider}</span>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">{usd(o.pricing.supplierAmount)}</TableCell>
                                            <TableCell className="text-right tabular-nums font-semibold">{usd(o.pricing.total)}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[o.status]} className="capitalize">{o.status}</Badge>
                                                {o.failureReason && <p className="mt-1 text-xs text-red-600 max-w-[180px]">{o.failureReason}</p>}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(o.createdAt), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>
                                                <Select value="" onValueChange={(v) => setOrderStatus(o, v as TravelOrderStatus)}>
                                                    <SelectTrigger className="w-28 h-8" aria-label={`Change status of ${d.title}`}><SelectValue placeholder="Set…" /></SelectTrigger>
                                                    <SelectContent>
                                                        {(['confirmed', 'pending', 'cancelled', 'failed'] as const)
                                                            .filter((s) => s !== o.status)
                                                            .map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
