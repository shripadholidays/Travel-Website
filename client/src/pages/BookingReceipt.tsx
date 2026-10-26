import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addDays, format } from "date-fns";
import { bookingReference, cancellationWindow } from "@/lib/bookings";
import { toast } from "sonner";
import {
    ArrowLeft, CalendarDays, CalendarPlus, Check, MapPin, MessageCircle, Printer, Users, X, Mail, Phone, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";
import { useBooking, useCancelBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { describePackageChoice } from "@/lib/package-options";
import type { Booking, Tour } from "@/types";

const STATUS_STYLES: Record<Booking["status"], string> = {
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
};

const STATUS_TEXT: Record<Booking["status"], string> = {
    confirmed: "Confirmed",
    pending: "Awaiting payment",
    cancelled: "Cancelled",
    completed: "Trip completed",
};

// A calendar file for the trip, so it lands in the traveller's own calendar
function downloadCalendarFile(booking: Booking, tour: Tour | null) {
    const start = new Date(booking.travelDate);
    const end = addDays(start, tour?.duration?.days || 1);
    const day = (d: Date) => format(d, "yyyyMMdd");
    const text = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
    const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wandeazy//Booking//EN", "BEGIN:VEVENT",
        `UID:${booking._id}@wandeazy`,
        `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`,
        `DTSTART;VALUE=DATE:${day(start)}`,
        `DTEND;VALUE=DATE:${day(end)}`,
        `SUMMARY:${text(tour?.title ?? "Wandeazy trip")}`,
        `LOCATION:${text(tour?.location ?? "")}`,
        `DESCRIPTION:${text(`Booking ${bookingReference(booking._id)} · ${booking.numberOfTravelers} traveller(s)`)}`,
        "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `wandeazy-${bookingReference(booking._id)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
}

export const BookingReceipt = () => {
    const { id = "" } = useParams();
    const { user } = useAuth();
    const { data, isLoading, isError } = useBooking(id);
    const cancelBooking = useCancelBooking();
    const [confirmCancel, setConfirmCancel] = useState(false);

    if (isLoading) {
        return <div className="min-h-screen pt-24 flex items-center justify-center"><Spinner label="Loading your booking…" /></div>;
    }

    const booking = data?.booking;
    if (isError || !booking) {
        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-center px-4">
                <PageTitle title="Booking not found" noIndex />
                <h1 className="text-3xl font-display font-bold mb-3">We couldn't find that booking</h1>
                <p className="text-muted-foreground mb-6">It may belong to another account.</p>
                <Button variant="brand" asChild><Link to="/dashboard">Go to my bookings</Link></Button>
            </div>
        );
    }

    const tour = typeof booking.tour === "object" ? (booking.tour as Tour) : null;
    const ref = bookingReference(booking._id);
    const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: booking.currency || "USD" }).format(n);
    const start = new Date(booking.travelDate);
    // The length booked, when the tour came in several
    const tripDays = booking.packageChoice?.days ?? tour?.duration?.days;
    const end = tripDays ? addDays(start, tripDays - 1) : null;
    // What was charged per person, in the booking's currency (older bookings fall back to the tour's price)
    const unit = booking.unitPrice ?? tour?.price ?? null;
    const tourLine = unit !== null ? unit * booking.numberOfTravelers : null;
    const packageLine = describePackageChoice(booking.packageChoice);
    const subtotal = booking.subtotalAmount ?? booking.totalAmount;
    const { open: canCancel, deadline } = cancellationWindow(booking);
    const isOwner = typeof booking.user === "object" ? booking.user._id === user?._id : booking.user === user?._id;
    const helpLink = `/contact?topic=booking&about=${encodeURIComponent(`Booking ${ref}${tour ? ` · ${tour.title}` : ""}`)}`;

    const handleCancel = () => {
        cancelBooking.mutate(booking._id, {
            onSuccess: () => {
                toast.success("Booking cancelled. Any payment is refunded to your card within 5–10 days.");
                setConfirmCancel(false);
            },
            onError: (err: Error) => toast.error(err.message || "Failed to cancel booking."),
        });
    };

    return (
        <div className="pt-24 pb-16 bg-secondary/20 min-h-screen print:bg-white print:pt-0">
            <PageTitle title={`Booking ${ref}`} noIndex />
            <Container className="max-w-4xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
                    <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-brand-orange">
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> My bookings
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => downloadCalendarFile(booking, tour)}>
                            <CalendarPlus className="w-4 h-4 mr-1.5" /> Add to calendar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-1.5" /> Print or save PDF
                        </Button>
                    </div>
                </div>

                <article className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden print:border-0 print:shadow-none">
                    {/* Header */}
                    <header className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6">
                        {tour?.imageURL && (
                            <img src={tour.imageURL} alt="" className="w-full md:w-48 h-36 object-cover rounded-2xl print:hidden" />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", STATUS_STYLES[booking.status])}>
                                    {STATUS_TEXT[booking.status]}
                                </span>
                                <span className="text-xs text-muted-foreground">Booking reference <span className="font-mono font-bold text-slate-700">{ref}</span></span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-display font-bold text-brand-blue">{tour?.title ?? "Your trip"}</h1>
                            {tour?.location && (
                                <p className="text-muted-foreground flex items-center gap-1.5 mt-1"><MapPin className="w-4 h-4 text-brand-orange" /> {tour.location}</p>
                            )}
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
                                <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-brand-orange" />
                                    {format(start, "EEE, d MMM yyyy")}{end && ` – ${format(end, "EEE, d MMM yyyy")}`}
                                </span>
                                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-brand-orange" />
                                    {booking.numberOfTravelers} {booking.numberOfTravelers === 1 ? "traveller" : "travellers"}
                                </span>
                                {packageLine && (
                                    <span className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-brand-orange" /> {packageLine}</span>
                                )}
                            </div>
                        </div>
                    </header>

                    {booking.status === "cancelled" && (
                        <div className="mx-6 md:mx-8 mt-6 rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">
                            Cancelled{booking.cancelledAt && ` on ${format(new Date(booking.cancelledAt), "d MMM yyyy")}`}.{" "}
                            {booking.refundedAmount
                                ? `${money(booking.refundedAmount)} has been refunded to your card; banks usually show it within 5–10 days.`
                                : "Nothing was charged for this booking."}
                        </div>
                    )}
                    {booking.status === "pending" && (
                        <div className="mx-6 md:mx-8 mt-6 rounded-2xl bg-yellow-50 border border-yellow-100 p-4 text-sm text-yellow-800">
                            This booking is waiting for payment and is not confirmed yet.
                        </div>
                    )}

                    <div className="grid md:grid-cols-5 gap-8 p-6 md:p-8">
                        {/* Price */}
                        <section className="md:col-span-3">
                            <h2 className="font-bold text-brand-blue mb-4">Price breakdown</h2>
                            <dl className="space-y-2.5 text-sm">
                                {tourLine !== null && unit !== null && (
                                    <Line label={`${money(unit)} × ${booking.numberOfTravelers} ${booking.numberOfTravelers === 1 ? "traveller" : "travellers"}`} value={money(tourLine)} />
                                )}
                                {booking.addons?.map((a) => <Line key={a.name} label={a.name} value={money(a.price)} />)}
                                {booking.coupon?.code && (
                                    <>
                                        <Line label="Subtotal" value={money(subtotal)} />
                                        <Line label={`Coupon ${booking.coupon.code}`} value={`−${money(booking.coupon.discount)}`} className="text-green-700" />
                                    </>
                                )}
                                <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-base font-bold">
                                    <dt>{booking.status === "pending" ? "Total due" : "Total paid"}</dt>
                                    <dd>{money(booking.totalAmount)}</dd>
                                </div>
                                <p className="text-xs text-muted-foreground">Charged in {booking.currency || "USD"}. Booked on {format(new Date(booking.createdAt), "d MMM yyyy")}.</p>
                            </dl>
                        </section>

                        {/* Lead traveller */}
                        <section className="md:col-span-2">
                            <h2 className="font-bold text-brand-blue mb-4">Lead traveller</h2>
                            <div className="text-sm space-y-2">
                                <p className="font-medium">{booking.contactInfo?.firstName} {booking.contactInfo?.lastName}</p>
                                {booking.contactInfo?.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /> {booking.contactInfo.email}</p>}
                                {booking.contactInfo?.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" /> {booking.contactInfo.phone}</p>}
                                {booking.specialRequests && (
                                    <p className="pt-2 text-muted-foreground"><span className="font-medium text-slate-700">Requests:</span> {booking.specialRequests}</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {(tour?.itinerary?.length ?? 0) > 0 && (
                        <section className="px-6 md:px-8 pb-8">
                            <h2 className="font-bold text-brand-blue mb-4">Your itinerary</h2>
                            <ol className="space-y-3">
                                {tour!.itinerary.map((d) => (
                                    <li key={d.day} className="flex gap-4 text-sm">
                                        <span className="shrink-0 w-16 font-bold text-brand-orange">Day {d.day}</span>
                                        <span className="flex-1">
                                            <span className="font-medium">{d.activity}</span>
                                            {d.location && <span className="text-muted-foreground"> · {d.location}</span>}
                                            <span className="block text-xs text-muted-foreground">{format(addDays(start, d.day - 1), "EEE, d MMM")}</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {(tour?.inclusions?.length ?? 0) > 0 && (
                        <section className="px-6 md:px-8 pb-8">
                            <h2 className="font-bold text-brand-blue mb-4">What's included</h2>
                            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                                {tour!.inclusions.map((inc) => (
                                    <li key={inc.title} className="flex items-center gap-2">
                                        {inc.included ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-slate-400" />}
                                        <span className={cn(!inc.included && "text-muted-foreground line-through")}>{inc.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <footer className="border-t border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                        <p className="text-sm text-muted-foreground">
                            {canCancel
                                ? `Free cancellation until ${format(deadline, "EEE, d MMM yyyy, HH:mm")}.`
                                : booking.status === "cancelled" || booking.status === "completed"
                                    ? "Questions about this trip? We're happy to help."
                                    : "Free cancellation has ended for this trip. Contact us if your plans change."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="rounded-full" asChild>
                                <Link to={helpLink}><MessageCircle className="w-4 h-4 mr-1.5" /> Get help</Link>
                            </Button>
                            {canCancel && isOwner && (
                                <Button variant="ghost" size="sm" className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmCancel(true)}>
                                    Cancel booking
                                </Button>
                            )}
                        </div>
                    </footer>
                </article>
            </Container>

            <ConfirmDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
                title="Cancel this booking?"
                description={booking.totalAmount > 0 && booking.status === "confirmed"
                    ? `You'll get ${money(booking.totalAmount)} back on your card. This can't be undone.`
                    : "Your reservation will be cancelled. This can't be undone."}
                confirmLabel="Cancel booking"
                cancelLabel="Keep booking"
                destructive
                loading={cancelBooking.isPending}
                onConfirm={handleCancel}
            />
        </div>
    );
};

const Line = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className={cn("flex justify-between gap-4", className)}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium tabular-nums">{value}</dd>
    </div>
);
