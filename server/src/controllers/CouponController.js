const { isDuplicate, validationText } = require('../db/errors');
const Coupon = require('../models/Coupon');
const ResponseHandler = require('../utils/response-handler');
const logger = require('../utils/logger');

const FIELDS = ['code', 'discountType', 'discountValue', 'currency', 'minOrderAmount', 'maxUses', 'expiresAt', 'isActive', 'description'];
const { getCurrencyConfig, isSupported } = require('../services/currency');
const { couponDiscount } = require('../services/booking-service');

// Checks what checkout would otherwise get wrong (a 150% discount, a code with spaces)
function cleanCoupon(body = {}, { partial = false } = {}) {
    const data = {};
    for (const key of FIELDS) if (body[key] !== undefined) data[key] = body[key];
    if (data.code !== undefined) data.code = String(data.code).toUpperCase().replace(/\s+/g, '');
    if (!partial && (!data.code || !data.discountType || data.discountValue == null)) return { error: 'Code, discount type and discount value are required.' };
    if (data.code !== undefined && !/^[A-Z0-9_-]{3,30}$/.test(data.code)) return { error: 'Use 3–30 letters, numbers, dashes or underscores for the code.' };
    if (data.discountType !== undefined && !['percent', 'flat'].includes(data.discountType)) return { error: 'Discount type must be percent or flat.' };
    if (data.discountValue !== undefined) {
        data.discountValue = Number(data.discountValue);
        if (!(data.discountValue > 0)) return { error: 'The discount must be more than 0.' };
    }
    if (data.currency !== undefined && !isSupported(data.currency)) return { error: 'Pick a supported currency.' };
    if (data.minOrderAmount !== undefined) data.minOrderAmount = Math.max(0, Number(data.minOrderAmount) || 0);
    if (data.maxUses !== undefined) data.maxUses = data.maxUses === null || data.maxUses === '' ? null : Math.max(1, Math.round(Number(data.maxUses)));
    if (data.expiresAt !== undefined) data.expiresAt = data.expiresAt || null;
    return { data };
}

function saveError(res, err, action) {
    if (isDuplicate(err)) return ResponseHandler.fail(res, 409, 'A coupon with that code already exists.');
    if (err.name === 'ValidationError') return ResponseHandler.fail(res, 400, validationText(err));
    logger.error(`${action} coupon failed`, { error: err.message });
    return ResponseHandler.error(res, 500, `Failed to ${action.toLowerCase()} coupon.`);
}

// POST /api/v1/coupons/validate — public (called during checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body || {};
        if (!code) return ResponseHandler.fail(res, 400, 'Coupon code is required.');

        const coupon = await Coupon.findByCode(code);
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');

        // The order amount is in the checkout currency; the discount comes back in it too
        const { enabled, base, rates } = await getCurrencyConfig();
        const currency = enabled.includes(String(req.body.currency || '').toUpperCase()) ? String(req.body.currency).toUpperCase() : base;
        const result = couponDiscount(coupon, Number(orderAmount) || 0, currency, rates);
        if (!result.valid) return ResponseHandler.fail(res, 400, result.reason);

        return ResponseHandler.success(res, {
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discount: result.discount,
                currency,
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
        const coupons = await Coupon.find({ order: 'created_at DESC' });
        return ResponseHandler.success(res, { coupons });
    } catch (err) {
        logger.error('List coupons failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to fetch coupons.');
    }
};

// POST /api/v1/admin/coupons
exports.createCoupon = async (req, res) => {
    try {
        const { data, error } = cleanCoupon(req.body);
        if (error) return ResponseHandler.fail(res, 400, error);
        if (data.discountType === 'percent' && data.discountValue > 100) return ResponseHandler.fail(res, 400, 'A percentage discount can be at most 100%.');
        const coupon = await Coupon.insert({ currency: (await getCurrencyConfig()).base, ...data, isActive: data.isActive !== false });
        return res.status(201).json({ status: 'success', message: 'Coupon created.', data: { coupon } });
    } catch (err) {
        return saveError(res, err, 'Create');
    }
};

// PUT /api/v1/admin/coupons/:id
exports.updateCoupon = async (req, res) => {
    try {
        const { data, error } = cleanCoupon(req.body, { partial: true });
        if (error) return ResponseHandler.fail(res, 400, error);
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');
        Object.assign(coupon, data);
        if (coupon.discountType === 'percent' && coupon.discountValue > 100) return ResponseHandler.fail(res, 400, 'A percentage discount can be at most 100%.');
        await Coupon.save(coupon);
        return ResponseHandler.success(res, { coupon }, 'Coupon updated.');
    } catch (err) {
        return saveError(res, err, 'Update');
    }
};

// DELETE /api/v1/admin/coupons/:id
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.remove(req.params.id);
        if (!coupon) return ResponseHandler.fail(res, 404, 'Coupon not found.');
        return ResponseHandler.success(res, { coupon: { _id: coupon._id, code: coupon.code } }, 'Coupon deleted.');
    } catch (err) {
        logger.error('Delete coupon failed', { error: err.message });
        return ResponseHandler.error(res, 500, 'Failed to delete coupon.');
    }
};
