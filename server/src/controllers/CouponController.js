const Coupon = require('../models/Coupon');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

// POST /api/v1/coupons/validate — public (called during checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body || {};
        if (!code) return ResponseHandler.fail(res, 400, 'Coupon code is required.');

        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');

        const { valid, reason } = coupon.isValid(Number(orderAmount) || 0);
        if (!valid) return ResponseHandler.fail(res, 400, reason);

        const discount = coupon.applyDiscount(Number(orderAmount) || 0);
        return ResponseHandler.success(res, {
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discount,
            },
        }, 'Coupon applied!');
    } catch (err) {
        logger.error('Validate coupon failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to validate coupon.');
    }
};

// GET /api/v1/admin/coupons
exports.listCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        return ResponseHandler.success(res, { coupons });
    } catch (err) {
        logger.error('List coupons failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch coupons.');
    }
};

// POST /api/v1/admin/coupons
exports.createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive, description } = req.body || {};
        if (!code || !discountType || discountValue == null) {
            return ResponseHandler.fail(res, 400, 'code, discountType, and discountValue are required.');
        }
        const coupon = await Coupon.create({ code, discountType, discountValue, minOrderAmount, maxUses, expiresAt: expiresAt || null, isActive: isActive !== false, description });
        return res.status(201).json({ status: 'success', message: 'Coupon created.', data: { coupon } });
    } catch (err) {
        if (err.code === 11000) return ResponseHandler.fail(res, 409, 'A coupon with that code already exists.');
        logger.error('Create coupon failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to create coupon.');
    }
};

// PUT /api/v1/admin/coupons/:id
exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');
        return ResponseHandler.success(res, { coupon }, 'Coupon updated.');
    } catch (err) {
        logger.error('Update coupon failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to update coupon.');
    }
};

// DELETE /api/v1/admin/coupons/:id
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');
        return ResponseHandler.success(res, null, 'Coupon deleted.');
    } catch (err) {
        logger.error('Delete coupon failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete coupon.');
    }
};
