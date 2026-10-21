// Runs before any module loads, so values set here win over server/.env (dotenv never overrides).
process.env.NODE_ENV = 'test';
process.env.DB_URI = process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/wandeazy_test';
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';
process.env.RATE_LIMIT_API_MAX = '100000';
process.env.RATE_LIMIT_SEARCH_MAX = '100000';
process.env.FLIGHT_PROVIDER = 'mock';
process.env.HOTEL_PROVIDER = 'mock';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
