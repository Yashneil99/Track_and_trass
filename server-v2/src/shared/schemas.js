const { z } = require('../core/openapi');

/** A database id in a URL or body: a positive whole number. */
const idSchema = z.coerce.number().int().positive();

/** Params object for a route like /users/:userId. */
const idParam = (name) => z.object({ [name]: idSchema });

/** Text that is trimmed and must not be empty. */
const trimmed = (max = 200) => z.string().trim().min(1).max(max);

/**
 * A new password: 8 or more characters. bcrypt only reads the first 72 bytes, so longer
 * passwords are refused instead of being silently cut short.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => Buffer.byteLength(p) <= 72, 'Password must be at most 72 bytes');

/** "true"/"false" in a query string, as a real boolean. */
const queryBoolean = z.enum(['true', 'false']).transform((v) => v === 'true');

module.exports = { idSchema, idParam, trimmed, passwordSchema, queryBoolean };
