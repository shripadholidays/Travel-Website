require('dotenv').config();
const config = require('./src/config');
const db = require('./src/db');
const { migrate } = require('./src/db/migrate');
const logger = require('./src/utils/logger');
const app = require('./src/app');

const { port: PORT } = config.app;

// --- Start server once the database is reachable and up to date ---
let server;
(async () => {
    try {
        db.connect();
        await db.ping();
        await migrate();
        logger.info(`Database ready (${config.db.url.startsWith('file:') ? config.db.url : 'Turso'})`);
        server = app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to connect to the database', { error: err.message });
        process.exit(1);
    }
})();

const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    const finish = () => db.close().finally(() => {
        logger.info('Database connection closed');
        process.exit(0);
    });
    if (server) server.close(() => {
        logger.info('HTTP server closed');
        finish();
    });
    else finish();
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, config.app.gracefulShutdownMs);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
