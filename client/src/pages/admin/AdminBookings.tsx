import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { MoreHorizontal, Download, Calendar, Loader2, Mail, Phone, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, SearchField, StatusPill, StatusTabs, TableFooter, type Tone } from "@/components/admin/AdminUI";
import { useAdminBookings, useUpdateBookingStatus, toQuery, type BookingStatus } from "@/hooks/use-admin";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/services/api";
import type { Booking, Pagination, Tour } from "@/types";

const STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
    pending: { label: "Awaiting payment", tone: "amber" },
    confirmed: { label: "Confirmed", tone: "green" },
    completed: { label: "Completed", tone: "blue" },
    cancelled: { label: "Cancelled", tone: "slate" },
};

const ACTION_LABEL: Record<BookingStatus, string> = {
    confirmed: "Mark as paid & confirm",
    completed: "Mark trip completed",
    cancelled: "Cancel & refund",
    pending: "Back to pending",
};

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const ref = (b: Booking) => b._id.slice(-8).toUpperCase();
const tourOf = (b: Booking) => (typeof b.tour === "object" && b.tour ? (b.tour as Tour) : null);

export const AdminBookings = () => {
    const [params, setParams] = useSearchParams();
    const status = params.get("status") ?? "all";
    const page = Number(params.get("page") || 1);
    const [search, setSearch] = useState(params.get("q") ?? "");
    const debounced = useDebounced(search, 300);

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== "all" && !(key === "page" && value === "1")) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next, { replace: true });
    };

    const { data, isLoading, isFetching } = useAdminBookings({ search: debounced, status, page });
    const updateStatus = useUpdateBookingStatus();
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const [detail, setDetail] = useState<Booking | null>(null);
    const [exporting, setExporting] = useState(false);

    const bookings = data?.bookings ?? [];
    const counts = data?.statusCounts ?? {};
    const changes = data?.statusChanges;
    const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

    const changeStatus = async (booking: Booking, next: BookingStatus) => {
        const toastId = toast.loading("Updating booking…");
        try {
            await updateStatus.mutateAsync({ id: booking._id, status: next });
            toast.success(`Booking ${ref(booking)}: ${STATUS[next].label.toLowerCase()}.`, { id: toastId });
            setDetail(null);
        } catch (err) {
            toast.error((err as Error).message || "Failed to update the booking", { id: toastId });
        }
    };

    // Every matching booking, not just the page on screen
    const exportCsv = async () => {
        setExporting(true);
        try {
            const all: Booking[] = [];
            for (let p = 1; p <= 50; p += 1) {
                const res = await api.get<{ bookings: Booking[]; pagination: Pagination }>(`/admin/bookings${toQuery({ search: debounced, status, page: p, limit: 200 })}`);
                all.push(...res.bookings);
                if (p >= res.pagination.pages) break;
            }
            if (all.length === 0) { toast.error("No bookings to export."); return; }
            const headers = ["Reference", "Booked on", "Traveller", "Email", "Phone", "Tour", "Travel date", "Travellers", "Add-ons", "Coupon", "Total (USD)", "Refunded (USD)", "Status"];
            const rows = all.map((b) => [
                ref(b), format(new Date(b.createdAt), "yyyy-MM-dd"),
                `${b.contactInfo.firstName} ${b.contactInfo.lastName}`, b.contactInfo.email, b.contactInfo.phone,
                tourOf(b)?.title ?? "", format(new Date(b.travelDate), "yyyy-MM-dd"), b.numberOfTravelers,
                (b.addons ?? []).map((a) => a.name).join("; "), b.coupon?.code ?? "", b.totalAmount, b.refundedAmount ?? "", STATUS[b.status].label,
            ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
            const url = URL.createObjectURL(new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookings-${status}-${format(new Date(), "yyyy-MM-dd")}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${all.length} booking${all.length === 1 ? "" : "s"}.`);
        } catch (err) {
            toast.error((err as Error).message || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    const nextSteps = (b: Booking) => (changes?.[b.status] ?? []) as BookingStatus[];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bookings"
                description="Tour reservations. Cancelling refunds the card payment automatically."
                actions={
                    <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={exporting}>
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
                    </Button>
                }
            />

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs
                        value={status}
                        onChange={(v) => setParam("status", v)}
                        options={[
                            { id: "all", label: "All", count: total },
                            { id: "pending", label: "Awaiting payment", count: counts.pending ?? 0, tone: "orange" },
                            { id: "confirmed", label: "Confirmed", count: counts.confirmed ?? 0 },
                            { id: "completed", label: "Completed", count: counts.completed ?? 0 },
                            { id: "cancelled", label: "Cancelled", count: counts.cancelled ?? 0 },
                        ]}
                    />
                    <div className="flex items-center gap-3">
                        <SearchField value={search} onChange={(v) => { setSearch(v); setParam("q", v); }} placeholder="Name, email or reference…" className="sm:w-80" />
                        {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : bookings.length === 0 ? (
                        <EmptyState icon={Calendar} title={debounced || status !== "all" ? "No bookings match" : "No bookings yet"}
                            description={debounced || status !== "all" ? "Try another search or status." : "Bookings appear here as soon as travellers check out."} />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Traveller</TableHead>
                                        <TableHead className="hidden md:table-cell">Tour</TableHead>
                                        <TableHead className="hidden sm:table-cell">Travel date</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.map((b) => (
                                        <TableRow key={b._id} className="cursor-pointer" onClick={() => setDetail(b)}>
                                            <TableCell>
                                                <p className="font-medium">{b.contactInfo.firstName} {b.contactInfo.lastName}</p>
                                                <p className="text-xs text-muted-foreground">{b.contactInfo.email}</p>
                                                <p className="text-[11px] font-mono text-slate-400">#{ref(b)}</p>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <p className="line-clamp-1">{tourOf(b)?.title ?? "Tour removed"}</p>
                                                <p className="text-xs text-muted-foreground">{b.numberOfTravelers} traveller{b.numberOfTravelers === 1 ? "" : "s"}</p>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell whitespace-nowrap">{format(new Date(b.travelDate), "d MMM yyyy")}</TableCell>
                                            <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">
                                                {usd(b.totalAmount)}
                                                {!!b.refundedAmount && <span className="block text-xs font-normal text-muted-foreground">refunded {usd(b.refundedAmount)}</span>}
                                            </TableCell>
                                            <TableCell><StatusPill tone={STATUS[b.status].tone}>{STATUS[b.status].label}</StatusPill></TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for booking ${ref(b)}`}><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem onClick={() => setDetail(b)}>View details</DropdownMenuItem>
                                                        <DropdownMenuItem asChild><Link to={`/bookings/${b._id}`} target="_blank">Open receipt</Link></DropdownMenuItem>
                                                        <DropdownMenuItem asChild><a href={`mailto:${b.contactInfo.email}?subject=${encodeURIComponent(`Your booking ${ref(b)}`)}`}>Email traveller</a></DropdownMenuItem>
                                                        {nextSteps(b).length > 0 && <DropdownMenuSeparator />}
                                                        {nextSteps(b).map((s) => (
                                                            <DropdownMenuItem key={s} className={s === "cancelled" ? "text-red-600 focus:text-red-600" : undefined}
                                                                onClick={() => (s === "cancelled" ? setCancelTarget(b) : changeStatus(b, s))}>
                                                                {ACTION_LABEL[s]}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam("page", String(p))} noun="bookings" />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Details */}
            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    {detail && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex flex-wrap items-center gap-2">Booking #{ref(detail)} <StatusPill tone={STATUS[detail.status].tone}>{STATUS[detail.status].label}</StatusPill></DialogTitle>
                                <DialogDescription>Booked {format(new Date(detail.createdAt), "d MMM yyyy, HH:mm")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 text-sm">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="font-semibold text-brand-blue">{tourOf(detail)?.title ?? "Tour removed"}</p>
                                    <p className="text-muted-foreground">{tourOf(detail)?.location}</p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                        <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(detail.travelDate), "EEE d MMM yyyy")}</span>
                                        <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {detail.numberOfTravelers} traveller{detail.numberOfTravelers === 1 ? "" : "s"}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Lead traveller</p>
                                    <p className="font-medium">{detail.contactInfo.firstName} {detail.contactInfo.lastName}</p>
                                    <div className="flex flex-wrap gap-4 mt-1">
                                        <a href={`mailto:${detail.contactInfo.email}`} className="inline-flex items-center gap-1 text-brand-orange hover:underline"><Mail className="w-3.5 h-3.5" /> {detail.contactInfo.email}</a>
                                        {detail.contactInfo.phone && <a href={`tel:${detail.contactInfo.phone}`} className="inline-flex items-center gap-1 text-brand-orange hover:underline"><Phone className="w-3.5 h-3.5" /> {detail.contactInfo.phone}</a>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Price</p>
                                    <dl className="space-y-1">
                                        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{usd(detail.subtotalAmount ?? detail.totalAmount)}</dd></div>
                                        {(detail.addons ?? []).map((a) => <div key={a.name} className="flex justify-between text-muted-foreground"><dt>incl. {a.name}</dt><dd className="tabular-nums">{usd(a.price)}</dd></div>)}
                                        {detail.coupon && <div className="flex justify-between text-emerald-700"><dt>Coupon {detail.coupon.code}</dt><dd className="tabular-nums">−{usd(detail.coupon.discount)}</dd></div>}
                                        <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total charged</dt><dd className="tabular-nums">{usd(detail.totalAmount)}</dd></div>
                                        {!!detail.refundedAmount && <div className="flex justify-between text-muted-foreground"><dt>Refunded</dt><dd className="tabular-nums">{usd(detail.refundedAmount)}</dd></div>}
                                    </dl>
                                </div>
                                {detail.specialRequests && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Special requests</p>
                                        <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{detail.specialRequests}</p>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    <Button size="sm" variant="outline" asChild className="gap-1.5"><Link to={`/bookings/${detail._id}`} target="_blank"><Receipt className="w-3.5 h-3.5" /> Receipt</Link></Button>
                                    {nextSteps(detail).map((s) => (
                                        <Button key={s} size="sm" variant={s === "cancelled" ? "outline" : "default"} disabled={updateStatus.isPending}
                                            className={s === "cancelled" ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-brand-blue"}
                                            onClick={() => (s === "cancelled" ? setCancelTarget(detail) : changeStatus(detail, s))}>
                                            {ACTION_LABEL[s]}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                title={`Cancel booking #${cancelTarget ? ref(cancelTarget) : ""}?`}
                description="The booking is cancelled, any card payment is refunded to the traveller, and a used coupon is given back. This can't be undone."
                confirmLabel="Cancel & refund"
                cancelLabel="Keep booking"
                destructive
                loading={updateStatus.isPending}
                onConfirm={async () => { if (cancelTarget) { await changeStatus(cancelTarget, "cancelled"); setCancelTarget(null); } }}
            />
        </div>
    );
};
