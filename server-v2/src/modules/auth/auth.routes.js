const express = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { authLimiter } = require('../../middlewares/rateLimit');
const { validate } = require('../../middlewares/validate');
const { registerBody, loginBody, refreshBody, changePasswordBody } = require('./auth.schema');
const controller = require('./auth.controller');

const router = express.Router();
const limiter = authLimiter(); // one counter shared by login and refresh

router.post('/register', limiter, validate({ body: registerBody }), controller.register);
router.post('/login', limiter, validate({ body: loginBody }), controller.login);
router.post('/refresh', limiter, validate({ body: refreshBody }), controller.refresh);
router.post('/logout', validate({ body: refreshBody }), controller.logout);
router.get('/me', authenticate, controller.me);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordBody }),
  controller.changePassword,
);

module.exports = router;
