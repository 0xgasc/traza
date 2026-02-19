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

router.patch('/profile', requireAuth, authController.updateProfile);

router.post('/change-password', requireAuth, authController.changePassword);

router.post('/api-key', requireAuth, authController.createApiKey);

// Branding
router.get('/branding', requireAuth, async (req, res, next) => {
  try {
    const { prisma } = await import('@traza/database');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { brandingLogoUrl: true, brandingColor: true },
    });
    res.json({ logoUrl: user?.brandingLogoUrl ?? null, primaryColor: user?.brandingColor ?? null });
  } catch (err) { next(err); }
});

router.patch('/branding', requireAuth, async (req, res, next) => {
  try {
    const { logoUrl, primaryColor } = req.body;
    const { prisma } = await import('@traza/database');
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(logoUrl !== undefined ? { brandingLogoUrl: logoUrl || null } : {}),
        ...(primaryColor !== undefined ? { brandingColor: primaryColor || null } : {}),
      },
      select: { brandingLogoUrl: true, brandingColor: true },
    });
    res.json({ logoUrl: user.brandingLogoUrl, primaryColor: user.brandingColor });
  } catch (err) { next(err); }
});

export default router;
