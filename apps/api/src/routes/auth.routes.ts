import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validators.js';

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

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

// 2FA / TOTP
router.post('/2fa/setup', requireAuth, authController.setupTotp);
router.post('/2fa/verify', requireAuth, authController.verifyTotp);
router.post('/2fa/disable', requireAuth, authController.disableTotp);
router.post('/2fa/login-verify', authLimiter, authController.verifyLoginTotp);

router.post('/api-keys', requireAuth, authController.createApiKey);
router.get('/api-keys', requireAuth, authController.listApiKeys);
router.delete('/api-keys/:keyId', requireAuth, authController.revokeApiKey);

// Legacy alias
router.post('/api-key', requireAuth, authController.createApiKey);

// Session management
router.get('/sessions', requireAuth, authController.listSessions);
router.delete('/sessions/:sessionId', requireAuth, authController.revokeSession);
router.delete('/sessions', requireAuth, authController.revokeAllSessions);

// Email verification
router.post('/verify-email/send', requireAuth, authController.sendVerification);
router.post('/verify-email', authController.verifyEmailToken);

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
