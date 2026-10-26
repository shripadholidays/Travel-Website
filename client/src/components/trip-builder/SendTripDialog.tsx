import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useSendTrip } from "@/hooks/use-trip-builder";
import { rememberReturnTo } from "@/lib/return-to";
import type { CustomTrip, TripDraft, TripEstimate } from "@/lib/trip-builder";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: TripDraft;
    estimate: TripEstimate;
    routeLabel: string;
    onNotes: (notes: string) => void;
    onSent: () => void;
}

/** Contact details and a last note, then the trip goes to the team */
export function SendTripDialog({ open, onOpenChange, draft, estimate, routeLabel, onNotes, onSent }: Props) {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const send = useSendTrip();
    const [contact, setContact] = useState({ fullName: "", email: "", phoneNumber: "" });
    const [error, setError] = useState("");
    const [sent, setSent] = useState<CustomTrip | null>(null);

    // Signed-in travellers should not have to type who they are
    useEffect(() => {
        if (user) setContact((c) => ({ ...c, fullName: c.fullName || user.displayName || "", email: c.email || user.email || "" }));
    }, [user]);

    useEffect(() => { if (open) { setError(""); setSent(null); } }, [open]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const res = await send.mutateAsync({ draft, ...contact, phoneNumber: contact.phoneNumber || undefined });
            setSent(res.trip);
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send your trip. Please try again.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[92svh] overflow-y-auto">
                {sent ? (
                    <div className="text-center py-4" role="status">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-7 h-7 text-green-600" aria-hidden />
                        </div>
                        <DialogTitle className="text-xl">Your trip is on its way</DialogTitle>
                        <DialogDescription className="mt-2 text-pretty">
                            A travel specialist will check <span className="font-medium text-foreground">{sent.title}</span> and email your final price to{" "}
                            <span className="font-medium text-foreground">{sent.email}</span> within 24 hours.
                        </DialogDescription>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
                            {user ? (
                                <Button variant="brand" asChild><Link to="/dashboard?tab=trips">See my trips</Link></Button>
                            ) : (
                                <Button variant="brand" asChild><Link to="/tours">Browse packages</Link></Button>
                            )}
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Plan another trip</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Send your trip</DialogTitle>
                            <DialogDescription className="text-pretty">
                                {routeLabel} · {estimate.nights} nights · around {formatPrice(estimate.low, estimate.currency)}–{formatPrice(estimate.high, estimate.currency)}.
                                We'll reply with a final price. You pay nothing now.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="trip-name">Your name</Label>
                                <Input id="trip-name" autoComplete="name" required value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="trip-email">Email</Label>
                                    <Input id="trip-email" type="email" autoComplete="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="trip-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                    <Input id="trip-phone" type="tel" autoComplete="tel" value={contact.phoneNumber} onChange={(e) => setContact({ ...contact, phoneNumber: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="trip-notes">Anything else? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                <Textarea
                                    id="trip-notes"
                                    rows={3}
                                    maxLength={2000}
                                    value={draft.notes}
                                    onChange={(e) => onNotes(e.target.value)}
                                    placeholder="Celebrations, food needs, which city you're flying from…"
                                />
                            </div>
                            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                            <Button type="submit" variant="brand" className="w-full h-11" disabled={send.isPending}>
                                {send.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> Sending…</> : "Send my trip"}
                            </Button>
                            {!user && (
                                <p className="text-xs text-muted-foreground text-center">
                                    <Link to="/login" onClick={() => rememberReturnTo({ pathname: "/build-trip" })} className="text-brand-orange font-medium hover:underline">Sign in</Link> first to keep your trips in your dashboard.
                                </p>
                            )}
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
