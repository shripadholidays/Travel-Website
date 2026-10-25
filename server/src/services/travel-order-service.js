const Payment = require('../models/Payment');
const payments = require('./payments');
const TravelOrder = require('../models/TravelOrder');
const logger = require('../utils/logger');
const { getFlightProvider } = require('../providers/flights');
const { getHotelProvider } = require('../providers/hotels');
const { withTimeout } = require('../providers/errors');

function getProvider(kind) {
    return kind === 'flight' ? getFlightProvider() : getHotelProvider();
}

// Refunds the order's (or booking's) captured payment, if any, and marks it refunded.
async function refundPayment(order) {
    if (!order.paymentId) return;
    const payment = await Payment.findById(order.paymentId?._id ?? order.paymentId);
    if (!payment || payment.status !== 'completed') return;
    await payments.refund(payment);
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

module.exports = { getProvider, finalizeOrder, refundPayment };
