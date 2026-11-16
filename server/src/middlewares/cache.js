const redisClient = require('../config/cacheCon');
const { logger } = require('../utils/logger');

const cache = (key, ttl = 60) => async (req, res, next) => {
  try {
    const cachedResponse = await redisClient.get(key);
    
    if (cachedResponse) {
      console.log("⚡ Cache HIT →", key);
      return res.status(200).json(JSON.parse(cachedResponse));
    }

    console.log("🟡 Cache MISS →", key);
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      try {
        await redisClient.setEx(key, ttl, JSON.stringify(body));
      } catch (err) {
        console.error("Redis SET error:", err);
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Redis Cache Error:", error);
    next();
  }
};

const clearCache = async (url) => {
  if (!redisClient || !redisClient.isReady) return;

  const cacheKey = `cache:${url}`;
  try {
    await redisClient.del(cacheKey);
    logger.debug(`Cleared cache for ${url}`);
  } catch (error) {
    logger.error(`Failed to clear cache for ${url}:`, error);
  }
};

const clearAllCache = async () => {
  if (!redisClient || !redisClient.isReady) return;

  try {
    const keys = await redisClient.keys('cache:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
};

const getCacheStats = async () => {
  if (!redisClient || !redisClient.isReady) {
    return { available: false, message: 'Redis not available' };
  }

  try {
    const keys = await redisClient.keys('cache:*');
    const info = await redisClient.info('memory');

    return {
      available: true,
      cachedItems: keys.length,
      memoryUsage: info.used_memory_human,
      cacheKeys: keys
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { available: false, error: error.message };
  }
};

module.exports = {
  cache,
  clearCache,
  clearAllCache,
  getCacheStats
};
