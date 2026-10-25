'use strict';
const crypto = require('crypto');

/** A payment the traveller reports that doesn't check out (shown to them as a 400). */
class PaymentError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PaymentError';
        this.status = 400;
    }
}

// Missing keys, or the sample values from .env.example, mean "not set up"
const placeholder = (v) => !v || /placeholder|your_|xxx/i.test(v);

// Gateways take the smallest unit (paise, cents, fils); every supported currency has two decimals
const toMinor = (amount) => Math.round(Number(amount) * 100);

function safeEqual(a, b) {
    const x = Buffer.from(String(a || ''));
    const y = Buffer.from(String(b || ''));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { PaymentError, placeholder, toMinor, safeEqual };
