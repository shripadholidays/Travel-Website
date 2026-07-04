const Collection = require('../models/Collection');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// GET /collections (public — active only)
exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ isActive: true })
            .populate('tours', 'title imageURL location price reviews.rating')
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
            .populate('tours', 'title imageURL location price')
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
        const collection = await Collection.findOne({ slug: req.params.slug })
            .populate('tours');
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
        if (err.code === 11000) return ResponseHandler.fail(res, 400, 'Collection with this slug already exists');
        logger.error('Error creating collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create collection');
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
        logger.error('Error updating collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update collection');
    }
};

// DELETE /collections/:id (admin)
exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findByIdAndDelete(req.params.id);
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, null, 'Collection deleted successfully');
    } catch (err) {
        logger.error('Error deleting collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete collection');
    }
};
