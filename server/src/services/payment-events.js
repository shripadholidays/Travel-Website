'use strict';
/**
 * What happens once Razorpay has captured a payment — the same whether the traveller's browser
 * reports it or Razorpay's webhook does (whichever arrives first; the second changes nothing).
 */
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const TravelOrder = require('../models/TravelOrder');
const { confirmBooking } = require('./booking-service');
const { finalizeOrder } = require('./travel-order-service');
const logger = require('../utils/logger');

/**
 * Marks the payment completed and confirms the tour booking or books the flight/hotel. Idempotent.
 * `remote` comes from the gateway: { id, summary } (summary: the gateway's record, never card details).
 */
async function paymentCaptured(payment, remote) {
    if (payment.status !== 'completed') {
        payment.status = 'completed';
        payment.gatewayPaymentId = remote.id;
        payment.gatewayResponse = remote.summary;
        await Payment.save(payment);
    }
    if (payment.booking) {
        const booking = await Booking.findById(payment.booking);
        if (booking) await confirmBooking(booking);
        return { booking };
    }
    if (payment.order) {
        const order = await TravelOrder.findById(payment.order);
        if (order) await finalizeOrder(order);
        return { order };
    }
    return {};
}

/** A payment attempt failed (the traveller can try again from the same checkout). */
async function paymentFailed(payment, remote, reason) {
    if (payment.status !== 'pending') return;
    payment.status = 'failed';
    payment.gatewayResponse = remote.summary;
    await Payment.save(payment);
    logger.warn('Payment failed', { paymentId: payment._id, reason });
}

module.exports = { paymentCaptured, paymentFailed };
