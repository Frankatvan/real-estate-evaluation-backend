import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

/**
 * Validation middleware
 * Provides input validation for API requests using express-validator
 */

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? req.body[err.path] : undefined
      }))
    });
  }
  next();
};

/**
 * Validation chains for common use cases
 */

// User validation
export const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['USER', 'ADMIN', 'MANAGER'])
    .withMessage('Invalid role specified'),
  handleValidationErrors
];

export const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

export const validateUserUpdate = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('newPassword')
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  handleValidationErrors
];

// Project validation
export const validateProjectCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location must not exceed 500 characters'),
  body('totalUnits')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total units must be a non-negative integer'),
  body('totalArea')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total area must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
    .withMessage('Invalid status specified'),
  handleValidationErrors
];

export const validateProjectUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Project name must not exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
    .withMessage('Invalid status specified'),
  handleValidationErrors
];

// Calculation parameters validation
export const validateCalculationParameters = [
  body('benchmarkSellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Benchmark selling price must be a non-negative number'),
  body('wbgIncomeCalculationMethod')
    .optional()
    .isIn(['DIFFERENCE', 'DIRECT'])
    .withMessage('WBG income calculation method must be either DIFFERENCE or DIRECT'),
  body('loanInterestRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Loan interest rate must be between 0 and 1'),
  body('terminalValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Terminal value must be a non-negative number'),
  body('fiveYearValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Five year value must be a non-negative number'),
  body('restenantsCostRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Restenants cost rate must be between 0 and 1'),
  body('salesCommissionFixed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sales commission fixed must be a non-negative number'),
  body('salesCommissionRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Sales commission rate must be between 0 and 1'),
  body('vacancyRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Vacancy rate must be between 0 and 1'),
  handleValidationErrors
];

// Plan data validation
export const validatePlanData = [
  body('unitCode')
    .trim()
    .notEmpty()
    .withMessage('Unit code is required')
    .isLength({ max: 50 })
    .withMessage('Unit code must not exceed 50 characters'),
  body('activityType')
    .trim()
    .notEmpty()
    .withMessage('Activity type is required')
    .isIn(['施工', '销售', '装修', '验收', '交付', '其他'])
    .withMessage('Invalid activity type'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('plannedDays')
    .isInt({ min: 0 })
    .withMessage('Planned days must be a non-negative integer'),
  body('actualDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Actual days must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'])
    .withMessage('Invalid status specified'),
  handleValidationErrors
];

// Payment data validation
export const validatePaymentData = [
  body('paymentType')
    .trim()
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['CONSTRUCTION', 'SALES', 'OPERATING', 'FINANCING', 'OTHER'])
    .withMessage('Invalid payment type'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('plannedAmount')
    .isFloat({ min: 0 })
    .withMessage('Planned amount must be a non-negative number'),
  body('actualAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual amount must be a non-negative number'),
  body('plannedDate')
    .isISO8601()
    .withMessage('Planned date must be a valid date'),
  body('actualDate')
    .optional()
    .isISO8601()
    .withMessage('Actual date must be a valid date'),
  body('status')
    .optional()
    .isIn(['PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE'])
    .withMessage('Invalid status specified'),
  handleValidationErrors
];

// Common parameter validation
export const validateIdParameter = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID parameter'),
  handleValidationErrors
];

export const validateVersionIdParameter = [
  param('versionId')
    .isInt({ min: 1 })
    .withMessage('Invalid version ID parameter'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Sort field name too long'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Order must be either ASC or DESC'),
  handleValidationErrors
];

/**
 * Sanitize input by removing potentially dangerous characters
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remove potential XSS vectors from string fields
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/<script[^>]*>.*?<\/script>/gi, '')
                  .replace(/<[^>]*>/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Rate limiting middleware (basic implementation)
 */
export const rateLimiter = (maxRequests: number = 100, windowMs: number = 900000) => {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    const userRequests = requests.get(key) || [];
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    validRequests.push(now);
    requests.set(key, validRequests);
    next();
  };
};

/**
 * Content type validation
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      const contentType = req.headers['content-type'];
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
        });
      }
    }
    next();
  };
};