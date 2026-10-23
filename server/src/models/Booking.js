const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Travel_Destination',
        required: true,
        index: true
    },
    travelDate: {
        type: Date,
        required: true
    },
    numberOfTravelers: {
        type: Number,
        required: true,
        min: [1, 'At least 1 traveler is required']
    },
    contactInfo: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    addons: [{
        name: { type: String },
        price: { type: Number }
    }],
    // Before any coupon; totalAmount is what the traveller pays
    subtotalAmount: {
        type: Number
    },
    coupon: {
        code: { type: String },
        discount: { type: Number }
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending',
        index: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    specialRequests: {
        type: String
    },
    cancelledAt: {
        type: Date
    },
    // What went back to the traveller's card when the booking was cancelled
    refundedAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
