'use strict';
/**
 * Central configuration — every tuneable value lives here.
 * All values read from process.env with documented defaults.
 * Never scatter process.env reads across the codebase.
 */
const e = process.env;

const isProd = e.NODE_ENV === 'production';

const config = {
    app: {
        port:               Number(e.PORT)                     || 7654,
        nodeEnv:            e.NODE_ENV                         || 'development',
        bodyLimit:          e.BODY_LIMIT                       || '10kb',
        gracefulShutdownMs: Number(e.GRACEFUL_SHUTDOWN_MS)     || 10_000,
        apiPrefix:          e.API_PREFIX                       || '/api/v1',
    },

    db: {
        uri:             e.DB_URI                              || 'mongodb://127.0.0.1:27017/wandeazy',
        maxRetries:      Number(e.DB_MAX_RETRIES)              || 5,
        retryDelayMs:    Number(e.DB_RETRY_DELAY_MS)           || 5_000,
        connectTimeoutMs:Number(e.DB_CONNECT_TIMEOUT_MS)       || 30_000,
        socketTimeoutMs: Number(e.DB_SOCKET_TIMEOUT_MS)        || 45_000,
        maxPoolSize:     Number(isProd ? e.DB_POOL_MAX_PROD : e.DB_POOL_MAX_DEV)  || (isProd ? 50 : 10),
        minPoolSize:     Number(isProd ? e.DB_POOL_MIN_PROD : e.DB_POOL_MIN_DEV)  || (isProd ? 10 : 2),
    },

    auth: {
        jwtSecret:          e.JWT_SECRET                       || 'dev-only-insecure-secret',
        sessionSecret:      e.SESSION_SECRET                   || 'dev-only-session-secret',
        tokenMaxAgeDays:    Number(e.JWT_TOKEN_MAX_AGE_DAYS)   || 7,
        oneTapMaxAgeMs:     Number(e.GOOGLE_ONE_TAP_MAX_AGE_MS)|| 3_600_000,
        cookieName:         e.AUTH_COOKIE_NAME                 || 'wandeazy.token',
        sidCookieName:      e.AUTH_SID_COOKIE_NAME             || 'wandeazy.sid',
        cookieSameSite:     e.COOKIE_SAME_SITE                 || 'lax',
    },

    google: {
        clientId:     e.GOOGLE_CLIENT_ID,
        clientSecret: e.GOOGLE_CLIENT_SECRET,
        callbackUrl:  e.GOOGLE_CALLBACK_URL,
    },

    cors: {
        localOrigin:      e.LOCAL_FRONTEND_ORIGIN      || 'http://localhost:4321',
        productionOrigin: e.PRODUCTION_FRONTEND_ORIGIN || '',
    },

    rateLimit: {
        api: {
            windowMs: Number(e.RATE_LIMIT_API_WINDOW_MS) || 15 * 60_000,
            // A full page load makes 6-8 API calls, so 100 locked visitors out after ~15 pages.
            max:      Number(e.RATE_LIMIT_API_MAX)        || 1000,
        },
        auth: {
            windowMs: Number(e.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60_000,
            max:      Number(e.RATE_LIMIT_AUTH_MAX)        || 20,
        },
        strict: {
            windowMs: Number(e.RATE_LIMIT_STRICT_WINDOW_MS) || 60 * 60_000,
            max:      Number(e.RATE_LIMIT_STRICT_MAX)        || 10,
        },
        search: {
            windowMs: Number(e.RATE_LIMIT_SEARCH_WINDOW_MS) || 60_000,
            max:      Number(e.RATE_LIMIT_SEARCH_MAX)        || 30,
        },
    },

    email: {
        host:        e.MAILGUN_HOST,
        port:        Number(e.MAILGUN_PORT)  || 587,
        secure:      e.MAILGUN_SECURE === 'true',
        domain:      e.MAILGUN_DOMAIN        || 'wandeazy.com',
        apiKey:      e.MAILGUN_API_KEY,
        fromName:    e.EMAIL_FROM_NAME       || 'Wandeazy',
        fromAddress: e.EMAIL_FROM_ADDRESS    || `noreply@${e.MAILGUN_DOMAIN || 'wandeazy.com'}`,
        brandColor:  e.EMAIL_BRAND_COLOR     || '#0F172A',
        accentColor: e.EMAIL_ACCENT_COLOR    || '#F97316',
        copyrightYear: e.EMAIL_COPYRIGHT_YEAR || new Date().getFullYear().toString(),
        // Where new inquiries / confirmed bookings are announced (optional)
        adminNotifyAddress: e.ADMIN_NOTIFY_EMAIL || '',
    },

    stripe: {
        secretKey:       e.STRIPE_SECRET_KEY,
        webhookSecret:   e.STRIPE_WEBHOOK_SECRET,
        defaultCurrency: e.STRIPE_DEFAULT_CURRENCY || 'USD',
    },

    pagination: {
        defaultLimit:        Number(e.PAGINATION_DEFAULT_LIMIT)         || 10,
        adminDefaultLimit:   Number(e.PAGINATION_ADMIN_DEFAULT_LIMIT)   || 20,
        subscribersLimit:    Number(e.PAGINATION_SUBSCRIBERS_LIMIT)      || 50,
        dashboardRecentLimit:Number(e.DASHBOARD_RECENT_LIMIT)           || 5,
    },

    tours: {
        recommendedFeaturedLimit: Number(e.TOURS_FEATURED_LIMIT)        || 12,
        recommendedFallbackLimit: Number(e.TOURS_FALLBACK_LIMIT)        || 6,
    },

    // Uploaded images: Cloudflare R2 when all five R2 values are set, otherwise the server's own uploads/ folder
    storage: {
        r2AccountId:       e.R2_ACCOUNT_ID         || '',
        r2AccessKeyId:     e.R2_ACCESS_KEY_ID      || '',
        r2SecretAccessKey: e.R2_SECRET_ACCESS_KEY  || '',
        r2Bucket:          e.R2_BUCKET_NAME        || '',
        r2PublicUrl:       (e.R2_PUBLIC_URL        || '').replace(/\/$/, ''),
        // Public address of this API, used for local-disk upload URLs (Render sets RENDER_EXTERNAL_URL)
        publicApiUrl:      (e.PUBLIC_API_URL || e.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),
        maxUploadMb:       Number(e.MAX_UPLOAD_MB) || 10,
    },

    mock: {
        userId:      e.MOCK_USER_ID           || 'mock-user-id',
        email:       e.MOCK_USER_EMAIL        || 'test@wandeazy.com',
        displayName: e.MOCK_USER_DISPLAY_NAME || 'Test User',
        googleId:    e.MOCK_GOOGLE_ID         || 'mock-google-id',
    },
};

module.exports = config;
