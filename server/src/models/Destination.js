const { defineTable } = require('../db/table');

const Destination = defineTable({
    table: 'destinations',
    fields: {
        name: { type: 'text', required: true },
        slug: { type: 'text', required: true, unique: true },
        country: { type: 'text', required: true },
        continent: { type: 'text', required: true, enum: ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'] },
        description: { type: 'text', required: true },
        coverImage: { type: 'text', required: true },
        images: { type: 'json', default: [] },
        // "Why visit" cards written for this destination; empty = built from its tours
        highlights: { type: 'json', default: [] },        // [{ title, text }]
        bestTimeToVisit: { type: 'text', trim: true, maxlength: 120, default: '' },
        'coordinates.lat': 'number',
        'coordinates.lng': 'number',
        tourCount: { type: 'int', default: 0 },
        rating: { type: 'number', default: 0 },
        isActive: { type: 'bool', default: true },
    },
    validate(doc) {
        const bad = (doc.highlights || []).find((h) => String(h?.title || '').length > 80 || String(h?.text || '').length > 300);
        return bad ? { highlights: 'Highlight titles are at most 80 characters and texts at most 300' } : {};
    },
});

module.exports = Destination;
