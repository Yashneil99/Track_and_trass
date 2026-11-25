const { z } = require('../core/openapi');
const { ROLES } = require('./roles');

/** Swagger shape of toUserView(). Shared by the auth and users modules. */
const userData = z
  .object({
    userId: z.number().int(),
    email: z.string(),
    name: z.string(),
    role: z.enum(Object.values(ROLES)),
    isActive: z.boolean(),
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('User');

module.exports = { userData };
