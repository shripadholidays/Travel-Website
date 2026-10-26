const { isId } = require('../db/ids');
const { Where, containsAny, populate, escapeLike } = require('../db/sql');
const { validationText } = require('../db/errors');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { completePastBookings, populateBooking, BookingError, parseTravelDate, priceBooking, confirmBooking, cancelBooking: cancelBookingWithRefund } = require('../services/booking-service');
const payments = require('../services/payments');
const config = require('../config');
const { formatMoney } = require('../services/currency');
const { hasPermission, PERMISSIONS } = require('../config/permissions');

const handlesBookings = (user) => hasPermission(user, PERMISSIONS.BOOKINGS);
const idOfUser = (b) => String(b.user?._id ?? b.user);

// POST /bookings - Create booking + payment intent
exports.createBooking = async (req, res) => {
    try {
        const {
            tour: tourField, tourId: tourIdField, travelDate, numberOfTravelers,
            contactInfo, addons, specialRequests, couponCode, currency: requestedCurrency, choice
        } = req.body;

        // Accept either `tour` or `tourId` from the client.
        const tourId = tourIdField || tourField;
        if (!tourId) return ResponseHandler.fail(res, 400, 'A tour is required to create a booking.');
        const date = parseTravelDate(travelDate);

        const tour = await TravelDestination.findById(tourId);
        // Draft and hidden tours cannot be booked
        if (!tour || tour.status !== 'active') return ResponseHandler.fail(res, 404, 'Tour not found');
        // The limits the tour's listing promises
        if (tour.maxGroupSize && Number(numberOfTravelers) > tour.maxGroupSize) {
            return ResponseHandler.fail(res, 400, `This tour takes at most ${tour.maxGroupSize} travellers per booking.`);
        }
        if (tour.validity && date > tour.validity) {
            return ResponseHandler.fail(res, 400, `This tour runs until ${tour.validity.toISOString().slice(0, 10)}. Please pick an earlier date.`);
        }

        // Prices, add-ons and coupons are all worked out here, never trusted from the client.
        const pricing = await priceBooking({ tour, numberOfTravelers, addons, couponCode, currency: requestedCurrency, choice });
        const { currency } = pricing;

        const booking = await Booking.insert({
            user: req.user._id,
            tour: tour._id,
            travelDate: date,
            numberOfTravelers,
            contactInfo: {
                firstName: contactInfo?.firstName,
                lastName: contactInfo?.lastName,
                email: contactInfo?.email,
                phone: contactInfo?.phone,
            },
            addons: pricing.addons,
            packageChoice: pricing.packageChoice,
            subtotalAmount: pricing.subtotalAmount,
            coupon: pricing.coupon || null,
            totalAmount: pricing.totalAmount,
            currency,
            unitPrice: pricing.unitPrice,
            tourCurrency: pricing.tourCurrency,
            exchangeRate: pricing.exchangeRate,
            baseCurrency: pricing.baseCurrency,
            baseAmount: pricing.baseAmount,
            specialRequests,
            status: 'pending'
        });

        let checkout = null;
        const gateway = pricing.totalAmount > 0 ? await payments.active() : null;
        if (!gateway) {
            // No payment gateway (local dev) or nothing to pay: confirm straight away.
            await confirmBooking(booking);
        } else {
            try {
                // An order for exactly this amount; the browser pays it in Razorpay Checkout or Stripe's form
                checkout = await gateway.createCheckout({
                    amount: pricing.totalAmount,
                    currency,
                    receipt: `booking_${booking._id}`,
                    notes: { bookingId: booking._id, userId: String(req.user._id), tour: tour.title.slice(0, 200) },
                    description: tour.title,
                });
                checkout.prefill = {
                    name: `${booking.contactInfo.firstName} ${booking.contactInfo.lastName}`.trim(),
                    email: booking.contactInfo.email,
                    contact: booking.contactInfo.phone,
                };

                const payment = await Payment.insert({
                    booking: booking._id,
                    user: req.user._id,
                    amount: pricing.totalAmount,
                    currency,
                    method: gateway.name,
                    gatewayOrderId: checkout.orderId,
                    status: 'pending'
                });

                booking.paymentId = payment._id;
                await Booking.save(booking);
            } catch (gatewayErr) {
                // Don't tell the traveller they're booked when payment can't even start.
                logger.error(`${gateway.label} checkout could not start`, { error: gatewayErr?.error?.description || gatewayErr.message, bookingId: booking._id });
                booking.status = 'cancelled';
                await Booking.save(booking);
                return ResponseHandler.fail(res, 502, 'Payments are unavailable right now. Please try again shortly.');
            }
        }

        const populatedBooking = await populateBooking(await Booking.findById(booking._id));

        return ResponseHandler.success(res, {
            booking: populatedBooking,
            checkout
        }, 'Booking created successfully');
    } catch (err) {
        if (err instanceof BookingError) return ResponseHandler.fail(res, err.status, err.message);
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error creating booking', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create booking');
    }
};

