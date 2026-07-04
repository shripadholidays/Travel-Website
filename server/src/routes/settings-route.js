const express = require('express');
const { getPublicSettings } = require('../controllers/SettingsController');

const router = express.Router();

// Public, read-only site settings (company info, social links, footer config)
router.get('/', getPublicSettings);

module.exports = router;
