const BlogPost = require('../models/BlogPost');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');

// GET /blog
exports.getPosts = async (req, res) => {
    try {
        const { page = 1, limit = config.pagination.defaultLimit, tag, search, status } = req.query;
        const query = {};

        // Public users only see published posts
        if (!req.user || req.user.role === 'user') {
            query.status = 'published';
        } else if (status) {
            query.status = status;
        }

        if (tag) query.tags = tag;
        if (search) query.$text = { $search: search };

        const posts = await BlogPost.find(query)
            .populate('author', 'displayName profilePicture')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await BlogPost.countDocuments(query);

        return ResponseHandler.success(res, {
            posts,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Posts fetched successfully');
    } catch (err) {
        logger.error('Error fetching blog posts', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch posts');
    }
};

// GET /blog/:slug
exports.getPostBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug })
            .populate('author', 'displayName profilePicture');
        if (!post) return ResponseHandler.fail(res, 404, 'Article not found');
        return ResponseHandler.success(res, { post }, 'Article fetched successfully');
    } catch (err) {
        logger.error('Error fetching blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch article');
    }
};

// POST /blog
exports.createPost = async (req, res) => {
    try {
        const { title, content, excerpt, coverImage, tags, status } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const post = await BlogPost.create({
            title, slug, content, excerpt, coverImage,
            tags: tags || [],
            author: req.user._id,
            status: status || 'draft',
            publishedAt: status === 'published' ? new Date() : null
        });

        const populatedPost = await BlogPost.findById(post._id)
            .populate('author', 'displayName profilePicture');

        return ResponseHandler.success(res, { post: populatedPost }, 'Article created successfully');
    } catch (err) {
        if (err.code === 11000) return ResponseHandler.fail(res, 400, 'An article with this title already exists');
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return ResponseHandler.fail(res, 400, messages.join(', '));
        }
        logger.error('Error creating blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create article');
    }
};

// PUT /blog/:id
exports.updatePost = async (req, res) => {
    try {
        // Whitelist editable fields — never let author/timestamps be reassigned.
        const { title, content, excerpt, coverImage, tags, status } = req.body;
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (excerpt !== undefined) updates.excerpt = excerpt;
        if (coverImage !== undefined) updates.coverImage = coverImage;
        if (tags !== undefined) updates.tags = tags;
        if (status !== undefined) updates.status = status;
        if (status === 'published') updates.publishedAt = new Date();

        const post = await BlogPost.findByIdAndUpdate(
            req.params.id, updates, { new: true, runValidators: true }
        ).populate('author', 'displayName profilePicture');

        if (!post) return ResponseHandler.fail(res, 404, 'Article not found');
        return ResponseHandler.success(res, { post }, 'Article updated successfully');
    } catch (err) {
        logger.error('Error updating blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update article');
    }
};

// DELETE /blog/:id
exports.deletePost = async (req, res) => {
    try {
        const post = await BlogPost.findByIdAndDelete(req.params.id);
        if (!post) return ResponseHandler.fail(res, 404, 'Article not found');
        return ResponseHandler.success(res, null, 'Article deleted successfully');
    } catch (err) {
        logger.error('Error deleting blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete article');
    }
};
