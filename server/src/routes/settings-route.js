const express = require('express');
const { getPublicSettings, getHighlights } = require('../controllers/SettingsController');

const router = express.Router();

// Public, read-only site settings (company info, social links, footer config)
router.get('/', getPublicSettings);
// Live stats and real traveller reviews
router.get('/highlights', getHighlights);

module.exports = router;
