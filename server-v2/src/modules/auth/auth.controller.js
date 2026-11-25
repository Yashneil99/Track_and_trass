const { env } = require('../../config/env');
const { ApiResponse } = require('../../core/ApiResponse');
const { actorOf } = require('../../shared/audit');
const service = require('./auth.service');

const cookieOptions = (expires, path = '/') => ({
  httpOnly: true, // scripts on the page cannot read it
  secure: env.COOKIE_SECURE,
  sameSite: 'lax', // not sent on requests started by other sites
  path,
  expires,
});

// The refresh cookie is only sent to the auth routes, never with ordinary requests.
const REFRESH_PATH = '/api/v1/auth';

function setSessionCookies(res, session) {
  res.cookie('accessToken', session.accessToken, cookieOptions(session.accessTokenExpiresAt));
  res.cookie(
    'refreshToken',
    session.refreshToken,
    cookieOptions(session.refreshTokenExpiresAt, REFRESH_PATH),
  );
}

function clearSessionCookies(res) {
  res.clearCookie('accessToken', cookieOptions(undefined));
  res.clearCookie('refreshToken', cookieOptions(undefined, REFRESH_PATH));
}

const deviceOf = (req) => req.get('user-agent');
const refreshTokenOf = (req) => req.validated.body.refreshToken || req.cookies?.refreshToken;

async function register(req, res) {
  const user = await service.register(actorOf(req), req.validated.body);
  return ApiResponse.created(
    res,
    user,
    'Account created. An admin must activate it before you can log in.',
  );
}

async function login(req, res) {
  const session = await service.login({ ...req.validated.body, deviceInfo: deviceOf(req) });
  setSessionCookies(res, session);
  return ApiResponse.ok(res, session, 'Logged in');
}

async function refresh(req, res) {
  const session = await service.refresh({
    refreshToken: refreshTokenOf(req),
    deviceInfo: deviceOf(req),
  });
  setSessionCookies(res, session);
  return ApiResponse.ok(res, session, 'Token refreshed');
}

async function logout(req, res) {
  await service.logout({ refreshToken: refreshTokenOf(req) });
  clearSessionCookies(res);
  return ApiResponse.ok(res, null, 'Logged out');
}

async function me(req, res) {
  return ApiResponse.ok(res, await service.getMe(req.user.userId));
}

async function changePassword(req, res) {
  await service.changePassword(actorOf(req), req.validated.body);
  clearSessionCookies(res);
  return ApiResponse.ok(res, null, 'Password changed. Please log in again.');
}

module.exports = { register, login, refresh, logout, me, changePassword };
