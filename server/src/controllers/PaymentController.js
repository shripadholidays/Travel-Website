const { isId } = require('../db/ids');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const payments = require('../services/payments');
const { paymentCaptured, paymentFailed } = require('../services/payment-events');
const { confirmBooking } = require('../services/booking-service');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// POST /payments/webhook — Razorpay events (set the URL and secret in Razorpay → Webhooks).
// Subscribe to payment.captured, order.paid and payment.failed.
exports.handleWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    if (!payments.verifyWebhookSignature(raw, signature)) {
        logger.warn('Razorpay webhook with a missing or wrong signature');
        return res.status(400).json({ received: false });
    }

    let event;
    try {
        event = JSON.parse(raw.toString('utf8'));
    } catch {
        return res.status(400).json({ received: false });
    }

    const remote = event.payload?.payment?.entity;
    try {
        if (remote?.order_id && ['payment.captured', 'order.paid', 'payment.failed'].includes(event.event)) {
            const payment = await Payment.findOne('gateway_order_id = ?', [remote.order_id]);
            if (!payment) {
                logger.warn('Webhook for an unknown Razorpay order', { orderId: remote.order_id });
            } else if (event.event === 'payment.failed') {
                await paymentFailed(payment, remote);
            } else if (remote.status === 'captured' && remote.amount === payments.toMinor(payment.amount)) {
                await paymentCaptured(payment, remote);
                logger.info('Payment captured (webhook)', { paymentId: payment._id });
            } else {
                logger.warn('Webhook payment not captured or amount mismatch', { paymentId: payment._id, status: remote.status });
            }
        }
    } catch (err) {
        // Razorpay retries on a non-2xx; log and accept so one bad record cannot block the queue
        logger.error('Error processing Razorpay webhook', { error: err.message, event: event.event });
    }
    return res.status(200).json({ received: true });
};

// POST /payments/confirm — the browser reports a Razorpay payment for the traveller's booking.
// Body: { bookingId, razorpay_payment_id, razorpay_order_id, razorpay_signature }.
// Only the booking's owner can call it, and only a payment Razorpay confirms as captured counts.
exports.confirmPayment = async (req, res) => {
    try {
        const { bookingId } = req.body || {};
        if (!isId(String(bookingId || ''))) return ResponseHandler.fail(res, 404, 'Booking not found');
        const booking = await Booking.findOne('id = ? AND user_id = ?', [String(bookingId), req.user._id]);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');
        if (booking.status !== 'pending') return ResponseHandler.success(res, { booking }, 'Booking already processed');

        if (payments.gateway()) {
            const payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
            const remote = await payments.settle(payment, {
                paymentId: req.body.razorpay_payment_id,
                orderId: req.body.razorpay_order_id,
                signature: req.body.razorpay_signature,
            });
            await paymentCaptured(payment, remote);
            return ResponseHandler.success(res, { booking: await Booking.findById(booking._id) }, 'Payment confirmed successfully');
        }

        await confirmBooking(booking);
        return ResponseHandler.success(res, { booking }, 'Payment confirmed successfully');
    } catch (err) {
        if (err instanceof payments.PaymentError) return ResponseHandler.fail(res, 400, err.message);
        logger.error('Error confirming payment', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm payment');
    }
};
