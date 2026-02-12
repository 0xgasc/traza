import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register,
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login,
);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.getMe);

router.post('/api-key', requireAuth, authController.createApiKey);

export default router;
