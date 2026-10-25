'use strict';
/**
 * Card / UPI / netbanking payments through Razorpay.
 *
 * Flow: the server creates a Razorpay order for the exact amount and currency → the browser
 * opens Razorpay Checkout with that order → Razorpay returns payment id + order id + signature →
 * the server checks the signature and asks Razorpay that the payment really is captured for
 * that order and amount, then confirms the booking. The webhook does the same if the browser
 * never comes back. Without keys (local dev) there is no gateway and bookings confirm at once.
 */
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

let client = null;
let testClient = null;

const placeholder = (v) => !v || /placeholder|your_|xxx/i.test(v);

function configured() {
    const { keyId, keySecret } = config.razorpay;
    return !placeholder(keyId) && !placeholder(keySecret);
}

/** The Razorpay SDK client, or null when no keys are set. */
function gateway() {
    if (testClient) return testClient;
    if (!configured()) return null;
    if (!client) {
        const Razorpay = require('razorpay');
        client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
    }
    return client;
}

// Amounts go to Razorpay in the smallest unit (paise, cents, fils); every supported currency has two decimals
const toMinor = (amount) => Math.round(Number(amount) * 100);

/**
 * Creates the Razorpay order the browser pays. Returns what Checkout needs.
 * `notes` are stored on the order in Razorpay (visible in its dashboard).
 */
async function createCheckout({ amount, currency, receipt, notes = {}, description }) {
    const rzp = gateway();
    const order = await rzp.orders.create({
        amount: toMinor(amount),
        currency: String(currency).toUpperCase(),
        receipt: String(receipt).slice(0, 40),
        notes,
    });
    return {
        provider: 'razorpay',
        keyId: config.razorpay.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: config.razorpay.brandName,
        description,
    };
}

function safeEqual(a, b) {
    const x = Buffer.from(String(a || ''));
    const y = Buffer.from(String(b || ''));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** The signature Checkout returns: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
function verifyCheckoutSignature({ orderId, paymentId, signature }) {
    const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqual(expected, signature);
}

/** Webhook bodies are signed with the webhook secret (set in the Razorpay dashboard). */
function verifyWebhookSignature(rawBody, signature) {
    if (placeholder(config.razorpay.webhookSecret)) return false;
    const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(rawBody).digest('hex');
    return safeEqual(expected, signature);
}

class PaymentError extends Error {
    constructor(message) {
        super(message);
        this.status = 400;
    }
}

/**
 * Checks a payment the browser reports against Razorpay itself: right order, right amount and
 * currency, and captured (an authorized payment is captured here). Returns the Razorpay payment.
 */
async function settle(payment, { paymentId, orderId, signature }) {
    if (!payment?.gatewayOrderId || orderId !== payment.gatewayOrderId) throw new PaymentError('This payment does not belong to this booking.');
    if (!verifyCheckoutSignature({ orderId, paymentId, signature })) throw new PaymentError('The payment could not be verified.');
    const rzp = gateway();
    let remote = await rzp.payments.fetch(paymentId);
    if (remote.order_id !== payment.gatewayOrderId) throw new PaymentError('This payment does not belong to this booking.');
    if (remote.amount !== toMinor(payment.amount) || String(remote.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
        throw new PaymentError('The amount paid does not match the booking.');
    }
    if (remote.status === 'authorized') remote = await rzp.payments.capture(paymentId, remote.amount, remote.currency);
    if (remote.status !== 'captured') throw new PaymentError('Payment not completed');
    return remote;
}

/** Refunds a captured payment in full. */
async function refund(payment) {
    const rzp = gateway();
    if (!rzp || !payment.gatewayPaymentId) return null;
    try {
        return await rzp.payments.refund(payment.gatewayPaymentId, { amount: toMinor(payment.amount), notes: { reason: 'Booking cancelled' } });
    } catch (err) {
        logger.error('Razorpay refund failed', { paymentId: payment._id, error: err?.error?.description || err.message });
        throw new Error('The refund could not be started. Please try again or refund it from the Razorpay dashboard.');
    }
}

// Only for tests: swap in a fake Razorpay client (null restores the real one)
function setTestClient(fake) {
    testClient = fake;
}

module.exports = { configured, gateway, createCheckout, verifyCheckoutSignature, verifyWebhookSignature, settle, refund, toMinor, PaymentError, setTestClient };
