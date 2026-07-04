const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const {
    getCollections, getCollectionBySlug,
    createCollection, updateCollection, deleteCollection
} = require('../controllers/CollectionController');

const router = express.Router();

router.get('/', getCollections);
router.get('/:slug', getCollectionBySlug);

router.post('/', isLoggedIn, authorize('admin'), createCollection);
router.put('/:id', isLoggedIn, authorize('admin'), updateCollection);
router.delete('/:id', isLoggedIn, authorize('admin'), deleteCollection);

module.exports = router;
