const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/WishlistController');

const router = express.Router();

router.get('/', isLoggedIn, authorize('user', 'moderator', 'admin'), getWishlist);
router.post('/:tourId', isLoggedIn, authorize('user', 'moderator', 'admin'), addToWishlist);
router.delete('/:tourId', isLoggedIn, authorize('user', 'moderator', 'admin'), removeFromWishlist);

module.exports = router;
