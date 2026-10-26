import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/context/CurrencyContext";
import { useUpdateCustomTrip, type CustomTripChanges } from "@/hooks/use-trip-builder";
import { cn } from "@/lib/utils";
import type { CustomTrip } from "@/lib/trip-builder";
import { TRIP_COLUMNS, type TripStatus } from "./CustomTripBoard";

interface Props {
    trip: CustomTrip | null;
    onClose: () => void;
    /** Opened by dragging to "Priced" without a price: ask for one first */
    askPrice?: boolean;
}

/** Everything about one custom trip, and the team's final price */
export function CustomTripDetail({ trip, onClose, askPrice }: Props) {
    const { formatPrice } = useCurrency();
    const update = useUpdateCustomTrip();
    const priceRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({ quote: "", quoteNote: "", staffNote: "" });

    useEffect(() => {
        if (!trip) return;
        setForm({ quote: trip.quote ? String(trip.quote) : "", quoteNote: trip.quoteNote ?? "", staffNote: trip.staffNote ?? "" });
        if (askPrice) setTimeout(() => priceRef.current?.focus(), 50);
    }, [trip, askPrice]);

    if (!trip) return null;
    const est = trip.estimate;
    const currency = est?.currency ?? "INR";
    const nights = trip.stops.reduce((n, s) => n + s.nights, 0);
    const phone = trip.phoneNumber?.replace(/[^\d+]/g, "");

    const save = async (changes: CustomTripChanges, done: string) => {
        try {
            await update.mutateAsync({ id: trip._id, changes });
            toast.success(done);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save");
        }
    };
    const notes = { quoteNote: form.quoteNote, staffNote: form.staffNote };
    const quote = form.quote ? Number(form.quote) : null;

    let day = 0;
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl max-h-[92svh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-pretty pr-6">{trip.title}</DialogTitle>
                    <DialogDescription>
                        From {trip.fullName} · sent {format(new Date(trip.createdAt), "d MMM yyyy, h:mm a")}
                        {trip.basedOn ? ` · based on ${trip.basedOn}` : ""}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${trip.email}?subject=${encodeURIComponent(`Your trip: ${trip.title}`)}`}><Mail className="w-3.5 h-3.5 mr-1.5" aria-hidden /> {trip.email}</a>
                    </Button>
                    {phone && (
                        <>
                            <Button size="sm" variant="outline" asChild>
                                <a href={`tel:${phone}`}><Phone className="w-3.5 h-3.5 mr-1.5" aria-hidden /> {trip.phoneNumber}</a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                                <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer"><MessageCircle className="w-3.5 h-3.5 mr-1.5" aria-hidden /> WhatsApp</a>
                            </Button>
                        </>
                    )}
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <Fact label="Length" value={`${nights} nights`} />
                    <Fact label="Travellers" value={`${trip.adults} adult${trip.adults === 1 ? "" : "s"}${trip.children ? `, ${trip.children} child${trip.children === 1 ? "" : "ren"}` : ""}`} />
                    <Fact label="Start" value={trip.startDate ? format(new Date(trip.startDate), "d MMM yyyy") : "Flexible"} />
                    <Fact label="Hotels" value={est?.hotelLabel ?? trip.hotelClass} />
                    <div className="col-span-2 sm:col-span-4">
                        <Fact label="Builder estimate" value={est ? `${formatPrice(est.low, currency)} – ${formatPrice(est.high, currency)}` : "—"} />
                    </div>
                    {trip.extras.length > 0 && (
                        <div className="col-span-2 sm:col-span-4"><Fact label="Extras" value={trip.extras.map((x) => x.label).join(", ")} /></div>
                    )}
                </dl>

                <section>
                    <h3 className="text-sm font-semibold mb-2">Day by day</h3>
                    <ol className="space-y-3">
                        {trip.stops.map((s, si) => (
                            <li key={si}>
                                <p className="text-sm font-medium text-slate-900">{s.name} <span className="text-muted-foreground font-normal">· {s.nights} night{s.nights === 1 ? "" : "s"}</span></p>
                                <ul className="mt-1 space-y-1 border-l-2 border-slate-100 pl-3">
                                    {s.days.map((plans, di) => {
                                        day += 1;
                                        return (
                                            <li key={di} className="text-sm">
                                                <span className="font-semibold text-slate-700 tabular-nums">Day {day}:</span>{" "}
                                                <span className="text-slate-600">{plans.length ? plans.map((p) => p.title).join(" · ") : "Free day"}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ol>
                </section>

                {trip.notes && (
                    <section>
                        <h3 className="text-sm font-semibold mb-1">Traveller's note</h3>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{trip.notes}</p>
                    </section>
                )}

                <section className="space-y-3 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]">
                    <h3 className="text-sm font-semibold">Final price</h3>
                    <div className="grid sm:grid-cols-[minmax(0,12rem)_1fr] gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="quote">Total for the trip ({currency})</Label>
                            <Input
                                ref={priceRef}
                                id="quote"
                                inputMode="numeric"
                                className={cn("tabular-nums", askPrice && !form.quote && "ring-2 ring-brand-orange")}
                                value={form.quote}
                                onChange={(e) => setForm({ ...form, quote: e.target.value.replace(/[^0-9.]/g, "") })}
                                placeholder={est ? String(Math.round((est.low + est.high) / 2)) : ""}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="quote-note">Message to the traveller <span className="text-muted-foreground font-normal">(sent with the price)</span></Label>
                            <Textarea id="quote-note" rows={2} value={form.quoteNote} onChange={(e) => setForm({ ...form, quoteNote: e.target.value })} placeholder="What's included, how to pay, how long the price holds…" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="staff-note">Team note <span className="text-muted-foreground font-normal">(only staff see this)</span></Label>
                        <Textarea id="staff-note" rows={2} value={form.staffNote} onChange={(e) => setForm({ ...form, staffNote: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            variant="brand"
                            disabled={!quote || update.isPending}
                            onClick={() => save({ ...notes, quote, status: "quoted" }, `Price sent to ${trip.email}`)}
                        >
                            {update.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> : <Send className="w-4 h-4 mr-2" aria-hidden />}
                            {trip.status === "quoted" && trip.quote ? "Send new price" : "Send price to traveller"}
                        </Button>
                        <Button variant="outline" disabled={update.isPending} onClick={() => save({ ...notes, quote, notify: false }, "Saved")}>Save without sending</Button>
                    </div>
                </section>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Move to:</span>
                    {TRIP_COLUMNS.filter((c) => c.id !== trip.status && c.id !== "quoted").map((c) => (
                        <Button key={c.id} size="sm" variant="ghost" onClick={() => save({ ...notes, quote, status: c.id as TripStatus, notify: false }, `Moved to ${c.label}`)}>
                            <span className={cn("w-2 h-2 rounded-full mr-2", c.dot)} aria-hidden /> {c.label}
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900 text-pretty">{value}</dd>
        </div>
    );
}
