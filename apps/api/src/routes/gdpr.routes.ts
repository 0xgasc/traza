import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as gdprService from '../services/gdpr.service.js';
import { success } from '../utils/response.js';

const router = Router();

// GET /api/v1/account/export - GDPR data export
router.get('/export', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await gdprService.exportUserData(req.user!.userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="traza-data-export.json"');
    success(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/account/delete - GDPR account deletion
router.post('/delete', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await gdprService.deleteUserData(req.user!.userId, req.body.confirm === true);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
