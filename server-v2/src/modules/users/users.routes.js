const express = require('express');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');
const { validate } = require('../../middlewares/validate');
const { ROLES } = require('../../shared/roles');
const schema = require('./users.schema');
const controller = require('./users.controller');

const router = express.Router();

// Every users route is for admins only.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.post('/', validate({ body: schema.createBody }), controller.create);
router.get('/:userId', validate({ params: schema.userParams }), controller.get);
router.patch(
  '/:userId',
  validate({ params: schema.userParams, body: schema.updateBody }),
  controller.update,
);
router.patch(
  '/:userId/status',
  validate({ params: schema.userParams, body: schema.statusBody }),
  controller.setStatus,
);
router.post(
  '/:userId/reset-password',
  validate({ params: schema.userParams, body: schema.resetPasswordBody }),
  controller.resetPassword,
);

module.exports = router;
