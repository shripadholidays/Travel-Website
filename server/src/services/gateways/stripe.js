'use strict';
/**
 * Stripe: the server creates a PaymentIntent → the browser pays it with Stripe's Payment Element
 * → the server retrieves the intent and only counts it once Stripe reports it succeeded for the
 * booking's amount and currency.
 */
const config = require('../../config');
const logger = require('../../utils/logger');
const { PaymentError, placeholder, toMinor } = require('./common');

let client = null;
let testClient = null;

const name = 'stripe';
const configured = () => !!testClient || (!placeholder(config.stripe.secretKey) && !placeholder(config.stripe.publishableKey));

function api() {
    if (testClient) return testClient;
    if (!client) client = require('stripe')(config.stripe.secretKey);
    return client;
}

const summary = (pi) => ({ id: pi.id, status: pi.status, amount: pi.amount, currency: pi.currency, latest_charge: pi.latest_charge, payment_method_types: pi.payment_method_types, created: pi.created });

async function createCheckout({ amount, currency, receipt, notes = {}, description }) {
    const intent = await api().paymentIntents.create({
        amount: toMinor(amount),
        currency: String(currency).toLowerCase(),
        description,
        metadata: { ...notes, receipt: String(receipt) },
        automatic_payment_methods: { enabled: true },
    });
    return {
        provider: name,
        publishableKey: config.stripe.publishableKey,
        clientSecret: intent.client_secret,
        orderId: intent.id,
        amount: intent.amount,
        currency: String(intent.currency).toUpperCase(),
        description,
    };
}

/** The browser sends nothing Stripe-specific: the intent is looked up from the payment record. */
async function settle(payment) {
    if (!payment?.gatewayOrderId) throw new PaymentError('Payment not completed');
    const intent = await api().paymentIntents.retrieve(payment.gatewayOrderId);
    if (intent.amount !== toMinor(payment.amount) || String(intent.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
        throw new PaymentError('The amount paid does not match the booking.');
    }
    if (intent.status !== 'succeeded') throw new PaymentError('Payment not completed');
    return { id: intent.latest_charge || intent.id, summary: summary(intent) };
}

async function refund(payment) {
    if (!payment.gatewayOrderId) return null;
    try {
        return await api().refunds.create({ payment_intent: payment.gatewayOrderId });
    } catch (err) {
        logger.error('Stripe refund failed', { paymentId: payment._id, error: err.message });
        throw new Error('The refund could not be started. Please try again or refund it from the Stripe dashboard.');
    }
}

/**
 * Reads a webhook (header Stripe-Signature). Returns null when the signature is wrong,
 * otherwise { kind: 'captured' | 'failed' | 'ignored', orderId, amount, remote }.
 */
function parseWebhook(rawBody, headers) {
    if (placeholder(config.stripe.webhookSecret)) return null;
    let event;
    try {
        event = api().webhooks.constructEvent(rawBody, headers['stripe-signature'], config.stripe.webhookSecret);
    } catch {
        return null;
    }
    const intent = event.data?.object;
    if (!intent?.id || intent.object !== 'payment_intent') return { kind: 'ignored' };
    const remote = { id: intent.latest_charge || intent.id, summary: summary(intent) };
    if (event.type === 'payment_intent.succeeded') return { kind: 'captured', orderId: intent.id, amount: intent.amount, currency: intent.currency, remote };
    if (event.type === 'payment_intent.payment_failed') return { kind: 'failed', orderId: intent.id, remote, reason: intent.last_payment_error?.message };
    return { kind: 'ignored' };
}

const setTestClient = (fake) => { testClient = fake; };

module.exports = { name, label: 'Stripe', configured, createCheckout, settle, refund, parseWebhook, setTestClient };
