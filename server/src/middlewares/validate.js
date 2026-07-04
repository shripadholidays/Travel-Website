const { validationResult } = require('express-validator');
const ResponseHandler = require('../utils/response-handler');

const validate = (validations) => {
    return async (req, res, next) => {
        for (const validation of validations) {
            const result = await validation.run(req);
            if (!result.isEmpty()) break;
        }

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const extractedErrors = errors.array().map(err => ({
            field: err.path,
            message: err.msg
        }));

        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: extractedErrors
        });
    };
};

module.exports = validate;
