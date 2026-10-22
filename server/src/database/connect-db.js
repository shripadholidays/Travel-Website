const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config');

async function connectDB(dbUri) {
    const { maxRetries, retryDelayMs, connectTimeoutMs, socketTimeoutMs, maxPoolSize, minPoolSize } = config.db;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            await mongoose.connect(dbUri, {
                connectTimeoutMS: connectTimeoutMs,
                socketTimeoutMS:  socketTimeoutMs,
                maxPoolSize,
                minPoolSize,
            });
            logger.info('MongoDB connection successful. Database is ready.');
            break;
        } catch (err) {
            attempt++;
            logger.error(`MongoDB connection failed (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelayMs}ms...`);
            if (attempt === maxRetries) throw err;
            await new Promise(res => setTimeout(res, retryDelayMs));
        }
    }
}

module.exports = connectDB;
