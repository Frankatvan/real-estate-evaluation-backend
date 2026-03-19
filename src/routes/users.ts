import { Router } from 'express';
import { UserController } from '../controllers/usersController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateIdParameter
} from '../middleware/validation';

const router = Router();

// Controller will be initialized with database connection in middleware
router.use((req, res, next) => {
  const db = req.app.get('db');
  req.controller = new UserController(db);
  next();
});

/**
 * POST /api/v1/users/register
 * Register a new user
 */
router.post('/register', validateUserRegistration, async (req, res, next) => {
  req.controller.register(req, res, next);
});

/**
 * POST /api/v1/users/login
 * Login user
 */
router.post('/login', validateUserLogin, async (req, res, next) => {
  req.controller.login(req, res, next);
});

/**
 * GET /api/v1/users/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  req.controller.getMe(req, res, next);
});

/**
 * PUT /api/v1/users/me
 * Update current user information
 */
router.put('/me', authenticateToken, validateUserUpdate, async (req, res, next) => {
  req.controller.updateMe(req, res, next);
});

/**
 * GET /api/v1/users
 * Get all users (admin only)
 */
router.get('/', authenticateToken, authorizeRole('ADMIN'), async (req, res, next) => {
  req.controller.getAllUsers(req, res, next);
});

/**
 * DELETE /api/v1/users/:id
 * Delete user (admin only)
 */
router.delete('/:id', authenticateToken, authorizeRole('ADMIN'), validateIdParameter, async (req, res, next) => {
  req.controller.deleteUser(req, res, next);
});

export default router;
