const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hul_track',
  port: process.env.DB_PORT || 5432,
  max: process.env.DB_POOL_MAX || 20, // Maximum number of clients in the pool
  min: process.env.DB_POOL_MIN || 4,  // Minimum number of clients in the pool
  idleTimeoutMillis: process.env.DB_POOL_IDLE_TIMEOUT || 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: process.env.DB_POOL_CONNECTION_TIMEOUT || 5000, // How long to try to connect before timing out
  maxUses: process.env.DB_POOL_MAX_USES || 10000, // Maximum number of times a connection can be reused
  validate: (client) => {
    return client.query('SELECT 1').then(() => true).catch(() => false);
  },
  acquireTimeoutMillis: process.env.DB_POOL_ACQUIRE_TIMEOUT || 10000,
  createTimeoutMillis: process.env.DB_POOL_CREATE_TIMEOUT || 10000,
  destroyTimeoutMillis: process.env.DB_POOL_DESTROY_TIMEOUT || 5000
});

// Event listeners for pool events
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('acquire', () => {
  console.log('Database connection acquired');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Health check function
const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as health_check');
    client.release();
    console.log('Database health check passed');
    return { healthy: true, message: 'Database connection healthy' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, error: error.message };
  }
};

// Get pool statistics
const getPoolStats = () => {
  return {
    totalClients: pool.totalCount,
    idleClients: pool.idleCount,
    waitingClients: pool.waitingCount,
    maxClients: pool.options.max,
    minClients: pool.options.min
  };
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database connection pool closed gracefully');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// Export the pool and utility functions
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  checkDatabaseHealth,
  getPoolStats,
  closePool
};

// Log pool statistics periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getPoolStats();
    console.log('Database pool stats:', stats);
  }, 60000); // Every minute
};
