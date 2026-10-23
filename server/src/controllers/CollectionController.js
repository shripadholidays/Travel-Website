const Collection = require('../models/Collection');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

function saveError(res, err, action) {
    if (err.name === 'ValidationError') {
        return ResponseHandler.fail(res, 400, Object.values(err.errors).map((e) => e.message.replace('Path ', '').replace(/`/g, '')).join(', '));
    }
    if (err.code === 11000) return ResponseHandler.fail(res, 409, 'Another collection already uses this name or web address. Pick a different name.');
    logger.error(`Error ${action} collection`, { error: err.message });
    return ResponseHandler.error(res, 500, `Failed to ${action} collection`);
}

// GET /collections (public — active only)
exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ isActive: true })
            .populate({ path: 'tours', select: 'title imageURL location price reviews.rating', match: { status: 'active' } })
            .sort({ displayOrder: 1 });
        return ResponseHandler.success(res, { collections }, 'Collections fetched successfully');
    } catch (err) {
        logger.error('Error fetching collections', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch collections');
    }
};

// GET /admin/collections (all, including inactive)
exports.getAllCollections = async (req, res) => {
    try {
        const collections = await Collection.find()
            .populate('tours', 'title imageURL location price status')
            .sort({ displayOrder: 1 });
        return ResponseHandler.success(res, { collections }, 'Collections fetched successfully');
    } catch (err) {
        logger.error('Error fetching collections', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch collections');
    }
};

// GET /collections/:slug
exports.getCollectionBySlug = async (req, res) => {
    try {
        // Hidden collections and non-live tours are not shown to travellers
        const collection = await Collection.findOne({ slug: req.params.slug, isActive: true })
            .populate({ path: 'tours', match: { status: 'active' } });
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, { collection }, 'Collection fetched successfully');
    } catch (err) {
        logger.error('Error fetching collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch collection');
    }
};

// POST /collections (admin)
exports.createCollection = async (req, res) => {
    try {
        const collection = await Collection.create(req.body);
        return ResponseHandler.success(res, { collection }, 'Collection created successfully');
    } catch (err) {
        return saveError(res, err, 'create');
    }
};

// PUT /collections/:id (admin)
exports.updateCollection = async (req, res) => {
    try {
        const collection = await Collection.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        );
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, { collection }, 'Collection updated successfully');
    } catch (err) {
        return saveError(res, err, 'update');
    }
};

// DELETE /collections/:id (admin)
exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findByIdAndDelete(req.params.id);
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, { collection: { _id: collection._id, name: collection.name } }, 'Collection deleted successfully');
    } catch (err) {
        logger.error('Error deleting collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete collection');
    }
};
