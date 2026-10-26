const { defineTable } = require('../db/table');

const Booking = defineTable({
    table: 'bookings',
    fields: {
        user: { type: 'ref', required: true, col: 'user_id' },
        tour: { type: 'ref', required: true, col: 'tour_id' },
        travelDate: { type: 'date', required: true, label: 'Travel date' },
        numberOfTravelers: { type: 'int', required: true, min: 1, minMessage: 'At least 1 traveler is required', label: 'Number of travelers' },
        'contactInfo.firstName': { type: 'text', required: true, label: 'First name' },
        'contactInfo.lastName': { type: 'text', required: true, label: 'Last name' },
        'contactInfo.email': { type: 'text', required: true, label: 'Email' },
        'contactInfo.phone': { type: 'text', required: true, label: 'Phone' },
        addons: { type: 'json', default: [] },                 // [{ name, price }]
        // The trip length and hotel class picked, when the tour offers them: { duration, days, nights, hotelClass, hotelLabel, hotel }
        packageChoice: { type: 'json', default: null },
        // Before any coupon; totalAmount is what the traveller pays
        subtotalAmount: 'number',
        coupon: { type: 'json', default: null },               // { code, discount }
        totalAmount: { type: 'number', required: true },
        // What the traveller chose and was charged in; every amount on the booking is in this currency
        currency: { type: 'text', default: 'INR' },
        // How the price was converted: the tour's own price per person, its currency and the rate used
        unitPrice: 'number',
        tourCurrency: 'text',
        exchangeRate: 'number',
        // The total in the site's base currency at the day's rate, for revenue reports
        baseCurrency: 'text',
        baseAmount: 'number',
        status: { type: 'text', enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
        paymentId: { type: 'ref', col: 'payment_id' },
        specialRequests: 'text',
        cancelledAt: 'date',
        // What went back to the traveller's card when the booking was cancelled
        refundedAmount: { type: 'number', default: 0 },
    },
});

module.exports = Booking;
