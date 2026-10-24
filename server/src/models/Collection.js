const { defineTable } = require('../db/table');

const Collection = defineTable({
    table: 'collections',
    fields: {
        name: { type: 'text', required: true },
        slug: { type: 'text', required: true, unique: true },
        description: { type: 'text', required: true },
        coverImage: { type: 'text', required: true },
        tours: { type: 'refs', default: [] },     // tour ids, in display order
        isActive: { type: 'bool', default: true },
        displayOrder: { type: 'int', default: 0 },
    },
});

module.exports = Collection;
