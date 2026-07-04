const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const authorize = require('../middlewares/authorize');
const { handleWebhook, confirmPayment } = require('../controllers/PaymentController');

const router = express.Router();

router.post('/webhook', handleWebhook);
router.post('/confirm', isLoggedIn, authorize('user', 'moderator', 'admin'), confirmPayment);

module.exports = router;
