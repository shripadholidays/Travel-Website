const { defineTable } = require('../db/table');

// One review per traveller per tour (unique index in the migration)
const Review = defineTable({
    table: 'reviews',
    fields: {
        tour: { type: 'ref', required: true, col: 'tour_id' },
        user: { type: 'ref', required: true, col: 'user_id' },
        rating: { type: 'int', required: true, min: 1, max: 5, label: 'Rating' },
        title: { type: 'text', maxlength: 200, label: 'Title' },
        content: { type: 'text', required: true, maxlength: 2000, label: 'Review' },
        isVerifiedBooking: { type: 'bool', default: false },
    },
});

module.exports = Review;
