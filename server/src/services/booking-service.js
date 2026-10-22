const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');
const { sendBookingConfirmation, sendAdminAlert } = require('./email-service');

// Add-ons are priced here, never by the client.
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
 * Works out what the traveller pays: tour price × travellers, catalogue add-ons,
 * and an optional coupon (re-validated here; the checkout preview is only a preview).
 */
async function priceBooking({ tour, numberOfTravelers, addons = [], couponCode }) {
    const travellers = Number(numberOfTravelers);
    if (!Number.isInteger(travellers) || travellers < 1) throw new BookingError(400, 'At least one traveler is required.');

    const names = [...new Set((addons || []).map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean))];
    const unknown = names.filter((n) => !(n in ADDON_CATALOG));
    if (unknown.length) throw new BookingError(400, `Unknown add-on: ${unknown.join(', ')}`);
    const pricedAddons = names.map((name) => ({ name, price: ADDON_CATALOG[name] }));

    const subtotal = round2(tour.price * travellers + pricedAddons.reduce((s, a) => s + a.price, 0));

    let coupon = null;
    if (couponCode) {
        const found = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim() });
        if (!found) throw new BookingError(400, 'That coupon code was not found.');
        const { valid, reason } = found.isValid(subtotal);
        if (!valid) throw new BookingError(400, reason);
        coupon = { code: found.code, discount: found.applyDiscount(subtotal) };
    }

    return {
        addons: pricedAddons,
        subtotalAmount: subtotal,
        coupon,
        totalAmount: round2(Math.max(0, subtotal - (coupon?.discount ?? 0))),
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
            ['Total', `${booking.currency} ${booking.totalAmount}`],
            ['Coupon', booking.coupon?.code],
        ]);
    } catch (err) {
        logger.error('Failed to send booking confirmation email', { error: err.message, bookingId: booking._id });
    }
    return booking;
}

module.exports = { ADDON_CATALOG, BookingError, parseTravelDate, priceBooking, confirmBooking };
