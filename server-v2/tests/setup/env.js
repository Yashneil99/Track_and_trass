// Runs before every test file. Tests use their own database and never touch real data.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hul_track_v2_test';
process.env.REDIS_URL = ''; // skip Redis in tests
process.env.SWAGGER_ENABLED = 'true';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.COOKIE_SECURE = 'false';

// Fixed, non-secret values so tests run on any machine, including CI.
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-0000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret-000';
