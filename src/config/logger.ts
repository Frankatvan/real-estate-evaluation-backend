import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Logger Configuration
 * Provides structured logging with file rotation and multiple transports
 */

const logDir = process.env.LOG_DIR || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

// Define log format
const logFormats = {
  json: winston.format.json(),
  simple: winston.format.simple(),
  combined: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  pretty: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  )
};

// Create Winston logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormats.combined,
  defaultMeta: { service: 'real-estate-evaluation-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormats.json : logFormats.pretty,
      silent: process.env.NODE_ENV === 'test'
    }),

    // Error log file (daily rotation)
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormats.combined
    }),

    // Combined log file (daily rotation)
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormats.combined
    }),

    // Application log file (daily rotation)
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormats.combined
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

/**
 * Create a child logger with additional metadata
 */
export const createChildLogger = (meta: object) => {
  return logger.child(meta);
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
    query: req.query
  });

  next(err);
};

/**
 * Stream for Morgan HTTP logger
 */
export const winstonStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

/**
 * Security event logging
 */
export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Performance logging
 */
export const logPerformance = (operation: string, duration: number, details?: any) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...details
  };

  if (duration > 1000) {
    logger.warn('Slow operation detected', logData);
  } else {
    logger.info('Operation completed', logData);
  }
};

export default logger;