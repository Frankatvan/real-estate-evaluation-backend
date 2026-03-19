import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ControllerResponse, asyncHandler } from '../types/controller';

/**
 * User Controller
 * Handles user-related business logic
 */

export class UserController {
  constructor(private db: Pool) {}

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { username, email, password, role = 'USER' } = req.body;

      // Check if user already exists
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          details: 'Username or email is already taken'
        });
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const result = await this.db.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, email, role, created_at`,
        [username, email, hashedPassword, role]
      );

      const user = result.rows[0];

      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.created_at
          },
          token
        }
      });
    });
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { username, password } = req.body;

      // Find user by username or email
      const result = await this.db.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          details: 'Invalid username or password'
        });
      }

      const user = result.rows[0];

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          details: 'Invalid username or password'
        });
      }

      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Update last login time
      await this.db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.last_login
          },
          token
        }
      });
    });
  };

  /**
   * Get current user information
   */
  getMe = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });
    });
  };

  /**
   * Update current user information
   */
  updateMe = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { email, currentPassword, newPassword } = req.body;

      // If changing password, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password required',
            details: 'Please provide your current password to change it'
          });
        }

        const userResult = await this.db.query(
          'SELECT password_hash FROM users WHERE id = $1',
          [req.user!.id]
        );

        const passwordMatch = await bcrypt.compare(
          currentPassword,
          userResult.rows[0].password_hash
        );

        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            details: 'Current password is incorrect'
          });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await this.db.query(
          'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [hashedPassword, req.user!.id]
        );
      }

      // Update email if provided
      if (email && email !== req.user!.email) {
        // Check if email is already taken
        const existingEmail = await this.db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, req.user!.id]
        );

        if (existingEmail.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Email already taken',
            details: 'This email is already associated with another account'
          });
        }

        await this.db.query(
          'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [email, req.user!.id]
        );
      }

      // Fetch updated user information
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
        [req.user!.id]
      );

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0]
      });
    });
  };

  /**
   * Get all users (admin only)
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const result = await this.db.query(
        'SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC'
      );

      return res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    });
  };

  /**
   * Delete user (admin only)
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): ControllerResponse => {
    return asyncHandler(async () => {
      const { id } = req.params;

      // Prevent deleting yourself
      if (parseInt(id) === req.user!.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete yourself',
          details: 'You cannot delete your own account'
        });
      }

      const result = await this.db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        message: 'User deleted successfully',
        data: result.rows[0]
      });
    });
  };
}