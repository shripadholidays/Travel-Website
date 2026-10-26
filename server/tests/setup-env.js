// Runs before any module loads, so values set here win over server/.env (dotenv never overrides).
process.env.NODE_ENV = 'test';
// A fresh in-memory database per test file; never the real one
process.env.TURSO_DATABASE_URL = ':memory:';
process.env.TURSO_AUTH_TOKEN = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = '';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.RATE_LIMIT_SEARCH_MAX = '100000';
process.env.FLIGHT_PROVIDER = 'mock';
process.env.HOTEL_PROVIDER = 'mock';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
// Tests change data straight through the models, so the landing page cache is off unless a test turns it on
process.env.PUBLIC_CACHE_TTL_MS = '0';
