const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load server-v2/.env first. Variables already set in the process win (Docker, CI, tests).
dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),

  // Optional: when empty, Redis features are skipped.
  REDIS_URL: z.string().optional(),

  // Secrets have no defaults on purpose.
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('6h'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  COOKIE_SECURE: bool,
  TRUST_PROXY: bool,
  SWAGGER_ENABLED: bool,

  // Comma-separated list of browser origins allowed to call the API with cookies.
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),

  // A warehouse shares few IP addresses, so these are per IP and fairly high.
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

/**
 * Validate a settings object. Throws one readable error listing every problem.
 * Values are never printed, only the setting names, so secrets cannot leak into logs.
 */
function loadEnv(source = process.env) {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment settings:\n${lines.join('\n')}`);
  }
  return Object.freeze(result.data);
}

const env = loadEnv();

module.exports = { env, loadEnv };
