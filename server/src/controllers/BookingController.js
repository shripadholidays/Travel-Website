const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { completePastBookings, BookingError, parseTravelDate, priceBooking, confirmBooking, cancelBooking: cancelBookingWithRefund } = require('../services/booking-service');
const { stripeClient } = require('../services/travel-order-service');
const config = require('../config');

// POST /bookings - Create booking + payment intent
exports.createBooking = async (req, res) => {
    try {
        const {
            tour: tourField, tourId: tourIdField, travelDate, numberOfTravelers,
            contactInfo, addons, specialRequests, couponCode
        } = req.body;

        // Accept either `tour` or `tourId` from the client.
        const tourId = tourIdField || tourField;
        if (!tourId) return ResponseHandler.fail(res, 400, 'A tour is required to create a booking.');
        const date = parseTravelDate(travelDate);

        const tour = await TravelDestination.findById(tourId);
        // Draft and hidden tours cannot be booked
        if (!tour || tour.status !== 'active') return ResponseHandler.fail(res, 404, 'Tour not found');

        // Prices, add-ons and coupons are all worked out here, never trusted from the client.
        const pricing = await priceBooking({ tour, numberOfTravelers, addons, couponCode });
        const currency = config.stripe.defaultCurrency;

        const booking = await Booking.create({
            user: req.user._id,
            tour: tourId,
            travelDate: date,
            numberOfTravelers,
            contactInfo,
            addons: pricing.addons,
            subtotalAmount: pricing.subtotalAmount,
            coupon: pricing.coupon || undefined,
            totalAmount: pricing.totalAmount,
            currency,
            specialRequests,
            status: 'pending'
        });

        const stripe = stripeClient();
        let clientSecret = null;
        if (!stripe || pricing.totalAmount === 0) {
            // No payment gateway (local dev) or nothing to pay: confirm straight away.
            await confirmBooking(booking);
        } else {
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(pricing.totalAmount * 100),
                    currency: currency.toLowerCase(),
                    metadata: {
                        bookingId: booking._id.toString(),
                        userId: req.user._id.toString()
                    }
                });

                const payment = await Payment.create({
                    booking: booking._id,
                    user: req.user._id,
                    amount: pricing.totalAmount,
                    currency,
                    method: 'stripe',
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'pending'
                });

                booking.paymentId = payment._id;
                await booking.save();
                clientSecret = paymentIntent.client_secret;
            } catch (stripeErr) {
                // Don't tell the traveller they're booked when payment can't even start.
                logger.error('Stripe payment intent creation failed', { error: stripeErr.message, bookingId: booking._id });
                booking.status = 'cancelled';
                await booking.save();
                return ResponseHandler.fail(res, 502, 'Payments are unavailable right now. Please try again shortly.');
            }
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('tour', 'title imageURL location price duration')
            .populate('user', 'displayName email');

        return ResponseHandler.success(res, {
            booking: populatedBooking,
            clientSecret
        }, 'Booking created successfully');
    } catch (err) {
        if (err instanceof BookingError) return ResponseHandler.fail(res, err.status, err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        logger.error('Error creating booking', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create booking');
    }
};

// GET /bookings - Get user's bookings
exports.getUserBookings = async (req, res) => {
    try {
        const { page = 1, limit = config.pagination.defaultLimit, status } = req.query;
        const query = { user: req.user._id };
        if (status) query.status = status;
        await completePastBookings({ user: req.user._id });

        const bookings = await Booking.find(query)
            .populate('tour', 'title imageURL location price duration')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Booking.countDocuments(query);

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
        const booking = await Booking.findById(req.params.id)
            .populate('tour', 'title imageURL location price duration itinerary inclusions')
            .populate('user', 'displayName email')
            .populate('paymentId');

        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return ResponseHandler.fail(res, 403, 'Access denied');
        }

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

        if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return ResponseHandler.fail(res, 403, 'Access denied');
        }

        await cancelBookingWithRefund(booking, { byAdmin: req.user.role === 'admin' });
        const message = booking.refundedAmount
            ? `Booking cancelled. $${booking.refundedAmount} will be refunded to your card.`
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
        const { page = 1, limit = config.pagination.adminDefaultLimit, status } = req.query;
        const query = {};
        if (status) query.status = status;
        await completePastBookings();

        const bookings = await Booking.find(query)
            .populate('tour', 'title location price')
            .populate('user', 'displayName email')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Booking.countDocuments(query);

        return ResponseHandler.success(res, {
            bookings,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'All bookings fetched successfully');
    } catch (err) {
        logger.error('Error fetching all bookings', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch bookings');
    }
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

        // Cancelling refunds and confirming sends the confirmation, same as the traveller's own flow
        if (status === 'cancelled') {
            await cancelBookingWithRefund(booking, { byAdmin: true });
        } else if (status === 'confirmed' && booking.status === 'pending') {
            await confirmBooking(booking);
        } else {
            booking.status = status;
            await booking.save();
        }
        await booking.populate([
            { path: 'tour', select: 'title location price' },
            { path: 'user', select: 'displayName email' },
        ]);

        return ResponseHandler.success(res, { booking }, 'Booking status updated successfully');
    } catch (err) {
        if (err instanceof BookingError) return ResponseHandler.fail(res, err.status, err.message);
        logger.error('Error updating booking status', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update booking status');
    }
};
