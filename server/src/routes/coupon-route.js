const express = require('express');
const { validateCoupon } = require('../controllers/CouponController');
const router = express.Router();

// POST /api/v1/coupons/validate — authenticated users call this during checkout
router.post('/validate', validateCoupon);

module.exports = router;
