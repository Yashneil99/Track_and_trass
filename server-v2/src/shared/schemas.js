const { z } = require('../core/openapi');

/**
 * A new password: 8 or more characters. bcrypt only reads the first 72 bytes, so longer
 * passwords are refused instead of being silently cut short.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => Buffer.byteLength(p) <= 72, 'Password must be at most 72 bytes');

module.exports = { passwordSchema };
