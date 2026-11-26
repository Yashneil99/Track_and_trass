const { z, registerRoute } = require('../../core/openapi');
const { ROLES } = require('../../shared/roles');
const { idParam, trimmed, passwordSchema, queryBoolean } = require('../../shared/schemas');
const { paginationFields, pageSchema } = require('../../shared/pagination');
const { userData } = require('../../shared/userView.schema');

const roleSchema = z.enum(Object.values(ROLES));
const emailSchema = z.string().trim().toLowerCase().email().max(254);

const listQuery = z.object({
  ...paginationFields,
  role: roleSchema.optional(),
  isActive: queryBoolean.optional(),
  q: trimmed(100).optional(), // part of the name or email
});

const userParams = idParam('userId');

const createBody = z.object({
  email: emailSchema,
  name: trimmed(100),
  role: roleSchema,
  password: passwordSchema,
});

const updateBody = z
  .object({ email: emailSchema, name: trimmed(100), role: roleSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Send at least one field to change');

const statusBody = z.object({ isActive: z.boolean() });

const resetPasswordBody = z.object({ newPassword: passwordSchema });

const tags = ['Users'];
const adminOnly = [403];

registerRoute({
  method: 'get',
  path: '/api/v1/users',
  tags,
  summary: 'List users (admin). Filter by role, active state, or part of name/email.',
  query: listQuery,
  data: pageSchema(userData),
  errors: adminOnly,
});
registerRoute({
  method: 'post',
  path: '/api/v1/users',
  tags,
  summary: 'Create a user (admin). Their email, role and first password.',
  body: createBody,
  data: userData,
  status: 201,
  errors: [...adminOnly, 409],
});
registerRoute({
  method: 'get',
  path: '/api/v1/users/{userId}',
  tags,
  summary: 'One user (admin).',
  params: userParams,
  data: userData,
  errors: [...adminOnly, 404],
});
registerRoute({
  method: 'patch',
  path: '/api/v1/users/{userId}',
  tags,
  summary: 'Change name, email or role (admin). You cannot change your own role.',
  params: userParams,
  body: updateBody,
  data: userData,
  errors: [...adminOnly, 404, 409],
});
registerRoute({
  method: 'patch',
  path: '/api/v1/users/{userId}/status',
  tags,
  summary: 'Enable or disable a user (admin). Disabling ends all their logins.',
  params: userParams,
  body: statusBody,
  data: userData,
  errors: [...adminOnly, 404, 409],
});
registerRoute({
  method: 'post',
  path: '/api/v1/users/{userId}/reset-password',
  tags,
  summary: 'Set a new password for someone else (admin). Ends their logins and clears a lockout.',
  params: userParams,
  body: resetPasswordBody,
  errors: [...adminOnly, 404],
});

module.exports = {
  listQuery,
  userParams,
  createBody,
  updateBody,
  statusBody,
  resetPasswordBody,
};
