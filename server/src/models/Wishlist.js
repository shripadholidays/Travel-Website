const { defineTable } = require('../db/table');

const Wishlist = defineTable({
    table: 'wishlists',
    fields: {
        user: { type: 'ref', required: true, unique: true, col: 'user_id' },
        tours: { type: 'refs', default: [] },
    },
});

module.exports = Wishlist;
