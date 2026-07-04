const express = require('express');
const { subscribeNewsletter } = require('../controllers/NewsletterController');

const router = express.Router();

router.post('/', subscribeNewsletter);

module.exports = router;
