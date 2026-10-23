const Booking = require('../models/Booking');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');
const { refundPayment } = require('./travel-order-service');
const logger = require('../utils/logger');
const { getCurrencyConfig, convert, rateBetween, formatMoney } = require('./currency');
const { sendBookingConfirmation, sendAdminAlert } = require('./email-service');

// Add-ons are priced here, never by the client (in US dollars, converted to the checkout currency).
const ADDON_CATALOG = {
    'Airport Transfer': 50,
    'Travel Insurance': 30,
    'Photo Package': 100,
};

class BookingError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Parses YYYY-MM-DD (or an ISO string) and rejects past or invalid dates. */
function parseTravelDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) throw new BookingError(400, 'Please choose a travel date.');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) throw new BookingError(400, 'The travel date is in the past.');
    return date;
}

/**
 * Checks a coupon against an order in any currency. Flat discounts and minimum orders are set
 * in the coupon's own currency and converted; percentages apply as they are.
 */
function couponDiscount(coupon, subtotal, currency, rates) {
    const orderInCouponCurrency = convert(subtotal, currency, coupon.currency || 'USD', rates);
    const { valid, reason } = coupon.isValid(orderInCouponCurrency, currency, rates);
    if (!valid) return { valid, reason };
    const discount = coupon.discountType === 'percent'
        ? round2(subtotal * (coupon.discountValue / 100))
        : Math.min(subtotal, convert(coupon.discountValue, coupon.currency || 'USD', currency, rates));
    return { valid: true, discount: round2(discount) };
}

/**
 * Works out what the traveller pays, in the currency they chose: tour price converted from the
 * tour's own currency × travellers, catalogue add-ons, and an optional coupon (re-validated here;
 * the checkout preview is only a preview). Unsupported or switched-off currencies fall back to
 * the site's base currency.
 */
async function priceBooking({ tour, numberOfTravelers, addons = [], couponCode, currency }) {
    const travellers = Number(numberOfTravelers);
    if (!Number.isInteger(travellers) || travellers < 1) throw new BookingError(400, 'At least one traveler is required.');

    const { base, enabled, rates } = await getCurrencyConfig();
    const pay = enabled.includes(String(currency || '').toUpperCase()) ? String(currency).toUpperCase() : base;
    const tourCurrency = rates[tour.currency] ? tour.currency : 'USD';
    const unitPrice = convert(tour.price, tourCurrency, pay, rates);

    const names = [...new Set((addons || []).map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean))];
    const unknown = names.filter((n) => !(n in ADDON_CATALOG));
    if (unknown.length) throw new BookingError(400, `Unknown add-on: ${unknown.join(', ')}`);
    const pricedAddons = names.map((name) => ({ name, price: convert(ADDON_CATALOG[name], 'USD', pay, rates) }));

    const subtotal = round2(unitPrice * travellers + pricedAddons.reduce((s, a) => s + a.price, 0));

    let coupon = null;
    if (couponCode) {
        const found = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
        if (!found) throw new BookingError(400, 'That coupon code was not found.');
        const result = couponDiscount(found, subtotal, pay, rates);
        if (!result.valid) throw new BookingError(400, result.reason);
        coupon = { code: found.code, discount: result.discount };
    }

    const totalAmount = round2(Math.max(0, subtotal - (coupon?.discount ?? 0)));
    return {
        currency: pay,
        unitPrice,
        tourCurrency,
        exchangeRate: rateBetween(tourCurrency, pay, rates),
        addons: pricedAddons,
        subtotalAmount: subtotal,
        coupon,
        totalAmount,
        // Revenue is reported in the base currency, at the rate of the day
        baseCurrency: base,
        baseAmount: convert(totalAmount, pay, base, rates),
    };
}

