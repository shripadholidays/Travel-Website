const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const TravelOrder = require('../models/TravelOrder');
const { finalizeOrder } = require('../services/travel-order-service');
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
                        await Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed' });
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

// POST /payments/confirm - Manual confirmation (dev/fallback)
exports.confirmPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        booking.status = 'confirmed';
        await booking.save();

        const payment = await Payment.create({
            booking: booking._id,
            user: req.user._id,
            amount: booking.totalAmount,
            currency: booking.currency,
            method: 'stripe',
            status: 'completed'
        });

        booking.paymentId = payment._id;
        await booking.save();

        return ResponseHandler.success(res, { booking, payment }, 'Payment confirmed successfully');
    } catch (err) {
        logger.error('Error confirming payment', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm payment');
    }
};
