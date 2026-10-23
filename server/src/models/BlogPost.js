const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true,
        maxlength: 500
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    tags: [String],
    // draft → pending (submitted by a writer) → published, or rejected with a note
    status: {
        type: String,
        enum: ['draft', 'pending', 'published', 'rejected'],
        default: 'draft',
        index: true
    },
    // The editor's note when an article is sent back for changes
    reviewNote: {
        type: String,
        maxlength: 1000,
        default: ''
    },
    publishedAt: {
        type: Date
    }
}, { timestamps: true });

blogPostSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

module.exports = mongoose.model('BlogPost', blogPostSchema);
