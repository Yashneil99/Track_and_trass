const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 5000),
  }
});

redisClient.on("error", (err) => console.error("Redis Error:", err));
redisClient.on("connect", () => console.log("Redis Connected"));
redisClient.connect();

module.exports = redisClient;
