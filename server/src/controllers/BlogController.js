const { Where, containsAny, jsonHas, populate } = require('../db/sql');
const { isDuplicate, validationText } = require('../db/errors');
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');
const config = require('../config');
const { sendAdminAlert, sendArticleReviewEmail } = require('../services/email-service');

const { hasPermission, PERMISSIONS } = require('../config/permissions');

// Article reviewers (moderators, editors, managers, admins) see every status and publish
const isStaff = (user) => hasPermission(user, PERMISSIONS.ARTICLES);
const isAuthor = (post, user) => !!user && String(post.author?._id ?? post.author) === String(user._id);
const frontendOrigin = () => (process.env.NODE_ENV === 'production' ? config.cors.productionOrigin : config.cors.localOrigin);

const slugify = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// Writers can save a draft or submit for review; only staff publish or reject
const WRITER_STATUSES = ['draft', 'pending'];
const STAFF_STATUSES = ['draft', 'pending', 'published', 'rejected'];

// GET /blog
exports.getPosts = async (req, res) => {
    try {
        const { page = 1, limit = config.pagination.defaultLimit, tag, search, status } = req.query;
        const where = new Where();

        // Travellers only ever see published articles; staff can filter by status
        const shown = !isStaff(req.user) ? 'published' : (STAFF_STATUSES.includes(status) ? status : null);
        if (shown) where.add('status = ?', shown);

        if (tag) where.add(jsonHas('tags'), String(tag));
        for (const word of String(search || '').trim().split(/\s+/).filter(Boolean).slice(0, 8)) {
            const m = containsAny(['title', 'content', 'excerpt'], word);
            where.add(m.sql, ...m.args);
        }

        const [posts, total] = await Promise.all([
            BlogPost.find({
                where: where.sql, args: where.args,
                order: shown === 'published' ? 'published_at DESC, created_at DESC' : 'created_at DESC',
                limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
            }),
            BlogPost.count(where.sql, where.args),
        ]);
        await populate(posts, 'author', User, 'displayName profilePicture');

        return ResponseHandler.success(res, {
            posts,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        }, 'Posts fetched successfully');
    } catch (err) {
        logger.error('Error fetching blog posts', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch posts');
    }
};

// GET /blog/mine — the signed-in writer's own articles, every status
exports.getMyPosts = async (req, res) => {
    try {
        const posts = (await BlogPost.find({ where: 'author_id = ?', args: [req.user._id], order: 'updated_at DESC' }))
            .map(({ _id, title, slug, excerpt, coverImage, status, reviewNote, publishedAt, createdAt, updatedAt }) => ({ _id, title, slug, excerpt, coverImage, status, reviewNote, publishedAt, createdAt, updatedAt }));
        return ResponseHandler.success(res, { posts }, 'Your articles fetched successfully');
    } catch (err) {
        logger.error('Error fetching own posts', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch your articles');
    }
};

// GET /blog/:slug
exports.getPostBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne('slug = ?', [req.params.slug]);
        if (post) await populate(post, 'author', User, 'displayName profilePicture');
        // Unpublished articles exist only for their writer and the editors
        if (!post || (post.status !== 'published' && !isAuthor(post, req.user) && !isStaff(req.user))) {
            return ResponseHandler.fail(res, 404, 'Article not found');
        }
        return ResponseHandler.success(res, { post }, 'Article fetched successfully');
    } catch (err) {
        logger.error('Error fetching blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch article');
    }
};

// POST /blog
exports.createPost = async (req, res) => {
    try {
        const { title, content, excerpt, coverImage, tags } = req.body;
        const allowed = isStaff(req.user) ? STAFF_STATUSES : WRITER_STATUSES;
        const status = allowed.includes(req.body.status) ? req.body.status : (isStaff(req.user) ? 'draft' : 'pending');

        const post = await BlogPost.insert({
            title, slug: slugify(title), content, excerpt, coverImage,
            tags: tags || [],
            author: req.user._id,
            status,
            publishedAt: status === 'published' ? new Date() : null
        });

        if (status === 'pending') notifyEditors(post, req.user);

        const populatedPost = await populate(post, 'author', User, 'displayName profilePicture');

        return ResponseHandler.success(res, { post: populatedPost }, status === 'pending' ? 'Article submitted for review' : 'Article saved');
    } catch (err) {
        if (isDuplicate(err)) return ResponseHandler.fail(res, 400, 'An article with this title already exists');
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error creating blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create article');
    }
};

