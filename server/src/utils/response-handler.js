class ResponseHandler {
    /**
     * Sends a successful API response.
     * @param {object} res - The Express response object.
     * @param {any} data - The data to send in the response.
     * @param {string} [message='Success'] - An optional success message.
     */
    static success(res, data, message = 'Success') {
        return res.status(200).json({
            status: 'success',
            message,
            data,
        });
    }

    /**
     * Sends a client-side failure response (e.g., validation error, not found).
     * @param {object} res - The Express response object.
     * @param {number} statusCode - The HTTP status code (e.g., 400, 404).
     * @param {string} message - The error message.
     */
    static fail(res, statusCode, message) {
        return res.status(statusCode).json({
            status: 'fail',
            message,
        });
    }

    /**
     * Sends a server-side error response.
     * @param {object} res - The Express response object.
     * @param {number} statusCode - The HTTP status code (e.g., 500).
     * @param {string} message - The error message.
     */
    static error(res, statusCode, message) {
        return res.status(statusCode).json({
            status: 'error',
            message,
        });
    }


    /**
    * Sends a token response without wrapping it inside extra fields.
    * @param {object} res - The Express response object.
    * @param {object} tokenData - The token data to send (access_token, expires_in, etc.).
    * @param {number} [statusCode=200] - The HTTP status code (default: 200).
    */
    static token(res, tokenData, statusCode = 200) {
        return res.status(statusCode).json(tokenData);
    }
}

module.exports = ResponseHandler;
