const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    discountType: {
        type: String,
        enum: ['percent', 'flat'],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    // Flat discounts and the minimum order are in this currency (converted for other checkouts)
    currency: {
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
        default: 'USD',
    },
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    maxUses: {
        type: Number,
        default: null, // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        default: null, // null = no expiry
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    description: String,
}, { timestamps: true });

// orderAmount is in the coupon's own currency
couponSchema.methods.isValid = function (orderAmount = 0) {
    if (!this.isActive) return { valid: false, reason: 'Coupon is inactive.' };
    if (this.expiresAt && this.expiresAt < new Date()) return { valid: false, reason: 'Coupon has expired.' };
    if (this.maxUses !== null && this.usedCount >= this.maxUses) return { valid: false, reason: 'Coupon usage limit reached.' };
    if (orderAmount < this.minOrderAmount) {
        const { formatMoney } = require('../services/currency');
        return { valid: false, reason: `This code needs an order of at least ${formatMoney(this.minOrderAmount, this.currency || 'USD')}.` };
    }
    return { valid: true };
};

couponSchema.methods.applyDiscount = function (orderAmount) {
    if (this.discountType === 'percent') {
        return Math.round(orderAmount * (this.discountValue / 100) * 100) / 100;
    }
    return Math.min(this.discountValue, orderAmount);
};

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
