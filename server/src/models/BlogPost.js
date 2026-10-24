const { defineTable } = require('../db/table');

const BlogPost = defineTable({
    table: 'blog_posts',
    fields: {
        title: { type: 'text', required: true, label: 'Title' },
        slug: { type: 'text', required: true, unique: true },
        content: { type: 'text', required: true, label: 'Content' },
        excerpt: { type: 'text', required: true, maxlength: 500, label: 'Excerpt' },
        author: { type: 'ref', required: true, col: 'author_id' },
        coverImage: { type: 'text', required: true, label: 'Cover image' },
        tags: { type: 'json', default: [] },
        // draft → pending (submitted by a writer) → published, or rejected with a note
        status: { type: 'text', enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft' },
        // The editor's note when an article is sent back for changes
        reviewNote: { type: 'text', maxlength: 1000, default: '', label: 'Review note' },
        publishedAt: 'date',
    },
});

module.exports = BlogPost;
