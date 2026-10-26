const { defineTable } = require('../db/table');

// A trip a traveller put together in the trip builder (see services/trip-builder.js)
const CustomTrip = defineTable({
    table: 'custom_trips',
    fields: {
        // Set when the traveller was signed in, so the trip shows in their dashboard
        user: { type: 'ref', col: 'user_id' },
        fullName: { type: 'text', required: true, trim: true, maxlength: 120, label: 'Full name' },
        email: { type: 'text', required: true, trim: true, lowercase: true, match: /.+@.+\..+/, matchMessage: 'Please enter a valid email address', label: 'Email' },
        phoneNumber: { type: 'text', trim: true, maxlength: 40 },
        title: { type: 'text', trim: true, maxlength: 120, label: 'Trip name' },
        startDate: { type: 'date', label: 'Start date' },
        adults: { type: 'int', default: 2, min: 1, max: 30, label: 'Adults' },
        children: { type: 'int', default: 0, min: 0, max: 30, label: 'Children' },
        hotelClass: { type: 'text', label: 'Hotel class' },
        // [{ placeId, name, nights, days: [[{ title, note? }]] }]: one list of plans per night spent there
        stops: { type: 'json', default: [] },
        // [{ id, label }]
        extras: { type: 'json', default: [] },
        notes: { type: 'text', maxlength: 2000 },
        // The package the traveller started from, if any
        basedOn: { type: 'text', maxlength: 200 },
        // { low, high, currency, nights, days, people }: the builder's range when it was sent
        estimate: { type: 'json', default: null },
        // new → quoted (team sent a price) → booked, or closed
        status: { type: 'text', enum: ['new', 'quoted', 'booked', 'closed'], default: 'new' },
        quote: { type: 'number', min: 0, label: 'Final price' },
        // Shown to the traveller with the quote
        quoteNote: { type: 'text', maxlength: 2000 },
        // Only the team sees this
        staffNote: { type: 'text', maxlength: 2000 },
    },
});

module.exports = CustomTrip;
