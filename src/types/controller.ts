import { Request, Response, NextFunction } from 'express';

/**
 * Controller type definitions
 */

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Controller response type
 */
export type ControllerResponse = Promise<void> | void;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * User information attached to request
 */
export interface RequestUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

/**
 * Extended Request interface with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}