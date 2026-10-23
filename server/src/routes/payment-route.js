const express = require('express');
const isLoggedIn = require('../middlewares/auth-guard');
const { handleWebhook, confirmPayment } = require('../controllers/PaymentController');

const router = express.Router();

router.post('/webhook', handleWebhook);
router.post('/confirm', isLoggedIn, confirmPayment);

module.exports = router;
