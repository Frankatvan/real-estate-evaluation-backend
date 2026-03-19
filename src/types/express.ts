import { UserController } from '../controllers/usersController';
import { ProjectController } from '../controllers/projectsController';
import { CalculationController } from '../controllers/calculationsController';

/**
 * Extend Express Request type to include controllers
 */
declare global {
  namespace Express {
    interface Request {
      controller?: any;
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

export {};