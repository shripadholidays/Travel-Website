'use strict';
/**
 * Razorpay: the server creates an order → the browser pays it in Razorpay Checkout → Razorpay
 * returns payment id + order id + signature → the server checks the signature and asks Razorpay
 * the payment is captured for that order and amount (an authorized payment is captured here).
 */
const crypto = require('crypto');
const config = require('../../config');
const logger = require('../../utils/logger');
const { PaymentError, placeholder, toMinor, safeEqual } = require('./common');

let client = null;
let testClient = null;

const name = 'razorpay';
const configured = () => !!testClient || (!placeholder(config.razorpay.keyId) && !placeholder(config.razorpay.keySecret));

function api() {
    if (testClient) return testClient;
    if (!client) {
        const Razorpay = require('razorpay');
        client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
    }
    return client;
}

// The useful part of Razorpay's payment record, for support lookups (never card details)
const summary = (p) => ({ id: p.id, order_id: p.order_id, status: p.status, method: p.method, amount: p.amount, currency: p.currency, email: p.email, contact: p.contact, created_at: p.created_at });

async function createCheckout({ amount, currency, receipt, notes = {}, description }) {
    const order = await api().orders.create({
        amount: toMinor(amount),
        currency: String(currency).toUpperCase(),
        receipt: String(receipt).slice(0, 40),
        notes,
    });
    return {
        provider: name,
        keyId: config.razorpay.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: config.razorpay.brandName,
        description,
    };
}

/** The signature Checkout returns: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
function verifyCheckoutSignature({ orderId, paymentId, signature }) {
    const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqual(expected, signature);
}

/** Body from the browser: { razorpay_payment_id, razorpay_order_id, razorpay_signature }. */
async function settle(payment, body = {}) {
    const paymentId = body.razorpay_payment_id;
    const orderId = body.razorpay_order_id;
    if (!payment?.gatewayOrderId || orderId !== payment.gatewayOrderId) throw new PaymentError('This payment does not belong to this booking.');
    if (!verifyCheckoutSignature({ orderId, paymentId, signature: body.razorpay_signature })) throw new PaymentError('The payment could not be verified.');
    let remote = await api().payments.fetch(paymentId);
    if (remote.order_id !== payment.gatewayOrderId) throw new PaymentError('This payment does not belong to this booking.');
    if (remote.amount !== toMinor(payment.amount) || String(remote.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
        throw new PaymentError('The amount paid does not match the booking.');
    }
    if (remote.status === 'authorized') remote = await api().payments.capture(paymentId, remote.amount, remote.currency);
    if (remote.status !== 'captured') throw new PaymentError('Payment not completed');
    return { id: remote.id, summary: summary(remote) };
}

async function refund(payment) {
    if (!payment.gatewayPaymentId) return null;
    try {
        return await api().payments.refund(payment.gatewayPaymentId, { amount: toMinor(payment.amount), notes: { reason: 'Booking cancelled' } });
    } catch (err) {
        logger.error('Razorpay refund failed', { paymentId: payment._id, error: err?.error?.description || err.message });
        throw new Error('The refund could not be started. Please try again or refund it from the Razorpay dashboard.');
    }
}

/**
 * Reads a webhook (header X-Razorpay-Signature). Returns null when the signature is wrong,
 * otherwise { kind: 'captured' | 'failed' | 'ignored', orderId, amount, remote }.
 */
function parseWebhook(rawBody, headers) {
    const secret = config.razorpay.webhookSecret;
    const signature = headers['x-razorpay-signature'];
    if (placeholder(secret)) return null;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(expected, signature)) return null;

    const event = JSON.parse(rawBody.toString('utf8'));
    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) return { kind: 'ignored' };
    const remote = { id: entity.id, summary: summary(entity) };
    if (event.event === 'payment.failed') return { kind: 'failed', orderId: entity.order_id, remote, reason: entity.error_description };
    if (['payment.captured', 'order.paid'].includes(event.event) && entity.status === 'captured') {
        return { kind: 'captured', orderId: entity.order_id, amount: entity.amount, currency: entity.currency, remote };
    }
    return { kind: 'ignored' };
}

const setTestClient = (fake) => { testClient = fake; };

module.exports = { name, label: 'Razorpay', configured, createCheckout, settle, refund, parseWebhook, verifyCheckoutSignature, setTestClient };
