import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Copy, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrency } from "@/context/CurrencyContext";
import { useMyCustomTrips } from "@/hooks/use-trip-builder";
import { cn } from "@/lib/utils";
import { uid, type CustomTrip, type TripDraft } from "@/lib/trip-builder";

const STATUS: Record<CustomTrip["status"], { label: string; className: string }> = {
    new: { label: "Waiting for a price", className: "bg-yellow-100 text-yellow-800" },
    quoted: { label: "Price ready", className: "bg-blue-100 text-blue-700" },
    booked: { label: "Booked", className: "bg-green-100 text-green-700" },
    closed: { label: "Closed", className: "bg-slate-100 text-slate-600" },
};

// A sent trip as a fresh builder draft (the builder picks it up from storage)
function toDraft(t: CustomTrip): TripDraft {
    return {
        title: t.title,
        stops: t.stops.map((s) => ({ uid: uid(), placeId: s.placeId, nights: s.nights, days: s.days.map((d) => d.map((p) => ({ uid: uid(), ...p }))) })),
        hotelClass: t.hotelClass,
        extras: t.extras.map((x) => x.id),
        adults: t.adults,
        children: t.children,
        startDate: null,
        notes: "",
        basedOn: t.basedOn,
    };
}

/** The dashboard's list of trips the traveller built and sent */
export function MyCustomTrips() {
    const { data, isLoading } = useMyCustomTrips();
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const trips = data?.trips ?? [];

    const reuse = (t: CustomTrip) => {
        try { localStorage.setItem("wandeazy.tripDraft", JSON.stringify(toDraft(t))); } catch { /* storage unavailable */ }
        navigate("/build-trip");
    };

    if (isLoading) return <Spinner center />;
    if (trips.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center mx-auto mb-4">
                    <Route className="w-8 h-8" aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-brand-blue mb-1">No trips built yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-pretty">Pick your own places, nights and hotels, and we'll send you a price.</p>
                <Button variant="brand" asChild><Link to="/build-trip">Build a trip</Link></Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {trips.map((t) => {
                const est = t.estimate;
                const currency = est?.currency ?? "INR";
                const nights = t.stops.reduce((n, s) => n + s.nights, 0);
                return (
                    <article key={t._id} className="rounded-2xl border border-slate-100 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="font-bold text-brand-blue text-pretty">{t.title}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {t.stops.map((s) => `${s.name} (${s.nights}N)`).join(" → ")}
                                </p>
                            </div>
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", STATUS[t.status].className)}>{STATUS[t.status].label}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-3 tabular-nums">
                            {nights} nights · {t.adults + t.children} travellers · {est?.hotelLabel} hotels · {t.startDate ? `from ${format(new Date(t.startDate), "d MMM yyyy")}` : "dates flexible"}
                        </p>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                            {t.quote && t.status !== "closed" ? (
                                <div>
                                    <p className="text-xs text-muted-foreground">Your final price</p>
                                    <p className="text-xl font-bold text-slate-900 tabular-nums">{formatPrice(t.quote, currency)}</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-muted-foreground">Estimated price</p>
                                    <p className="font-semibold text-slate-900 tabular-nums">{est ? `${formatPrice(est.low, currency)} – ${formatPrice(est.high, currency)}` : "—"}</p>
                                </div>
                            )}
                            <Button variant="outline" size="sm" onClick={() => reuse(t)}>
                                <Copy className="w-4 h-4 mr-1.5" aria-hidden /> Use as a starting point
                            </Button>
                        </div>
                        {t.quote && t.quoteNote && t.status !== "closed" && (
                            <p className="mt-3 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">{t.quoteNote}</p>
                        )}
                    </article>
                );
            })}
            <p className="text-xs text-muted-foreground">Questions about a price? Reply to our email, or <Link to="/contact" className="text-brand-orange font-medium hover:underline">contact us</Link>.</p>
        </div>
    );
}
