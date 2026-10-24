const { defineTable } = require('../db/table');

const NewsletterSubscriber = defineTable({
    table: 'newsletter_subscribers',
    fields: {
        email: { type: 'text', required: true, unique: true, trim: true, lowercase: true, label: 'Email' },
    },
});

module.exports = NewsletterSubscriber;
