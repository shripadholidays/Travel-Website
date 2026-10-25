const { isId } = require('../db/ids');
const { Where, populate } = require('../db/sql');
const TravelOrder = require('../models/TravelOrder');
const User = require('../models/User');
const TravelDestination = require('../models/TravelDestination');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { applyMarkup } = require('../providers/pricing');
const { withTimeout } = require('../providers/errors');
const { toPublicOffer, sendProviderError } = require('../providers/public');
const { getMarkupPct, isKindEnabled, enabledKinds } = require('../services/travel-config');
const { getProvider, finalizeOrder, refundPayment } = require('../services/travel-order-service');
const payments = require('../services/payments');
const { paymentCaptured } = require('../services/payment-events');
const { notFound } = require('../middlewares/require-feature');
const { getCurrencyConfig, convert, rateBetween } = require('../services/currency');

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
    if (!isId(req.params.id)) {
        notFound(res);
        return null;
    }
    const order = await TravelOrder.findOne('id = ? AND user_id = ?', [req.params.id, req.user._id]);
    if (!order || !(await isKindEnabled(order.kind))) {
        notFound(res);
        return null;
    }
    return order;
}

// The tour booking an order belongs to (its date and tour), for "part of your trip" labels
async function populateLinkedTrip(orders, tourFields) {
    await populate(orders, 'linkedBooking', Booking, 'travelDate tour');
    await populate(orders.map((o) => o.linkedBooking).filter(Boolean), 'tour', TravelDestination, tourFields);
}

// POST /travel-orders
exports.createOrder = async (req, res) => {
    try {
        const { kind, offerId, travellers, contact, linkedBooking, quotedTotal, acceptPriceChange, currency: requestedCurrency } = req.body;
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
            const owned = isId(String(linkedBooking))
                && await Booking.count('id = ? AND user_id = ?', [String(linkedBooking), req.user._id]) > 0;
            if (!owned) return ResponseHandler.fail(res, 400, 'The linked trip was not found.');
        }

        // Suppliers quote in their own currency; the traveller pays in the one they picked
        const { base, enabled, rates } = await getCurrencyConfig();
        const pay = enabled.includes(String(requestedCurrency || '').toUpperCase()) ? String(requestedCurrency).toUpperCase() : base;
        const charge = { currency: pay, total: convert(pricing.total, pricing.currency, pay, rates), rate: rateBetween(pricing.currency, pay, rates) };

        const order = await TravelOrder.insert({
            user: req.user._id,
            kind,
            linkedBooking: linkedBooking || null,
            provider: provider.name,
            offerId,
            offer: toPublicOffer(kind, offer, pct),
            travellers,
            contact,
            pricing,
            charge,
        });

        const gateway = await payments.active();
        if (!gateway) {
            // No payment gateway configured (local dev): book straight away.
            await finalizeOrder(order);
            return ResponseHandler.success(res, { order: TravelOrder.toPublic(order) }, 'Booking confirmed');
        }

        let checkout;
        try {
            checkout = await gateway.createCheckout({
                amount: charge.total,
                currency: charge.currency,
                receipt: `${kind}_${order._id}`,
                notes: { travelOrderId: order._id, userId: String(req.user._id), kind },
                description: kind === 'flight' ? 'Flight booking' : 'Hotel booking',
            });
        } catch (gatewayErr) {
            logger.error(`${gateway.label} checkout could not start`, { orderId: order._id, error: gatewayErr?.error?.description || gatewayErr.message });
            order.status = 'failed';
            order.failureReason = 'Payment could not be started';
            await TravelOrder.save(order);
            return ResponseHandler.fail(res, 502, 'Payments are unavailable right now. Please try again shortly.');
        }
        checkout.prefill = {
            name: `${travellers[0].firstName} ${travellers[0].lastName}`.trim(),
            email: order.contact.email,
            contact: order.contact.phone || undefined,
        };
        const payment = await Payment.insert({
            order: order._id,
            user: req.user._id,
            amount: charge.total,
            currency: charge.currency,
            method: gateway.name,
            gatewayOrderId: checkout.orderId,
            status: 'pending',
        });
        order.paymentId = payment._id;
        await TravelOrder.save(order);

        return ResponseHandler.success(res, { order: TravelOrder.toPublic(order), checkout }, 'Order created');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to create the booking');
    }
};

// POST /travel-orders/:id/confirm — the browser reports the payment (webhook-independent).
// Razorpay sends { razorpay_payment_id, razorpay_order_id, razorpay_signature }; Stripe needs nothing.
exports.confirmOrder = async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return undefined;
        if (order.status !== 'pending') return ResponseHandler.success(res, { order: TravelOrder.toPublic(order) });

        const payment = order.paymentId ? await Payment.findById(order.paymentId) : null;
        if (payment) {
            const remote = await payments.forPayment(payment).settle(payment, req.body || {});
            await paymentCaptured(payment, remote);
            return ResponseHandler.success(res, { order: TravelOrder.toPublic(await TravelOrder.findById(order._id)) });
        }
        // An order is only pending without a payment when no gateway was set up at checkout
        if (await payments.active()) return ResponseHandler.fail(res, 400, 'Payment not completed');

        await finalizeOrder(order);
        return ResponseHandler.success(res, { order: TravelOrder.toPublic(order) });
    } catch (err) {
        if (err instanceof payments.PaymentError) return ResponseHandler.fail(res, 400, err.message);
        logger.error('Failed to confirm travel order', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to confirm the booking');
    }
};

// GET /travel-orders — only services that are switched on
exports.getMyOrders = async (req, res) => {
    try {
        const kinds = await enabledKinds();
        const where = new Where().add('user_id = ?', req.user._id).in('kind', kinds);
        const orders = await TravelOrder.find({ where: where.sql, args: where.args, order: 'created_at DESC' });
        await populateLinkedTrip(orders, 'title location');
        return ResponseHandler.success(res, { orders: orders.map(TravelOrder.toPublic) });
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
        await TravelOrder.save(order);
        return ResponseHandler.success(res, { order: TravelOrder.toPublic(order) }, 'Booking cancelled');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to cancel the booking');
    }
};

// GET /admin/travel-orders?kind&status — admins always see every order
exports.adminList = async (req, res) => {
    try {
        const where = new Where();
        if (KINDS.includes(req.query.kind)) where.add('kind = ?', req.query.kind);
        if (STATUSES.includes(req.query.status)) where.add('status = ?', req.query.status);
        const orders = await TravelOrder.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: 200 });
        await populate(orders, 'user', User, 'displayName email');
        await populateLinkedTrip(orders, 'title');
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
        if (!isId(req.params.id)) return ResponseHandler.fail(res, 404, 'Order not found');
        const order = await TravelOrder.findById(req.params.id);
        if (!order) return ResponseHandler.fail(res, 404, 'Order not found');

        if (status === 'cancelled' && order.status === 'confirmed') {
            if (order.providerRef) await withTimeout(getProvider(order.kind).cancel(order.providerRef));
            await refundPayment(order);
        }
        order.status = status;
        await TravelOrder.save(order);
        await populate(order, 'user', User, 'displayName email');
        return ResponseHandler.success(res, { order }, 'Order updated');
    } catch (err) {
        return sendProviderError(res, err, 'Failed to update the order');
    }
};
