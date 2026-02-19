import { Router } from 'express';
import { z } from 'zod';
import * as signerAuthService from '../services/signer-auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

const requestSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(1).max(100).optional(),
});

const verifySchema = z.object({
  token: z.string().min(10),
});

const signatureSchema = z.object({
  signatureData: z.string().startsWith('data:image/', 'Must be an image data URL'),
});

// Request a magic link (rate-limited)
router.post('/magic-link', authLimiter, async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION', parsed.error.errors[0]?.message ?? 'Invalid input');
    }
    await signerAuthService.requestMagicLink(parsed.data.email, parsed.data.name);
    res.json({ sent: true, message: 'Magic link sent — check your email' });
  } catch (err) {
    next(err);
  }
});

// Verify magic link token and return access token
router.post('/verify', authLimiter, async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION', 'Invalid token');
    }
    const result = await signerAuthService.verifyMagicLink(parsed.data.token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get signer profile (authenticated)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await signerAuthService.getSignerProfile(req.user!.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// Save/update signature drawing (authenticated)
router.patch('/signature', requireAuth, async (req, res, next) => {
  try {
    const parsed = signatureSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION', parsed.error.errors[0]?.message ?? 'Invalid signature');
    }
    await signerAuthService.saveSignerSignature(req.user!.userId, parsed.data.signatureData);
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
});

// Delete saved signature (authenticated)
router.delete('/signature', requireAuth, async (req, res, next) => {
  try {
    await signerAuthService.deleteSignerSignature(req.user!.userId);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// Get signing history (authenticated)
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const history = await signerAuthService.getSignerHistory(req.user!.userId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
