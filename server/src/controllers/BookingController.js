const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const { sendBookingConfirmation } = require('../services/email-service');

// POST /bookings - Create booking + payment intent
exports.createBooking = async (req, res) => {
    try {
        const {
            tour: tourField, tourId: tourIdField, travelDate, numberOfTravelers,
            contactInfo, addons, specialRequests, currency
        } = req.body;

        // Accept either `tour` or `tourId` from the client.
        const tourId = tourIdField || tourField;
        if (!tourId) return ResponseHandler.fail(res, 400, 'A tour is required to create a booking.');
        if (!travelDate) return ResponseHandler.fail(res, 400, 'A travel date is required.');
        if (!numberOfTravelers || numberOfTravelers < 1) return ResponseHandler.fail(res, 400, 'At least one traveler is required.');

        const tour = await TravelDestination.findById(tourId);
        if (!tour) return ResponseHandler.fail(res, 404, 'Tour not found');

        const baseAmount = tour.price * numberOfTravelers;
        const addonsTotal = (addons || []).reduce((sum, a) => sum + (a.price || 0), 0);
        const totalAmount = baseAmount + addonsTotal;

        const booking = await Booking.create({
            user: req.user._id,
            tour: tourId,
            travelDate,
            numberOfTravelers,
            contactInfo,
            addons: addons || [],
            totalAmount,
            currency: currency || 'USD',
            specialRequests,
            status: 'pending'
        });

        // Create Stripe payment intent if configured
        let clientSecret = null;
        if (process.env.STRIPE_SECRET_KEY) {
            try {
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(totalAmount * 100),
                    currency: (currency || 'usd').toLowerCase(),
                    metadata: {
                        bookingId: booking._id.toString(),
                        userId: req.user._id.toString()
                    }
                });

                const payment = await Payment.create({
                    booking: booking._id,
                    user: req.user._id,
                    amount: totalAmount,
                    currency: currency || 'USD',
                    method: 'stripe',
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'pending'
                });

                booking.paymentId = payment._id;
                await booking.save();
                clientSecret = paymentIntent.client_secret;
            } catch (stripeErr) {
                logger.error('Stripe payment intent creation failed', { error: stripeErr.message });
            }
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('tour', 'title imageURL location price duration')
            .populate('user', 'displayName email');

        // Send booking confirmation email (non-blocking)
        try {
            const userEmail = populatedBooking.user?.email || contactInfo?.email;
            if (userEmail) {
                await sendBookingConfirmation(populatedBooking, userEmail);
            }
        } catch (emailErr) {
            logger.error('Failed to send booking confirmation email', { error: emailErr.message, bookingId: booking._id });
        }

        return ResponseHandler.success(res, {
            booking: populatedBooking,
            clientSecret
        }, 'Booking created successfully');
    } catch (err) {
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
        const { page = 1, limit = 10, status } = req.query;
        const query = { user: req.user._id };
        if (status) query.status = status;

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

        if (booking.status === 'cancelled') {
            return ResponseHandler.fail(res, 400, 'Booking is already cancelled');
        }

        booking.status = 'cancelled';
        await booking.save();

        return ResponseHandler.success(res, { booking }, 'Booking cancelled successfully');
    } catch (err) {
        logger.error('Error cancelling booking', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to cancel booking');
    }
};

// GET /admin/bookings
exports.getAllBookings = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const query = {};
        if (status) query.status = status;

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

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('tour', 'title location price')
         .populate('user', 'displayName email');

        if (!booking) return ResponseHandler.fail(res, 404, 'Booking not found');

        return ResponseHandler.success(res, { booking }, 'Booking status updated successfully');
    } catch (err) {
        logger.error('Error updating booking status', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update booking status');
    }
};
