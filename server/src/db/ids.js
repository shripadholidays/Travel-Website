'use strict';
const crypto = require('crypto');

/**
 * 24-character hex ids: 4 bytes of seconds + 8 random bytes. The same shape as the
 * MongoDB ids the site used before, so links, references and imported data keep working,
 * and ids sort roughly by creation time.
 */
function newId() {
    const seconds = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    return seconds + crypto.randomBytes(8).toString('hex');
}

const isId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

/** The id of a reference whether it is an id or a loaded record. */
const idOf = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object') return value._id ? String(value._id) : null;
    return String(value);
};

module.exports = { newId, isId, idOf };
