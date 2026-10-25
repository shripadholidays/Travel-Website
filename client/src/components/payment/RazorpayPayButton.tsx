import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentCancelled, payWithRazorpay, type RazorpayCheckout, type RazorpayPaid } from "@/lib/razorpay";

/**
 * Opens Razorpay Checkout for an order the server created. Shared by tour bookings and
 * flight/hotel checkout. `autoOpen` opens the window straight away (the traveller has just
 * pressed "Confirm & Pay"); the button stays for retrying after a cancelled or failed attempt.
 */
export function RazorpayPayButton({ checkout, onPaid, label, isSubmitting = false, autoOpen = false }: {
    checkout: RazorpayCheckout;
    onPaid: (paid: RazorpayPaid) => void | Promise<void>;
    label: string;
    isSubmitting?: boolean;
    autoOpen?: boolean;
}) {
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const opened = useRef(false);

    const pay = async () => {
        setError(null);
        setOpen(true);
        try {
            const paid = await payWithRazorpay(checkout);
            await onPaid(paid);
        } catch (err) {
            setError(err instanceof PaymentCancelled ? err.message : (err as Error).message || "Payment failed. Please try again.");
        } finally {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (autoOpen && !opened.current) {
            opened.current = true;
            pay();
        }
        // Opens once for this order
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpen, checkout.orderId]);

    const busy = open || isSubmitting;
    return (
        <div className="space-y-3">
            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error === "Payment cancelled" ? "The payment window was closed before paying. You can try again." : error}</span>
                </div>
            )}
            <Button onClick={pay} disabled={busy} className="h-12 w-full bg-brand-orange font-bold text-white hover:bg-brand-orange/90">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Confirming…" : open ? "Waiting for payment…" : label}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Cards, UPI, netbanking and wallets, secured by Razorpay.</p>
        </div>
    );
}
