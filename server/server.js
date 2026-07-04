const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./src/database/connect-db');
const ResponseHandler = require('./src/utils/response-handler');
const logger = require('./src/utils/logger');
const { initializePassport } = require('./src/services/auth-service');
const mockAuth = require('./src/middlewares/mock-auth');
const { apiLimiter, authLimiter } = require('./src/middlewares/rate-limit');

// Routes
const authRoutes = require('./src/routes/auth-route');
const tourRoutes = require('./src/routes/tour-route');
const userRoutes = require('./src/routes/user-route');
const inquiryRoutes = require('./src/routes/inquiry-route');
const subscribeRoutes = require('./src/routes/subscribe-route');
const bookingRoutes = require('./src/routes/booking-route');
const paymentRoutes = require('./src/routes/payment-route');
const destinationRoutes = require('./src/routes/destination-route');
const collectionRoutes = require('./src/routes/collection-route');
const blogRoutes = require('./src/routes/blog-route');
const wishlistRoutes = require('./src/routes/wishlist-route');
const adminRoutes = require('./src/routes/admin-route');
const settingsRoutes = require('./src/routes/settings-route');
const uploadRoutes = require('./src/routes/upload-route');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 7654;
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/wandeazy';
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
}

// Middleware to attach process PID to each request (for logs)
app.use((req, res, next) => {
    req.workerId = process.pid;
    next();
});

const allowedOrigins = [
    process.env.LOCAL_FRONTEND_ORIGIN,
    process.env.PRODUCTION_FRONTEND_ORIGIN,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Ensure logs folder exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Logging setup
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, `server-${process.pid}.log`),
    { flags: 'a' }
);
morgan.token('worker', (req) => req.workerId);

app.use(morgan(
    ':method :url :status :res[content-length] - :response-time ms [pid :worker]',
    process.env.NODE_ENV === 'development' ? undefined : { stream: accessLogStream }
));

// Stripe webhook needs raw body - must come BEFORE json parser
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Serve uploaded files (local storage — swap for S3/R2 CDN URL in production)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(helmet());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// Sessions & Passport (skip if MOCK_AUTH=true)
if (process.env.MOCK_AUTH !== 'true') {
    app.use(session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }));

    app.use(passport.initialize());
    app.use(passport.session());
    initializePassport(passport);
} else {
    app.use(mockAuth);
}

// --- ROUTES ---
app.get('/', (req, res) => {
    ResponseHandler.success(res, null, 'Wandeazy backend is up and running!');
});

app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(dbState === 'connected' ? 200 : 503).json({
        status: dbState === 'connected' ? 'ok' : 'degraded',
        pid: process.pid,
        database: dbState,
        timestamp: new Date().toISOString()
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/subscribe', subscribeRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    ResponseHandler.fail(res, 404, "Sorry, can't find that route!");
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, url: req.originalUrl });
    ResponseHandler.error(res, 500, 'Something went wrong!');
});

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
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
