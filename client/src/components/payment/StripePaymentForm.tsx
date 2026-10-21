import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared by tour bookings and flight/hotel checkout.
export const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
    : null;

// Brand-aligned theme for the Stripe PaymentElement (matches the site's design tokens).
export const stripeAppearance = {
    theme: 'stripe' as const,
    variables: {
        colorPrimary: '#F97316',        // brand-orange accent / focus
        colorText: '#0F172A',           // brand-blue text
        colorTextSecondary: '#64748b',
        colorDanger: '#ef4444',
        colorBackground: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSizeBase: '15px',
        borderRadius: '12px',
        spacingUnit: '4px',
    },
    rules: {
        '.Input': {
            border: '1px solid #e2e8f0',
            boxShadow: 'none',
            padding: '12px',
        },
        '.Input:focus': {
            border: '1px solid #F97316',
            boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.15)',
        },
        '.Label': {
            fontWeight: '500',
            color: '#0F172A',
        },
        '.Tab, .Block': {
            borderRadius: '12px',
        },
        '.Tab:focus, .Tab--selected': {
            borderColor: '#F97316',
            boxShadow: '0 0 0 2px rgba(249, 115, 22, 0.2)',
        },
    },
};

export function StripePaymentForm({ onSuccess, isSubmitting = false, submitLabel = "Pay Now" }: { onSuccess: () => void; isSubmitting?: boolean; submitLabel?: string }) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async () => {
        if (!stripe || !elements) return;

        setProcessing(true);
        setError(null);

        const result = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
        });

        if (result.error) {
            setError(result.error.message ?? "Payment failed");
            setProcessing(false);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="space-y-4">
            <PaymentElement />
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
            <Button
                onClick={handleSubmit}
                disabled={!stripe || processing || isSubmitting}
                className="w-full h-12 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold"
            >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {processing ? "Processing..." : submitLabel}
            </Button>
        </div>
    );
}
