const { ApiResponse } = require('../../core/ApiResponse');
const { actorOf } = require('../../shared/audit');
const service = require('./users.service');

const list = async (req, res) => ApiResponse.ok(res, await service.listUsers(req.validated.query));

const get = async (req, res) =>
  ApiResponse.ok(res, await service.getUser(req.validated.params.userId));

const create = async (req, res) =>
  ApiResponse.created(
    res,
    await service.createUser(actorOf(req), req.validated.body),
    'User created',
  );

const update = async (req, res) =>
  ApiResponse.ok(
    res,
    await service.updateUser(actorOf(req), req.validated.params.userId, req.validated.body),
    'User updated',
  );

const setStatus = async (req, res) =>
  ApiResponse.ok(
    res,
    await service.setUserStatus(
      actorOf(req),
      req.validated.params.userId,
      req.validated.body.isActive,
    ),
    'User status updated',
  );

const resetPassword = async (req, res) => {
  await service.resetPassword(
    actorOf(req),
    req.validated.params.userId,
    req.validated.body.newPassword,
  );
  return ApiResponse.ok(res, null, 'Password reset');
};

module.exports = { list, get, create, update, setStatus, resetPassword };
