import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middlewares/validation';
import { authenticateToken } from '../middlewares/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth';

const router = Router();

// Public routes
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  AuthController.register
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  AuthController.login
);

router.post(
  '/refresh',
  validateRequest({ body: refreshTokenSchema }),
  AuthController.refreshToken
);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);

router.get('/profile', authenticateToken, AuthController.getProfile);

router.patch(
  '/profile',
  authenticateToken,
  validateRequest({ body: updateProfileSchema }),
  AuthController.updateProfile
);

router.patch(
  '/change-password',
  authenticateToken,
  validateRequest({ body: changePasswordSchema }),
  AuthController.changePassword
);

export default router;
