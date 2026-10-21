require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./src/config');
const connectDB = require('./src/database/connect-db');
const logger = require('./src/utils/logger');
const app = require('./src/app');

const { port: PORT } = config.app;
const { uri: DB_URI } = config.db;

// --- Start server after DB connection ---
let server;
(async () => {
    try {
        await connectDB(DB_URI);
        server = app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to connect to DB', { error: err.message });
        process.exit(1);
    }
})();

const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false).then(() => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, config.app.gracefulShutdownMs);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
