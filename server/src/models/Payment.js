const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Exactly one of booking (tour) or order (flight/hotel) is set.
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TravelOrder'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    method: {
        type: String,
        enum: ['stripe', 'razorpay'],
        default: 'stripe'
    },
    stripePaymentIntentId: {
        type: String,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

paymentSchema.pre('validate', function requireOneTarget(next) {
    if (Boolean(this.booking) === Boolean(this.order)) {
        return next(new Error('A payment must reference exactly one of booking or order'));
    }
    return next();
});

module.exports = mongoose.model('Payment', paymentSchema);
