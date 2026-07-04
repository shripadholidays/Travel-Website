const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Establishes a connection to the MongoDB database with retries.
 * @param {string} dbUri - MongoDB URI
 */
async function connectDB(dbUri) {
    const MAX_RETRIES = 5;  // number of attempts
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            await mongoose.connect(dbUri, {
                connectTimeoutMS: 30000,
                socketTimeoutMS: 45000,
                maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
                minPoolSize: process.env.NODE_ENV === 'production' ? 10 : 2,
            });
            logger.info("MongoDB connection successful. Database is ready.");
            break;
        } catch (err) {
            attempt++;
            logger.error(`MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in 5s...`);
            if (attempt === MAX_RETRIES) throw err;
            await new Promise(res => setTimeout(res, 5000)); // wait 5s before retry
        }
    }
}

module.exports = connectDB;
