const db = require('../../config/db');
const { withTransaction } = require('../../shared/withTransaction');
const { hashPassword } = require('../../shared/password');
const { writeAudit } = require('../../shared/audit');
const { toUserView } = require('../../shared/userView');
const { offsetOf, pageOf } = require('../../shared/pagination');
const { ROLES } = require('../../shared/roles');
const { BadRequestError, ConflictError, NotFoundError } = require('../../core/AppError');
const authRepo = require('../auth/auth.repository');
const repo = require('./users.repository');

const notFound = () => new NotFoundError('User not found');

/** Turn "email already used" into a clear 409. Anything else is passed on. */
function explainDuplicate(err) {
  if (err.code === '23505') return new ConflictError('A user with this email already exists');
  return err;
}

async function listUsers(filters) {
  const { page, limit, ...rest } = filters;
  const { rows, total } = await repo.list(db, rest, { limit, offset: offsetOf({ page, limit }) });
  return pageOf(rows.map(toUserView), total, { page, limit });
}

async function getUser(userId) {
  const user = await repo.findById(db, userId);
  if (!user) throw notFound();
  return toUserView(user);
}

async function createUser(actor, { email, name, role, password }) {
  const passwordHash = await hashPassword(password);
  try {
    return await withTransaction(async (client) => {
      const user = await repo.insert(client, { email, name, role, passwordHash });
      await writeAudit(client, actor, {
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.user_id,
        details: { email, role },
      });
      return toUserView(user);
    });
  } catch (err) {
    throw explainDuplicate(err);
  }
}

/**
 * Run `change` on one user, inside a transaction, after the safety checks.
 * The last active admin can never be removed, or nobody could manage users any more.
 */
async function changeUser(userId, { removesAdmin, selfAllowed = true, actor }, change) {
  return withTransaction(async (client) => {
    const adminIds = await repo.lockActiveAdmins(client);
    const user = await repo.findById(client, userId, { lock: true });
    if (!user) throw notFound();

    if (!selfAllowed && actor.userId === user.user_id) {
      throw new BadRequestError('You cannot do this to your own account');
    }
    const isActiveAdmin = user.role === ROLES.ADMIN && user.is_active;
    if (removesAdmin(user) && isActiveAdmin && adminIds.length <= 1) {
      throw new ConflictError('This is the last active admin, so it cannot be removed');
    }
    return change(client, user);
  });
}

async function updateUser(actor, userId, patch) {
  const roleChanges = (user) => patch.role !== undefined && patch.role !== user.role;
  try {
    return await changeUser(
      userId,
      {
        actor,
        // Changing your own role is blocked (an admin could demote themselves by mistake).
        selfAllowed: patch.role === undefined,
        removesAdmin: (user) => roleChanges(user) && patch.role !== ROLES.ADMIN,
      },
      async (client, user) => {
        const updated = await repo.update(client, userId, patch);
        await writeAudit(client, actor, {
          action: 'USER_UPDATED',
          entityType: 'user',
          entityId: userId,
          details: { before: toUserView(user), after: toUserView(updated) },
        });
        return toUserView(updated);
      },
    );
  } catch (err) {
    throw explainDuplicate(err);
  }
}

async function setUserStatus(actor, userId, isActive) {
  return changeUser(
    userId,
    { actor, selfAllowed: isActive, removesAdmin: () => !isActive },
    async (client) => {
      const updated = await repo.update(client, userId, { isActive });
      // Disabling takes effect at the next refresh: all their logins end now.
      if (!isActive) await authRepo.revokeAllSessions(client, userId);
      await writeAudit(client, actor, {
        action: isActive ? 'USER_ENABLED' : 'USER_DISABLED',
        entityType: 'user',
        entityId: userId,
      });
      return toUserView(updated);
    },
  );
}

async function resetPassword(actor, userId, newPassword) {
  if (actor.userId === userId) {
    throw new BadRequestError('To change your own password use the change-password route');
  }
  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (client) => {
    const user = await repo.findById(client, userId, { lock: true });
    if (!user) throw notFound();
    await authRepo.updatePasswordHash(client, userId, passwordHash);
    await authRepo.revokeAllSessions(client, userId);
    await writeAudit(client, actor, {
      action: 'PASSWORD_RESET',
      entityType: 'user',
      entityId: userId,
    });
  });
}

module.exports = { listUsers, getUser, createUser, updateUser, setUserStatus, resetPassword };
