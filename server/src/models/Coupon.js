const { defineTable } = require('../db/table');

const Coupon = defineTable({
    table: 'coupons',
    fields: {
        code: { type: 'text', required: true, unique: true, uppercase: true, trim: true, label: 'Code' },
        discountType: { type: 'text', enum: ['percent', 'flat'], required: true, label: 'Discount type' },
        discountValue: { type: 'number', required: true, min: 0, label: 'Discount' },
        // Flat discounts and the minimum order are in this currency (converted for other checkouts)
        currency: { type: 'text', enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'], default: 'INR' },
        minOrderAmount: { type: 'number', default: 0 },
        maxUses: { type: 'int', default: null },       // null = unlimited
        usedCount: { type: 'int', default: 0 },
        expiresAt: { type: 'date', default: null },    // null = no expiry
        isActive: { type: 'bool', default: true },
        description: 'text',
    },
});

Coupon.findByCode = (code) => Coupon.findOne('code = ?', [String(code || '').toUpperCase().trim()]);

/** Whether a coupon can be used on an order (orderAmount is in the coupon's own currency). */
Coupon.isValid = (coupon, orderAmount = 0) => {
    if (!coupon.isActive) return { valid: false, reason: 'Coupon is inactive.' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, reason: 'Coupon has expired.' };
    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: 'Coupon usage limit reached.' };
    if (orderAmount < (coupon.minOrderAmount || 0)) {
        const { formatMoney } = require('../services/currency');
        return { valid: false, reason: `This code needs an order of at least ${formatMoney(coupon.minOrderAmount, coupon.currency || 'USD')}.` };
    }
    return { valid: true };
};

/** One more use (on confirmation), or one fewer (on cancellation, never below 0). */
Coupon.changeUses = async (code, delta) => {
    const { run } = require('../db');
    const guard = delta < 0 ? ' AND used_count > 0' : '';
    await run(`UPDATE coupons SET used_count = used_count + ?, updated_at = ? WHERE code = ?${guard}`, [delta, new Date().toISOString(), code]);
};

module.exports = Coupon;
