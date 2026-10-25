import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RazorpayPayButton } from "@/components/payment/RazorpayPayButton";
import type { PaymentCheckout, PaymentResult } from "@/lib/checkout";

// Stripe's form (and Stripe.js) only loads when Stripe is the gateway in use
const StripeCheckoutForm = lazy(() => import("@/components/payment/StripePaymentForm").then((m) => ({ default: m.StripeCheckoutForm })));

/** The payment step for whichever gateway the server picked for this checkout. */
export function CheckoutPayment({ checkout, onPaid, label, isSubmitting = false }: {
    checkout: PaymentCheckout;
    onPaid: (result: PaymentResult) => void | Promise<void>;
    label: string;
    isSubmitting?: boolean;
}) {
    if (checkout.provider === "stripe") {
        return (
            <Suspense fallback={<div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
                <StripeCheckoutForm checkout={checkout} onPaid={() => onPaid(undefined)} label={label} isSubmitting={isSubmitting} />
            </Suspense>
        );
    }
    return <RazorpayPayButton checkout={checkout} onPaid={onPaid} label={label} isSubmitting={isSubmitting} autoOpen />;
}
