const { defineTable } = require('../db/table');

const Payment = defineTable({
    table: 'payments',
    fields: {
        // Exactly one of booking (tour) or order (flight/hotel) is set.
        booking: { type: 'ref', col: 'booking_id' },
        order: { type: 'ref', col: 'order_id' },
        user: { type: 'ref', required: true, col: 'user_id' },
        amount: { type: 'number', required: true },
        currency: { type: 'text', default: 'USD' },
        method: { type: 'text', enum: ['razorpay', 'stripe'], default: 'razorpay' },
        // Razorpay order (created before checkout) and payment (once the traveller has paid)
        gatewayOrderId: 'text',
        gatewayPaymentId: 'text',
        status: { type: 'text', enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
        gatewayResponse: 'json',
    },
    validate(doc) {
        return Boolean(doc.booking) === Boolean(doc.order)
            ? { booking: 'A payment must reference exactly one of booking or order' }
            : {};
    },
});

module.exports = Payment;
