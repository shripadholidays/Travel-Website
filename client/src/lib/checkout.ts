// What the server sends when a booking needs paying. The server picks the gateway
// (Razorpay or Stripe, whichever is set up) and the page shows that gateway's payment form.
import type { RazorpayCheckout, RazorpayPaid } from '@/lib/razorpay';

export interface StripeCheckout {
    provider: 'stripe';
    publishableKey: string;
    clientSecret: string;
    /** The PaymentIntent id */
    orderId: string;
    /** In the smallest unit (cents, paise, fils) */
    amount: number;
    currency: string;
    description?: string;
}

export type PaymentCheckout = RazorpayCheckout | StripeCheckout;

/** Sent to the server's confirm endpoint: Razorpay's signed result, or nothing for Stripe. */
export type PaymentResult = RazorpayPaid | undefined;

export type { RazorpayCheckout };
