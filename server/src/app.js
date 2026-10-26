const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

const config = require('./config');
const ResponseHandler = require('./utils/response-handler');
const { ping } = require('./db');
const logger = require('./utils/logger');
const mockAuth = require('./middlewares/mock-auth');
const { apiLimiter, authLimiter } = require('./middlewares/rate-limit');
const rebuildSite = require('./middlewares/rebuild-site');
const { publicCache, clearOnChange } = require('./middlewares/public-cache');

// Routes
const authRoutes = require('./routes/auth-route');
const tourRoutes = require('./routes/tour-route');
const userRoutes = require('./routes/user-route');
const inquiryRoutes = require('./routes/inquiry-route');
const customTripRoutes = require('./routes/custom-trip-route');
const { getBuilder: getTripBuilder } = require('./controllers/CustomTripController');
const subscribeRoutes = require('./routes/subscribe-route');
const bookingRoutes = require('./routes/booking-route');
const paymentRoutes = require('./routes/payment-route');
const destinationRoutes = require('./routes/destination-route');
const collectionRoutes = require('./routes/collection-route');
const blogRoutes = require('./routes/blog-route');
const wishlistRoutes = require('./routes/wishlist-route');
const adminRoutes = require('./routes/admin-route');
const settingsRoutes = require('./routes/settings-route');
const uploadRoutes = require('./routes/upload-route');
const couponRoutes = require('./routes/coupon-route');
const flightRoutes = require('./routes/flight-route');
const hotelRoutes = require('./routes/hotel-route');
const travelOrderRoutes = require('./routes/travel-order-route');
const cors = require('cors');

const app = express();
const { nodeEnv } = config.app;
// Hosts like Render sit behind one proxy: trust it so req.ip (rate limits) and req.protocol (https upload URLs) are real
if (nodeEnv === 'production') app.set('trust proxy', 1);
// The dev fallbacks would let anyone forge a sign-in: production refuses to start without real secrets
if (nodeEnv === 'production') {
    const missing = ['JWT_SECRET'].filter((k) => !process.env[k] || process.env[k].length < 32);
    if (missing.length) throw new Error(`${missing.join(' and ')} must be set to a random value of 32+ characters in production`);
}

// Middleware to attach process PID to each request (for logs)
app.use((req, res, next) => {
    req.workerId = process.pid;
    next();
});

const allowedOrigins = [config.cors.localOrigin, ...config.cors.productionOrigins].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // Other sites get no CORS headers (the browser blocks them); not a server error
        logger.warn('Blocked request from an origin not in PRODUCTION_FRONTEND_ORIGIN', { origin });
        return callback(null, false);
    },
    credentials: true,
}));

// Ensure logs folder exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Logging setup
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, `server-${process.pid}.log`),
    { flags: 'a' }
);
morgan.token('worker', (req) => req.workerId);

app.use(morgan(
    ':method :url :status :res[content-length] - :response-time ms [pid :worker]',
    nodeEnv === 'development' ? undefined : { stream: accessLogStream }
));

// The Razorpay webhook signature covers the exact raw body, so it is read before the JSON parser
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Uploads saved to local disk (dev, or production without R2). With R2 the image URLs point straight at the bucket.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
}));

app.use(express.urlencoded({ extended: true }));
// A built trip (with its day plans) and the trip builder's price list are bigger than other requests
app.post('/api/v1/custom-trips', express.json({ limit: '64kb' }));
app.put('/api/v1/admin/trip-builder', express.json({ limit: '512kb' }));
app.use(express.json({ limit: config.app.bodyLimit }));
app.use(cookieParser());
app.use(helmet());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/v1/auth', authLimiter);

// Sign-in is a signed cookie (email/password JWT or a Google ID token) checked per request, so no server sessions
if (config.mock.enabled) app.use(mockAuth);

// --- ROUTES ---
app.get('/', (req, res) => {
    ResponseHandler.success(res, null, 'Wandeazy backend is up and running!');
});

app.get('/health', async (req, res) => {
    const dbState = await ping().then(() => 'connected', () => 'disconnected');
    res.status(dbState === 'connected' ? 200 : 503).json({
        status: dbState === 'connected' ? 'ok' : 'degraded',
        pid: process.pid,
        database: dbState,
        timestamp: new Date().toISOString()
    });
});

// The landing page's public data is remembered for a few minutes; any change clears it
app.use('/api/v1', clearOnChange);
app.get([
    '/api/v1/settings', '/api/v1/settings/highlights', '/api/v1/tours/recommended',
    '/api/v1/destinations', '/api/v1/collections', '/api/v1/trip-builder',
], publicCache);

// Changes to anything the prerendered pages show (content, reviews, settings) rebuild the site
app.use([
    '/api/v1/tours', '/api/v1/blog', '/api/v1/destinations', '/api/v1/collections',
    '/api/v1/admin/settings', '/api/v1/admin/reviews', '/api/v1/admin/collections',
], rebuildSite);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.get('/api/v1/trip-builder', getTripBuilder);
app.use('/api/v1/custom-trips', customTripRoutes);
app.use('/api/v1/subscribe', subscribeRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/flights', flightRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/travel-orders', travelOrderRoutes);
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

module.exports = app;
