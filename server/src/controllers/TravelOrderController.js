const mongoose = require('mongoose');
const TravelOrder = require('../models/TravelOrder');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { applyMarkup } = require('../providers/pricing');
const { withTimeout } = require('../providers/errors');
const { toPublicOffer, sendProviderError } = require('../providers/public');
const { getMarkupPct, isKindEnabled, enabledKinds } = require('../services/travel-config');
const { getProvider, finalizeOrder, refundPayment, stripeClient } = require('../services/travel-order-service');
const { notFound } = require('../middlewares/require-feature');

const KINDS = ['flight', 'hotel'];
const STATUSES = ['pending', 'confirmed', 'cancelled', 'failed'];

function validateTravellers(travellers, international) {
    if (!Array.isArray(travellers) || travellers.length === 0) return 'At least one traveller is required.';
    for (const t of travellers) {
        if (!t || !String(t.firstName || '').trim() || !String(t.lastName || '').trim()) {
            return 'Every traveller needs a first and last name.';
        }
        if (international && (!t.passportNumber || !t.passportExpiry || !t.nationality)) {
            return 'Passport number, expiry and nationality are required for international flights.';
        }
    }
    return null;
}

// Loads the caller's own order; 404 when missing, not theirs, or its service is switched off.
async function loadOwnOrder(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        notFound(res);
        return null;
    }
    const order = await TravelOrder.findOne({ _id: req.params.id, user: req.user._id });
    if (!order || !(await isKindEnabled(order.kind))) {
        notFound(res);
        return null;
    }
    return order;
}

// POST /travel-orders
exports.createOrder = async (req, res) => {
    try {
        const { kind, offerId, travellers, contact, linkedBooking, quotedTotal, acceptPriceChange } = req.body;
        if (!KINDS.includes(kind)) return ResponseHandler.fail(res, 400, 'Unknown booking type.');
        if (!offerId) return ResponseHandler.fail(res, 400, 'An offer is required.');
        if (!contact?.email) return ResponseHandler.fail(res, 400, 'A contact email is required.');

        const provider = getProvider(kind);
        const offer = await withTimeout(provider.getOffer(offerId));
        const travellerError = validateTravellers(travellers, kind === 'flight' && offer.international);
        if (travellerError) return ResponseHandler.fail(res, 400, travellerError);

        const pct = await getMarkupPct(kind);
        const pricing = applyMarkup(offer.supplierAmount, pct, offer.currency);

        // Prices move: never charge more than the traveller saw without asking first.
        if (typeof quotedTotal === 'number' && Math.abs(quotedTotal - pricing.total) > 0.009 && !acceptPriceChange) {
            return ResponseHandler.success(res, { priceChanged: true, newTotal: pricing.total }, 'Price changed');
        }

        if (linkedBooking) {
            const owned = mongoose.isValidObjectId(linkedBooking)
                && await Booking.exists({ _id: linkedBooking, user: req.user._id });
            if (!owned) return ResponseHandler.fail(res, 400, 'The linked trip was not found.');
        }

        const order = await TravelOrder.create({
            user: req.user._id,
            kind,
            linkedBooking: linkedBooking || null,
            provider: provider.name,
            offerId,
            offer: toPublicOffer(kind, offer, pct),
            travellers,
            contact,
            pricing,
        });

        const stripe = stripeClient();
        if (!stripe) {
            // No payment gateway configured (local dev): book straight away.
            await finalizeOrder(order);
            return ResponseHandler.success(res, { order: order.toPublic() }, 'Booking confirmed');
        }

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(pricing.total * 100),
                currency: pricing.currency.toLowerCase(),
                metadata: { travelOrderId: order._id.toString(), userId: req.user._id.toString() },
            });
        } catch (stripeErr) {
            logger.error('Stripe payment intent creation failed', { orderId: order._id, error: stripeErr.message });
            order.status = 'failed';
            order.failureReason = 'Payment could not be started';
            await order.save();
            return ResponseHandler.fail(res, 502, 'Payments are unavailable right now. Please try again shortly.');
        }
        const payment = await Payment.create({
            order: order._id,
            user: req.user._id,
            amount: pricing.total,
            currency: pricing.currency,
            method: 'stripe',
            stripePaymentIntentId: paymentIntent.id,
            status: 'pending',
        });
        order.paymentId = payment._id;
        await order.save();

        return ResponseHandler.success(res, { order: order.toPublic(), clientSecret: paymentIntent.client_secret }, 'Order created');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to create the booking');
    }
};

