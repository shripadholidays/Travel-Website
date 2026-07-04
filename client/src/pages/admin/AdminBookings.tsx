import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Search, Download } from "lucide-react";
import { useAdminBookings, useUpdateBookingStatus } from "@/hooks/use-admin";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/context/CurrencyContext";
import type { Booking, Tour } from "@/types";

export const AdminBookings = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
    const { data, isLoading } = useAdminBookings();
    const updateStatus = useUpdateBookingStatus();
    const { formatPrice } = useCurrency();

    const bookings = data?.bookings ?? [];

    const handleStatusChange = async (id: string, newStatus: string) => {
        const toastId = toast.loading("Updating booking status...");
        try {
            await updateStatus.mutateAsync({ id, status: newStatus });
            toast.success(`Booking status updated to ${newStatus}`, { id: toastId });
        } catch {
            toast.error("Failed to update status", { id: toastId });
        }
    };

    const handleCancel = async () => {
        if (!cancelTarget) return;
        await handleStatusChange(cancelTarget._id, 'cancelled');
        setCancelTarget(null);
    };

    const filteredBookings = bookings.filter((booking: Booking) => {
        const q = searchQuery.toLowerCase();
        const email = booking.contactInfo?.email?.toLowerCase() || '';
        const name = `${booking.contactInfo?.firstName} ${booking.contactInfo?.lastName}`.toLowerCase();
        return email.includes(q) || name.includes(q) || booking._id.toLowerCase().includes(q);
    });

    const exportCsv = () => {
        if (filteredBookings.length === 0) {
            toast.error("No bookings to export.");
            return;
        }
        const headers = ['Booking ID', 'Customer', 'Email', 'Tour', 'Travel Date', 'Amount', 'Status'];
        const rows = filteredBookings.map((b: Booking) => {
            const tourName = typeof b.tour === 'object' ? (b.tour as Tour).title : 'Tour';
            return [
                b._id,
                `${b.contactInfo.firstName} ${b.contactInfo.lastName}`,
                b.contactInfo.email,
                tourName,
                new Date(b.travelDate).toLocaleDateString(),
                String(b.totalAmount),
                b.status,
            ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filteredBookings.length} bookings.`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Bookings</h2>
                    <p className="text-muted-foreground">Manage and track all customer reservations.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={exportCsv}>
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Recent Bookings</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search bookings..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2"><Skeleton className="h-4 w-[250px]" /><Skeleton className="h-4 w-[200px]" /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Tour</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBookings.length > 0 ? filteredBookings.map((booking: Booking) => {
                                    const tourName = typeof booking.tour === 'object' ? (booking.tour as Tour).title : 'Tour';
                                    return (
                                        <TableRow key={booking._id}>
                                            <TableCell className="font-medium text-xs">{booking._id.slice(-8)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{booking.contactInfo.firstName} {booking.contactInfo.lastName}</span>
                                                    <span className="text-xs text-muted-foreground">{booking.contactInfo.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{tourName}</TableCell>
                                            <TableCell>{new Date(booking.travelDate).toLocaleDateString()}</TableCell>
                                            <TableCell>{formatPrice(booking.totalAmount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    booking.status === "confirmed" ? "success" :
                                                        booking.status === "pending" ? "warning" : "destructive"
                                                }>
                                                    {booking.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleStatusChange(booking._id, 'confirmed')}>Confirm Booking</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(booking._id, 'completed')}>Mark Completed</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => setCancelTarget(booking)}>Cancel Booking</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No bookings found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!cancelTarget}
                onOpenChange={(o) => !o && setCancelTarget(null)}
                title="Cancel this booking?"
                description={`Booking ${cancelTarget?._id.slice(-8).toUpperCase()} will be marked as cancelled.`}
                confirmLabel="Cancel Booking"
                cancelLabel="Keep It"
                destructive
                loading={updateStatus.isPending}
                onConfirm={handleCancel}
            />
        </div>
    );
};
