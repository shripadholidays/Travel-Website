const { defineTable } = require('../db/table');

const UserInquiry = defineTable({
    table: 'inquiries',
    fields: {
        fullName: { type: 'text', required: true, label: 'Full name' },
        email: { type: 'text', required: true, match: /.+@.+\..+/, matchMessage: 'Please enter a valid email address', label: 'Email' },
        // Optional: plenty of people prefer email, and dates are often flexible
        phoneNumber: { type: 'text', trim: true },
        preferredTravelDate: { type: 'date', label: 'Preferred travel date' },
        numberOfTravelers: { type: 'int', default: 1, min: 1, minMessage: 'Number of travelers must be at least 1', label: 'Number of travelers' },
        // What the inquiry is about, so general questions do not need trip details
        topic: { type: 'text', enum: ['trip', 'booking', 'question', 'other'], default: 'trip', label: 'Topic' },
        // The tour, destination or search the traveller was looking at
        context: { type: 'text', trim: true, maxlength: 200, label: 'Context' },
        // Where on the site the inquiry was sent from
        source: { type: 'text', enum: ['contact', 'chat', 'no-results', 'tour', 'destination'], default: 'contact', label: 'Source' },
        message: 'text',
        status: { type: 'text', enum: ['new', 'read', 'replied'], default: 'new' },
    },
});

module.exports = UserInquiry;
