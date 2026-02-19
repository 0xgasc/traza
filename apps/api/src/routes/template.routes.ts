import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as templateController from '../controllers/template.controller.js';
import * as storage from '../services/storage.service.js';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';

const router = Router();

router.get('/', requireAuth, templateController.listTemplates);
router.post('/', requireAuth, templateController.createTemplate);
router.get('/:id/signer-roles', requireAuth, templateController.getTemplateSignerRoles);
router.put('/:id/fields', requireAuth, templateController.saveTemplateFields);
router.post('/:id/use', requireAuth, templateController.useTemplate);
router.post('/:id/bulk-send', requireAuth, templateController.bulkSend);

router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id as string },
    });
    if (!template || template.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Template not found');
    }
    const buffer = await storage.getFileBuffer(template.fileUrl);
    if (!buffer) throw new AppError(404, 'NOT_FOUND', 'Template file not found');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, templateController.getTemplate);
router.patch('/:id', requireAuth, templateController.updateTemplate);
router.delete('/:id', requireAuth, templateController.deleteTemplate);

export default router;
