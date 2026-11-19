const express = require('express');
const db = require('../../config/db');
const redis = require('../../config/redis');
const { ApiResponse } = require('../../core/ApiResponse');
require('./health.schema');

const router = express.Router();

// Alive: answers as long as the process runs. Used by Docker's healthcheck.
router.get('/health', (req, res) =>
  ApiResponse.ok(res, { uptimeSeconds: Math.round(process.uptime()) }, 'OK'),
);

// Ready: the database must answer. Redis is only a cache, so it is reported but not required.
router.get('/ready', async (req, res) => {
  const [database, cache] = await Promise.all([db.checkDatabase(), redis.checkRedis()]);
  const data = {
    database: database.ok ? 'up' : 'down',
    redis: cache.skipped ? 'skipped' : cache.ok ? 'up' : 'down',
  };
  if (!database.ok) return ApiResponse.send(res, 503, 'Not ready', data);
  return ApiResponse.ok(res, data, 'Ready');
});

module.exports = router;
