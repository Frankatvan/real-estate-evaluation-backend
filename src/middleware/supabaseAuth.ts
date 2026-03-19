import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

/**
 * Supabase Authentication Middleware
 * Validates JWT tokens from Supabase and attaches user info to request
 */

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    user_metadata?: any;
  };
}

/**
 * Validate Supabase JWT token from Authorization header
 */
export const authenticateSupabaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'No authorization token provided'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message, ip: req.ip });
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        details: 'Invalid or expired token'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'USER',
      user_metadata: user.user_metadata
    };

    // Log successful authentication
    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role
    });

    next();
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message, ip: req.ip });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: 'Authentication service unavailable'
    });
  }
};

/**
 * Authorization middleware - check user role
 */
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        details: `Role '${req.user.role}' is not authorized for this action`,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role || 'USER',
          user_metadata: user.user_metadata
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth
    next();
  }
};