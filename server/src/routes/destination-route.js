const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const {
    getDestinations, getDestinationBySlug,
    createDestination, updateDestination, deleteDestination
} = require('../controllers/DestinationController');

const router = express.Router();

router.get('/', getDestinations);
router.get('/:slug', getDestinationBySlug);

router.post('/', isLoggedIn, authorize('admin'), createDestination);
router.put('/:id', isLoggedIn, authorize('admin'), updateDestination);
router.delete('/:id', isLoggedIn, authorize('admin'), deleteDestination);

module.exports = router;
