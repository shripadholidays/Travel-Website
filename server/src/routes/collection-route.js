const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const can = require('../middlewares/can');
const activity = require('../middlewares/activity');
const { PERMISSIONS } = require('../config/permissions');
const {
    getCollections, getCollectionBySlug,
    createCollection, updateCollection, deleteCollection
} = require('../controllers/CollectionController');

const router = express.Router();

router.get('/', getCollections);
router.get('/:slug', getCollectionBySlug);

router.post('/', isLoggedIn, can(PERMISSIONS.CATALOG), activity('collection'), createCollection);
router.put('/:id', isLoggedIn, can(PERMISSIONS.CATALOG), activity('collection'), updateCollection);
router.delete('/:id', isLoggedIn, can(PERMISSIONS.CATALOG), activity('collection'), deleteCollection);

module.exports = router;
