class ProviderError extends Error {
    constructor(code, status, message) {
        super(message || code);
        this.name = 'ProviderError';
        this.code = code;
        this.status = status;
    }
}

function withTimeout(promise, ms = Number(process.env.PROVIDER_TIMEOUT_MS) || 15000) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new ProviderError('PROVIDER_TIMEOUT', 504, 'The supplier took too long to respond')),
            ms,
        );
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

module.exports = { ProviderError, withTimeout };
