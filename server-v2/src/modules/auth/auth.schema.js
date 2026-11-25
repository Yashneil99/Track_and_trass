const { z, registerRoute } = require('../../core/openapi');
const { passwordSchema } = require('../../shared/schemas');
const { userData } = require('../../shared/userView.schema');

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const sessionData = z.object({
  user: userData,
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshTokenExpiresAt: z.string(),
});

// Only these three fields are read. A "role" sent by the caller is ignored, never trusted.
const registerBody = z.object({
  name: z.string().trim().min(2).max(50),
  email: emailSchema,
  password: passwordSchema,
});

const loginBody = z.object({
  email: emailSchema,
  // Not checked for strength here: it only has to match what was saved.
  password: z.string().min(1).max(200),
});

// The refresh token may come in the body (handheld, Swagger) or in the cookie (web).
const refreshBody = z.object({ refreshToken: z.string().min(1).optional() }).default({});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

registerRoute({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary:
    'Create your own account. It starts switched off with the operator role; an admin must activate it.',
  auth: false,
  body: registerBody,
  data: userData,
  status: 201,
  errors: [409],
});
registerRoute({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Log in with email and password. Returns tokens and sets cookies.',
  auth: false,
  body: loginBody,
  data: sessionData,
  errors: [401, 403],
});
registerRoute({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['Auth'],
  summary: 'Swap a refresh token for a new pair. The old refresh token stops working.',
  auth: false,
  body: refreshBody,
  data: sessionData,
  errors: [401],
});
registerRoute({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'End this login (its refresh token is revoked) and clear the cookies.',
  auth: false,
  body: refreshBody,
});
registerRoute({
  method: 'get',
  path: '/api/v1/auth/me',
  tags: ['Auth'],
  summary: 'The logged-in user.',
  data: userData,
});
registerRoute({
  method: 'post',
  path: '/api/v1/auth/change-password',
  tags: ['Auth'],
  summary: 'Change your own password. Every login of yours is ended, so log in again.',
  body: changePasswordBody,
  errors: [400],
});

module.exports = { registerBody, loginBody, refreshBody, changePasswordBody };
