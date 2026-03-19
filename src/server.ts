import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import pool, { testConnection, closePool, healthCheck } from './config/database';
import logger, { requestLogger, errorLogger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import cacheService from './services/cacheService';
import calculationsRouter from './routes/calculations';
import usersRouter from './routes/users';
import projectsRouter from './routes/projects';
import importsRouter from './routes/imports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Make database pool available to routes
app.set('db', pool);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// API Documentation
/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API documentation
 *     description: Access interactive API documentation
 *     tags: [Documentation]
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '房地产成本收益测算系统 API Documentation'
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  const cacheStats = cacheService.getStats();

  res.json({
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    cache: {
      keys: cacheStats.keys,
      hitRate: cacheStats.hitRate,
      hits: cacheStats.hitCount,
      misses: cacheStats.missCount
    }
  });
});

// Cache statistics endpoint
app.get('/cache/stats', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// Cache flush endpoint (admin only)
app.post('/cache/flush', (req, res) => {
  cacheService.flushAll();
  res.json({
    success: true,
    message: 'Cache flushed successfully'
  });
});

// API routes
app.use('/api/v1/calculations', calculationsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/imports', importsRouter);

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connections
    await closePool();
    console.log('Database connections closed');

    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Test database connection and start server
const startServer = async () => {
  try {
    logger.info('Starting Real Estate Evaluation API server...', {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      nodeVersion: process.version
    });

    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database. Server will start but database operations may fail.');
    } else {
      logger.info('Database connection test successful');
    }

    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        database: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`,
        healthCheck: `http://localhost:${PORT}/health`
      });
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

const server = await startServer();

export { server, pool };
