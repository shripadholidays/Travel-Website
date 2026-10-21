const express = require('express');
const { requireFeature } = require('../middlewares/require-feature');
const { searchLimiter } = require('../middlewares/rate-limit');
const { places, search, getHotel, getOffer } = require('../controllers/HotelController');

const router = express.Router();

// Whole router disappears (404) when the admin switches hotels off.
router.use(requireFeature('hotels'));

router.get('/places', places);
router.get('/search', searchLimiter, search);
router.get('/offers/:id', getOffer);
router.get('/:id', getHotel);

module.exports = router;
