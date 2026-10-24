const Payment = require('../models/Payment');
const TravelOrder = require('../models/TravelOrder');
const logger = require('../utils/logger');
const { getFlightProvider } = require('../providers/flights');
const { getHotelProvider } = require('../providers/hotels');
const { withTimeout } = require('../providers/errors');

function getProvider(kind) {
    return kind === 'flight' ? getFlightProvider() : getHotelProvider();
}

// A missing key or an obvious placeholder (e.g. sk_test_placeholder) means "no gateway" in dev.
function stripeClient() {
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (!key || /placeholder|your_|xxx/i.test(key)) return null;
    return require('stripe')(key);
}

// Refunds the order's completed Stripe payment (if any) and marks it refunded.
async function refundPayment(order) {
    if (!order.paymentId) return;
    const payment = await Payment.findById(order.paymentId?._id ?? order.paymentId);
    if (!payment || payment.status !== 'completed') return;
    const stripe = stripeClient();
    if (stripe && payment.stripePaymentIntentId) {
        await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    }
    payment.status = 'refunded';
    await Payment.save(payment);
}

// Books with the supplier once payment is secured. Idempotent: only pending orders move.
async function finalizeOrder(order) {
    if (order.status !== 'pending') return order;
    try {
        const result = await withTimeout(getProvider(order.kind).book({
            offerId: order.offerId,
            travellers: order.travellers,
            contact: order.contact,
        }));
        order.providerRef = result.providerRef;
        order.status = 'confirmed';
    } catch (err) {
        logger.error('Supplier booking failed', { orderId: order._id, error: err.message });
        order.status = 'failed';
        order.failureReason = err.message;
        try {
            await refundPayment(order);
        } catch (refundErr) {
            logger.error('Automatic refund failed', { orderId: order._id, error: refundErr.message });
        }
    }
    await TravelOrder.save(order);
    return order;
}

module.exports = { getProvider, finalizeOrder, refundPayment, stripeClient };
