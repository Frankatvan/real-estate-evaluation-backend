import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Role-based authorization middleware
 * Checks if user has required role
 */
export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, secret, (err: any, user: any) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};