/** Marks a pending booking confirmed, uses up its coupon and emails the traveller. Idempotent. */
async function confirmBooking(booking) {
    if (booking.status !== 'pending') return booking;
    booking.status = 'confirmed';
    await booking.save();

    if (booking.coupon?.code) {
        await Coupon.updateOne({ code: booking.coupon.code }, { $inc: { usedCount: 1 } });
    }

    try {
        await booking.populate([
            { path: 'tour', select: 'title imageURL location price duration' },
            { path: 'user', select: 'displayName email' },
        ]);
        const email = booking.contactInfo?.email || booking.user?.email;
        if (email) await sendBookingConfirmation(booking, email);
        await sendAdminAlert(`New booking: ${booking.tour?.title || 'tour'}`, [
            ['Traveller', `${booking.contactInfo?.firstName || ''} ${booking.contactInfo?.lastName || ''}`.trim()],
            ['Email', email],
            ['Travel date', new Date(booking.travelDate).toDateString()],
            ['Travellers', booking.numberOfTravelers],
            ['Total', formatMoney(booking.totalAmount, booking.currency)],
            ['Coupon', booking.coupon?.code],
        ]);
    } catch (err) {
        logger.error('Failed to send booking confirmation email', { error: err.message, bookingId: booking._id });
    }
    return booking;
}

// Free cancellation ends this long before the travel date (travellers; admins can always cancel)
const FREE_CANCELLATION_HOURS = 24;

/**
 * Cancels a booking the way the site promises: free up to 24 hours before
 * departure, the card payment refunded, and a used coupon given back.
 */
async function cancelBooking(booking, { byAdmin = false } = {}) {
    if (booking.status === 'cancelled') throw new BookingError(400, 'Booking is already cancelled');
    if (booking.status === 'completed') throw new BookingError(400, 'This trip has already taken place');

    const hoursLeft = (new Date(booking.travelDate).getTime() - Date.now()) / 36e5;
    if (!byAdmin && hoursLeft < FREE_CANCELLATION_HOURS) {
        throw new BookingError(400, 'Free cancellation ends 24 hours before departure. Please contact us about this booking.');
    }

    const wasConfirmed = booking.status === 'confirmed';
    const payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
    const paid = payment?.status === 'completed';
    // The refund goes first: a booking is only cancelled once the money is on its way back
    await refundPayment(booking);

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.refundedAmount = paid ? payment.amount : 0;
    await booking.save();

    if (wasConfirmed && booking.coupon?.code) {
        await Coupon.updateOne({ code: booking.coupon.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }

    try {
        await booking.populate([{ path: 'tour', select: 'title' }, { path: 'user', select: 'displayName email' }]);
        await sendAdminAlert(`Booking cancelled: ${booking.tour?.title || 'tour'}`, [
            ['Traveller', booking.user?.displayName || booking.user?.email],
            ['Travel date', new Date(booking.travelDate).toDateString()],
            ['Refunded', booking.refundedAmount ? formatMoney(booking.refundedAmount, booking.currency) : 'Nothing was charged'],
            ['Cancelled by', byAdmin ? 'Admin' : 'Traveller'],
        ]);
    } catch (err) {
        logger.error('Cancellation alert failed', { bookingId: booking._id, error: err.message });
    }
    return booking;
}

/**
 * Confirmed trips whose last day has passed become "completed" (it unlocks
 * reviews-as-verified and article writing). Cheap to call before reads.
 */
async function completePastBookings(filter = {}) {
    const started = await Booking.find({ ...filter, status: 'confirmed', travelDate: { $lt: new Date() } })
        .select('travelDate tour')
        .populate('tour', 'duration')
        .lean();
    const finished = started.filter((b) => {
        const days = b.tour?.duration?.days || 1;
        return new Date(b.travelDate).getTime() + days * 864e5 < Date.now();
    });
    if (finished.length) {
        await Booking.updateMany({ _id: { $in: finished.map((b) => b._id) }, status: 'confirmed' }, { status: 'completed' });
    }
    return finished.length;
}

module.exports = { couponDiscount, completePastBookings, ADDON_CATALOG, BookingError, FREE_CANCELLATION_HOURS, parseTravelDate, priceBooking, confirmBooking, cancelBooking };
