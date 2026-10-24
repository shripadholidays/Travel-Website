'use strict';

/** A record failed its rules. `errors` maps each field path to { message, kind }. */
class ValidationError extends Error {
    constructor(errors) {
        super(Object.values(errors).map((e) => e.message).join(', '));
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

/** A unique value (email, slug, coupon code…) is already taken. */
class DuplicateError extends Error {
    constructor(column) {
        super(`Duplicate value for ${column}`);
        this.name = 'DuplicateError';
        this.column = column;
    }
}

const isDuplicate = (err) => err?.name === 'DuplicateError';

/** Turns libSQL's unique-constraint failure into a DuplicateError; anything else is returned as is. */
function translate(err) {
    const msg = String(err?.message || '');
    const m = msg.match(/UNIQUE constraint failed: \w+\.(\w+)/);
    if (m || err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.extendedCode === 'SQLITE_CONSTRAINT_UNIQUE') {
        return new DuplicateError(m ? m[1] : 'value');
    }
    return err;
}

/** The messages of a ValidationError in one line, for API responses. */
const validationText = (err) => Object.values(err.errors || {}).map((e) => e.message).join(', ') || err.message;

module.exports = { ValidationError, DuplicateError, isDuplicate, translate, validationText };