// GET /bookings - Get user's bookings
exports.getUserBookings = async (req, res) => {
    try {
        const { page = 1, limit = config.pagination.defaultLimit, status } = req.query;
        const where = new Where().add('user_id = ?', req.user._id);
        if (status) where.add('status = ?', status);
        await completePastBookings({ user: req.user._id });

        const [bookings, total] = await Promise.all([
            Booking.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: Number(limit), offset: (Number(page) - 1) * Number(limit) }),
            Booking.count(where.sql, where.args),
        ]);
        await populate(bookings, 'tour', TravelDestination, 'title imageURL location price currency duration');

        return ResponseHandler.success(res, {
            bookings,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Bookings fetched successfully');
    } catch (err) {
        logger.error('Error fetching user bookings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch bookings');
    }
};

// GET /bookings/:id
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        if (idOfUser(booking) !== String(req.user._id) && !handlesBookings(req.user)) {
            return ResponseHandler.fail(res, 403, 'Access denied');
        }

        await populateBooking(booking, 'title imageURL location price currency duration itinerary inclusions');
        await populate(booking, 'paymentId', Payment);

        return ResponseHandler.success(res, { booking }, 'Booking fetched successfully');
    } catch (err) {
        logger.error('Error fetching booking', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch booking');
    }
};

// PATCH /bookings/:id/cancel
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        if (idOfUser(booking) !== String(req.user._id) && !handlesBookings(req.user)) {
            return ResponseHandler.fail(res, 403, 'Access denied');
        }

        await cancelBookingWithRefund(booking, { byAdmin: handlesBookings(req.user) });
        const message = booking.refundedAmount
            ? `Booking cancelled. ${formatMoney(booking.refundedAmount, booking.currency)} will be refunded to your card.`
            : 'Booking cancelled successfully';
        return ResponseHandler.success(res, { booking }, message);
    } catch (err) {
        if (err instanceof BookingError) return ResponseHandler.fail(res, err.status, err.message);
        logger.error('Error cancelling booking', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to cancel booking');
    }
};

// GET /admin/bookings
exports.getAllBookings = async (req, res) => {
    try {
        const { page = 1, limit = config.pagination.adminDefaultLimit, status, search } = req.query;
        const where = new Where();
        // Traveller name, email or the booking reference (the last characters of its id)
        if (search && String(search).trim()) {
            const q = String(search).trim();
            const match = containsAny(['contact_info_email', 'contact_info_first_name', 'contact_info_last_name'], q);
            const parts = [match.sql];
            const args = [...match.args];
            if (isId(q)) { parts.push('id = ?'); args.push(q.toLowerCase()); }
            else if (/^[a-f0-9]{4,23}$/i.test(q)) { parts.push("id LIKE ? ESCAPE '\\'"); args.push(`%${escapeLike(q.toLowerCase())}`); }
            where.add(parts.join(' OR '), ...args);
        }
        await completePastBookings();

        // Counts for the status tabs, with the same search applied
        const statusCounts = await Booking.countBy('status', where.sql, where.args);
        if (status && status !== 'all') where.add('status = ?', status);

        const [bookings, total] = await Promise.all([
            Booking.find({ where: where.sql, args: where.args, order: 'created_at DESC', limit: Number(limit), offset: (Number(page) - 1) * Number(limit) }),
            Booking.count(where.sql, where.args),
        ]);
        await populateBooking(bookings, 'title location price currency');

        return ResponseHandler.success(res, {
            bookings,
            statusCounts,
            statusChanges: STATUS_CHANGES,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'All bookings fetched successfully');
    } catch (err) {
        logger.error('Error fetching all bookings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch bookings');
    }
};

// Which status a booking may move to from each status (the admin menu shows the same choices)
const STATUS_CHANGES = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};

// PATCH /admin/bookings/:id
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return ResponseHandler.fail(res, 400, 'Invalid status');
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        // A cancelled (and refunded) or finished trip cannot be reopened from here
        const allowed = STATUS_CHANGES[booking.status] || [];
        if (!allowed.includes(status)) {
            return ResponseHandler.fail(res, 409, `A ${booking.status} booking can't be marked ${status}.`);
        }

        // Cancelling refunds and confirming sends the confirmation, same as the traveller's own flow
        if (status === 'cancelled') {
            await cancelBookingWithRefund(booking, { byAdmin: true });
        } else if (status === 'confirmed' && booking.status === 'pending') {
            await confirmBooking(booking);
        } else {
            booking.status = status;
            await Booking.save(booking);
        }
        await populateBooking(booking, 'title location price currency');

        return ResponseHandler.success(res, { booking }, 'Booking status updated successfully');
    } catch (err) {
        if (err instanceof BookingError) return ResponseHandler.fail(res, err.status, err.message);
        logger.error('Error updating booking status', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update booking status');
    }
};
