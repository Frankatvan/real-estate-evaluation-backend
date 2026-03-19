import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database configuration
 * Handles connection pooling, error handling, and reconnection logic
 */

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'real_estate_eval',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000'),
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(poolConfig);

/**
 * Enhanced error handling for database connection issues
 */
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection lost. Connection pool will attempt to reconnect...');
    // Don't exit, let the pool handle reconnection
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Database connection refused. Check if database server is running.');
    // Don't exit immediately in production, let the application handle it
  } else if (err.code === 'ENOTFOUND') {
    console.error('Database host not found. Check DB_HOST configuration.');
  } else {
    console.error('Database error:', err.message);
    // In development, exit on unknown errors. In production, log and continue.
    if (process.env.NODE_ENV === 'development') {
      process.exit(-1);
    }
  }
});

/**
 * Connection event handlers for monitoring
 */
pool.on('connect', (client) => {
  console.log('New database client connected to the pool');
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

/**
 * Test database connection
 * Returns true if connection successful, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

/**
 * Health check for database connection
 * Returns detailed health status
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details?: any;
}> => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as connection_count FROM pg_stat_activity');
    return {
      status: 'healthy',
      details: {
        currentTime: result.rows[0].current_time,
        connectionCount: result.rows[0].connection_count,
        poolSize: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      details: {
        error: error.message,
        code: error.code
      }
    };
  }
};

/**
 * Execute a transaction with automatic rollback on error
 * Provides safer transaction handling
 */
export const executeTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Graceful shutdown of database pool
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('Database connection pool closed successfully');
  } catch (error) {
    console.error('Error closing database connection pool:', error);
    throw error;
  }
};

/**
 * Get pool statistics for monitoring
 */
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxClient: pool.options.max || 20,
    minClient: pool.options.min || 2
  };
};

export default pool;
