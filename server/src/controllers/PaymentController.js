const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { confirmBooking } = require('../services/booking-service');
const TravelOrder = require('../models/TravelOrder');
const { finalizeOrder, stripeClient } = require('../services/travel-order-service');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// POST /payments/webhook - Stripe webhook handler
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        logger.warn('Stripe not configured, skipping webhook');
        return res.status(200).json({ received: true });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.error('Webhook signature verification failed', { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            try {
                const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
                if (payment) {
                    payment.status = 'completed';
                    payment.gatewayResponse = paymentIntent;
                    await payment.save();

                    if (payment.booking) {
                        const booking = await Booking.findById(payment.booking);
                        if (booking) await confirmBooking(booking);
                        logger.info('Payment completed and booking confirmed', { paymentId: payment._id });
                    } else if (payment.order) {
                        const order = await TravelOrder.findById(payment.order);
                        if (order) await finalizeOrder(order);
                        logger.info('Payment completed for travel order', { paymentId: payment._id, status: order?.status });
                    }
                }
            } catch (err) {
                logger.error('Error processing payment success webhook', { error: err.message });
            }
            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            try {
                const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });
                if (payment) {
                    payment.status = 'failed';
                    payment.gatewayResponse = paymentIntent;
                    await payment.save();
                    logger.warn('Payment failed', { paymentId: payment._id });
                }
            } catch (err) {
                logger.error('Error processing payment failure webhook', { error: err.message });
            }
            break;
        }
        default:
            logger.debug(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
};

// POST /payments/confirm - called by the client after Stripe confirms (webhook-independent).
// Only the booking's owner can call it, and only a payment Stripe reports as succeeded confirms it.
exports.confirmPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!mongoose.isValidObjectId(bookingId)) return ResponseHandler.fail(res, 404, 'Booking not found');
        const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');
        if (booking.status !== 'pending') return ResponseHandler.success(res, { booking }, 'Booking already processed');

        const stripe = stripeClient();
        const payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
        if (stripe) {
            if (!payment?.stripePaymentIntentId) return ResponseHandler.fail(res, 400, 'Payment not completed');
            const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
            if (intent.status !== 'succeeded') return ResponseHandler.fail(res, 400, 'Payment not completed');
            payment.status = 'completed';
            payment.gatewayResponse = intent;
            await payment.save();
        }

        await confirmBooking(booking);
        return ResponseHandler.success(res, { booking }, 'Payment confirmed successfully');
    } catch (err) {
        logger.error('Error confirming payment', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm payment');
    }
};
