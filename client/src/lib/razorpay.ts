// Razorpay Checkout: the payment window for cards, UPI, netbanking and wallets.
// The server creates the order (amount, currency) and checks the result; this only opens the window.

/** What the server sends back when a booking needs paying. */
export interface RazorpayCheckout {
    provider: 'razorpay';
    keyId: string;
    orderId: string;
    /** In the smallest unit (paise, cents, fils) */
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    prefill?: { name?: string; email?: string; contact?: string };
}

/** What Razorpay returns after a successful payment; the server verifies the signature. */
export interface RazorpayPaid {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

/** The traveller closed the window without paying. */
export class PaymentCancelled extends Error {
    constructor(message = 'Payment cancelled') {
        super(message);
        this.name = 'PaymentCancelled';
    }
}

interface RazorpayInstance {
    open: () => void;
    on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}
declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
    }
}

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
    if (window.Razorpay) return Promise.resolve();
    if (!loading) {
        loading = new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SCRIPT;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                loading = null;
                script.remove();
                reject(new Error('The payment window could not load. Check your connection and try again.'));
            };
            document.body.appendChild(script);
        });
    }
    return loading;
}

/**
 * Opens Razorpay Checkout for the order. Resolves with the payment to send to the server;
 * rejects with PaymentCancelled when the window is closed (carrying the last failure reason, if any).
 * A failed attempt keeps the window open so the traveller can retry with another method.
 */
export async function payWithRazorpay(checkout: RazorpayCheckout): Promise<RazorpayPaid> {
    await loadCheckout();
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error('The payment window could not load. Please try again.');

    return new Promise<RazorpayPaid>((resolve, reject) => {
        let lastError: string | undefined;
        const rzp = new Razorpay({
            key: checkout.keyId,
            order_id: checkout.orderId,
            amount: checkout.amount,
            currency: checkout.currency,
            name: checkout.name || 'Wandeazy',
            description: checkout.description,
            prefill: checkout.prefill,
            theme: { color: '#F97316' },
            handler: (response: RazorpayPaid) => resolve(response),
            modal: { ondismiss: () => reject(new PaymentCancelled(lastError ? `Payment failed: ${lastError}` : undefined)) },
        });
        rzp.on('payment.failed', (response) => {
            lastError = response.error?.description;
        });
        rzp.open();
    });
}