// PUT /blog/:id
exports.updatePost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) return ResponseHandler.fail(res, 404, 'Article not found');

        const staff = isStaff(req.user);
        if (!staff && !isAuthor(post, req.user)) return ResponseHandler.fail(res, 403, 'You can only edit your own articles');

        // Whitelist editable fields — never let author/timestamps be reassigned.
        const { title, content, excerpt, coverImage, tags, status, reviewNote } = req.body;
        if (title !== undefined) post.title = title;
        if (content !== undefined) post.content = content;
        if (excerpt !== undefined) post.excerpt = excerpt;
        if (coverImage !== undefined) post.coverImage = coverImage;
        if (tags !== undefined) post.tags = tags;

        const previous = post.status;
        if (staff) {
            if (status !== undefined) {
                if (!STAFF_STATUSES.includes(status)) return ResponseHandler.fail(res, 400, 'Invalid status');
                post.status = status;
            }
            if (reviewNote !== undefined) post.reviewNote = reviewNote;
        } else {
            // A writer's edit goes back to the editors; a published article is reviewed again
            post.status = status === 'draft' && previous !== 'published' ? 'draft' : 'pending';
            post.reviewNote = '';
        }
        if (post.status === 'published' && previous !== 'published') post.publishedAt = new Date();
        if (post.status === 'published') post.reviewNote = '';

        await BlogPost.save(post);
        await populate(post, 'author', User, 'displayName profilePicture email');

        if (post.status === 'pending' && previous !== 'pending') notifyEditors(post, req.user);
        // Let the writer know how the review went (not when staff edit their own articles)
        if (staff && !isAuthor(post, req.user) && previous !== post.status && ['published', 'rejected'].includes(post.status)) {
            notifyWriter(post);
        }

        return ResponseHandler.success(res, { post }, 'Article updated successfully');
    } catch (err) {
        if (isDuplicate(err)) return ResponseHandler.fail(res, 400, 'An article with this title already exists');
        if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
        logger.error('Error updating blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update article');
    }
};

// DELETE /blog/:id — admins, or writers removing their own unpublished article
exports.deletePost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) return ResponseHandler.fail(res, 404, 'Article not found');
        const ownUnpublished = isAuthor(post, req.user) && post.status !== 'published';
        if (!isStaff(req.user) && !ownUnpublished) {
            return ResponseHandler.fail(res, 403, 'Only an editor can remove a published article');
        }
        await BlogPost.remove(post._id);
        return ResponseHandler.success(res, null, 'Article deleted successfully');
    } catch (err) {
        logger.error('Error deleting blog post', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete article');
    }
};

function notifyEditors(post, writer) {
    sendAdminAlert(`Article submitted for review: ${post.title}`, [
        ['Writer', writer?.displayName || writer?.email],
        ['Review it', `${frontendOrigin()}/admin/blog`],
    ]).catch((err) => logger.error('Review alert failed', { error: err.message }));
}

async function notifyWriter(post) {
    try {
        const email = post.author?.email || (await User.findById(post.author?._id ?? post.author))?.email;
        if (!email) return;
        const approved = post.status === 'published';
        await sendArticleReviewEmail(email, {
            title: post.title,
            approved,
            note: post.reviewNote,
            url: approved ? `${frontendOrigin()}/blog/${post.slug}` : `${frontendOrigin()}/write-article?edit=${post.slug}`,
        });
    } catch (err) {
        logger.error('Writer notification failed', { error: err.message });
    }
}
