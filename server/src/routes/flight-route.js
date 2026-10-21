const express = require('express');
const { requireFeature } = require('../middlewares/require-feature');
const { searchLimiter } = require('../middlewares/rate-limit');
const { airports, search, getOffer } = require('../controllers/FlightController');

const router = express.Router();

// Whole router disappears (404) when the admin switches flights off.
router.use(requireFeature('flights'));

router.get('/airports', airports);
router.get('/search', searchLimiter, search);
router.get('/offers/:id', getOffer);

module.exports = router;
