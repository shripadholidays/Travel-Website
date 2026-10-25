const { isId } = require('../db/ids');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const payments = require('../services/payments');
const { paymentCaptured, paymentFailed } = require('../services/payment-events');
const { confirmBooking } = require('../services/booking-service');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// POST /payments/webhook — one URL for both gateways, told apart by their signature header.
// Razorpay: events payment.captured, order.paid, payment.failed (header X-Razorpay-Signature).
// Stripe:   events payment_intent.succeeded, payment_intent.payment_failed (header Stripe-Signature).
exports.handleWebhook = async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const gateway = req.headers['stripe-signature'] ? payments.GATEWAYS.stripe
        : req.headers['x-razorpay-signature'] ? payments.GATEWAYS.razorpay : null;

    let event = null;
    try {
        event = gateway && gateway.parseWebhook(raw, req.headers);
    } catch {
        event = null;
    }
    if (!event) {
        logger.warn('Payment webhook with a missing or wrong signature');
        return res.status(400).json({ received: false });
    }

    try {
        if (event.kind !== 'ignored') {
            const payment = await Payment.findOne('gateway_order_id = ?', [event.orderId]);
            if (!payment || payment.method !== gateway.name) {
                logger.warn('Webhook for an unknown payment', { gateway: gateway.name, orderId: event.orderId });
            } else if (event.kind === 'failed') {
                await paymentFailed(payment, event.remote, event.reason);
            } else if (event.amount === payments.toMinor(payment.amount) && String(event.currency).toUpperCase() === String(payment.currency).toUpperCase()) {
                await paymentCaptured(payment, event.remote);
                logger.info('Payment captured (webhook)', { gateway: gateway.name, paymentId: payment._id });
            } else {
                logger.warn('Webhook amount does not match the payment', { gateway: gateway.name, paymentId: payment._id });
            }
        }
    } catch (err) {
        // Gateways retry on a non-2xx; log and accept so one bad record cannot block the queue
        logger.error('Error processing payment webhook', { gateway: gateway.name, error: err.message });
    }
    return res.status(200).json({ received: true });
};

// POST /payments/confirm — the browser reports the payment for the traveller's booking.
// Razorpay sends { bookingId, razorpay_payment_id, razorpay_order_id, razorpay_signature }; Stripe just { bookingId }.
// Only the booking's owner can call it, and only a payment the gateway confirms counts.
exports.confirmPayment = async (req, res) => {
    try {
        const { bookingId } = req.body || {};
        if (!isId(String(bookingId || ''))) return ResponseHandler.fail(res, 404, 'Booking not found');
        const booking = await Booking.findOne('id = ? AND user_id = ?', [String(bookingId), req.user._id]);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');
        if (booking.status !== 'pending') return ResponseHandler.success(res, { booking }, 'Booking already processed');

        const payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
        if (payment) {
            const remote = await payments.forPayment(payment).settle(payment, req.body);
            await paymentCaptured(payment, remote);
            return ResponseHandler.success(res, { booking: await Booking.findById(booking._id) }, 'Payment confirmed successfully');
        }
        // A booking is only pending without a payment when no gateway was set up at checkout
        if (await payments.active()) return ResponseHandler.fail(res, 400, 'Payment not completed');

        await confirmBooking(booking);
        return ResponseHandler.success(res, { booking }, 'Payment confirmed successfully');
    } catch (err) {
        if (err instanceof payments.PaymentError) return ResponseHandler.fail(res, 400, err.message);
        logger.error('Error confirming payment', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm payment');
    }
};
