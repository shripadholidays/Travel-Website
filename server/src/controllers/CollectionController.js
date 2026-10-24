const { populate } = require('../db/sql');
const { isDuplicate, validationText } = require('../db/errors');
const Collection = require('../models/Collection');
const TravelDestination = require('../models/TravelDestination');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

const live = (tour) => tour.status === 'active';

function saveError(res, err, action) {
    if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
    if (isDuplicate(err)) return ResponseHandler.fail(res, 409, 'Another collection already uses this name or web address. Pick a different name.');
    logger.error(`Error ${action} collection`, { error: err.message });
    return ResponseHandler.error(res, 500, `Failed to ${action} collection`);
}

function cleanBody(body = {}) {
    const data = { ...body };
    for (const k of ['_id', 'createdAt', 'updatedAt']) delete data[k];
    return data;
}

// GET /collections (public — active only)
exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ where: 'is_active = 1', order: 'display_order ASC' });
        await populate(collections, 'tours', TravelDestination, 'title imageURL location price currency reviews.rating', { match: live });
        return ResponseHandler.success(res, { collections }, 'Collections fetched successfully');
    } catch (err) {
        logger.error('Error fetching collections', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch collections');
    }
};

// GET /admin/collections (all, including inactive)
exports.getAllCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ order: 'display_order ASC' });
        await populate(collections, 'tours', TravelDestination, 'title imageURL location price currency status');
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
        const collection = await Collection.findOne('slug = ? AND is_active = 1', [req.params.slug]);
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        await populate(collection, 'tours', TravelDestination, null, { match: live });
        return ResponseHandler.success(res, { collection }, 'Collection fetched successfully');
    } catch (err) {
        logger.error('Error fetching collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch collection');
    }
};

// POST /collections (admin)
exports.createCollection = async (req, res) => {
    try {
        const collection = await Collection.insert(cleanBody(req.body));
        return ResponseHandler.success(res, { collection }, 'Collection created successfully');
    } catch (err) {
        return saveError(res, err, 'create');
    }
};

// PUT /collections/:id (admin)
exports.updateCollection = async (req, res) => {
    try {
        const collection = await Collection.update(req.params.id, cleanBody(req.body));
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, { collection }, 'Collection updated successfully');
    } catch (err) {
        return saveError(res, err, 'update');
    }
};

// DELETE /collections/:id (admin)
exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.remove(req.params.id);
        if (!collection) return ResponseHandler.fail(res, 404, 'Collection not found');
        return ResponseHandler.success(res, { collection: { _id: collection._id, name: collection.name } }, 'Collection deleted successfully');
    } catch (err) {
        logger.error('Error deleting collection', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete collection');
    }
};
