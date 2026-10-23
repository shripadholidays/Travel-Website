const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const optionalAuth = require('../middlewares/optional-auth');
const can = require('../middlewares/can');
const activity = require('../middlewares/activity');
const { PERMISSIONS } = require('../config/permissions');
const {
    getDestinations, getDestinationBySlug,
    createDestination, updateDestination, deleteDestination
} = require('../controllers/DestinationController');

const router = express.Router();

router.get('/', optionalAuth, getDestinations);
router.get('/:slug', optionalAuth, getDestinationBySlug);

router.post('/', isLoggedIn, can(PERMISSIONS.CATALOG), activity('destination'), createDestination);
router.put('/:id', isLoggedIn, can(PERMISSIONS.CATALOG), activity('destination'), updateDestination);
router.delete('/:id', isLoggedIn, can(PERMISSIONS.CATALOG), activity('destination'), deleteDestination);

module.exports = router;
