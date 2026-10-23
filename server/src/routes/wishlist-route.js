const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const { getWishlist, addToWishlist, removeFromWishlist } = require('../controllers/WishlistController');

const router = express.Router();

router.get('/', isLoggedIn, getWishlist);
router.post('/:tourId', isLoggedIn, addToWishlist);
router.delete('/:tourId', isLoggedIn, removeFromWishlist);

module.exports = router;