// POST /travel-orders/:id/confirm — called after Stripe confirms on the client (webhook-independent)
exports.confirmOrder = async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return undefined;
        if (order.status !== 'pending') return ResponseHandler.success(res, { order: order.toPublic() });

        const stripe = stripeClient();
        const payment = order.paymentId ? await Payment.findById(order.paymentId) : null;
        if (stripe && payment?.stripePaymentIntentId) {
            const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
            if (intent.status !== 'succeeded') return ResponseHandler.fail(res, 400, 'Payment not completed');
            payment.status = 'completed';
            payment.gatewayResponse = intent;
            await payment.save();
        } else if (stripe) {
            return ResponseHandler.fail(res, 400, 'Payment not completed');
        }

        await finalizeOrder(order);
        return ResponseHandler.success(res, { order: order.toPublic() });
    } catch (err) {
        logger.error('Failed to confirm travel order', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm the booking');
    }
};

// GET /travel-orders — only services that are switched on
exports.getMyOrders = async (req, res) => {
    try {
        const kinds = await enabledKinds();
        const orders = await TravelOrder.find({ user: req.user._id, kind: { $in: kinds } })
            .sort({ createdAt: -1 })
            .populate({ path: 'linkedBooking', select: 'travelDate tour', populate: { path: 'tour', select: 'title location' } });
        return ResponseHandler.success(res, { orders: orders.map((o) => o.toPublic()) });
    } catch (err) {
        logger.error('Failed to list travel orders', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load your bookings');
    }
};

// PATCH /travel-orders/:id/cancel
exports.cancelOrder = async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return undefined;
        if (!['pending', 'confirmed'].includes(order.status)) {
            return ResponseHandler.fail(res, 400, 'This booking can no longer be cancelled.');
        }
        if (order.status === 'confirmed' && order.offer?.refundable === false) {
            return ResponseHandler.fail(res, 400, 'This booking is non-refundable.');
        }
        if (order.status === 'confirmed' && order.providerRef) {
            await withTimeout(getProvider(order.kind).cancel(order.providerRef));
        }
        await refundPayment(order);
        order.status = 'cancelled';
        await order.save();
        return ResponseHandler.success(res, { order: order.toPublic() }, 'Booking cancelled');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to cancel the booking');
    }
};

// GET /admin/travel-orders?kind&status — admins always see every order
exports.adminList = async (req, res) => {
    try {
        const filter = {};
        if (KINDS.includes(req.query.kind)) filter.kind = req.query.kind;
        if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
        const orders = await TravelOrder.find(filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('user', 'displayName email')
            .populate({ path: 'linkedBooking', select: 'travelDate tour', populate: { path: 'tour', select: 'title' } });
        return ResponseHandler.success(res, { orders });
    } catch (err) {
        logger.error('Failed to list travel orders (admin)', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to load travel orders');
    }
};

// PATCH /admin/travel-orders/:id { status }
exports.adminUpdate = async (req, res) => {
    try {
        const { status } = req.body;
        if (!STATUSES.includes(status)) return ResponseHandler.fail(res, 400, 'Invalid status.');
        if (!mongoose.isValidObjectId(req.params.id)) return ResponseHandler.fail(res, 404, 'Order not found');
        const order = await TravelOrder.findById(req.params.id);
        if (!order) return ResponseHandler.fail(res, 404, 'Order not found');

        if (status === 'cancelled' && order.status === 'confirmed') {
            if (order.providerRef) await withTimeout(getProvider(order.kind).cancel(order.providerRef));
            await refundPayment(order);
        }
        order.status = status;
        await order.save();
        await order.populate('user', 'displayName email');
        return ResponseHandler.success(res, { order }, 'Order updated');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to update the order');
    }
};
