import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import * as fieldController from '../controllers/field.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { upload } from '../config/multer.js';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import * as storage from '../services/storage.service.js';

const router = Router();

router.post(
  '/',
  authenticate,
  uploadLimiter,
  upload.single('file'),
  documentController.createDocument,
);

router.get('/', authenticate, documentController.listDocuments);

router.get('/:id', authenticate, documentController.getDocument);

router.get('/:id/download', authenticate, documentController.getDownloadUrl);

router.get('/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string },
    });

    if (!document || document.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    const fileKey = document.pdfFileUrl || document.fileUrl;

    // Proxy file through the API (works for both local storage and S3/MinIO)
    const buffer = await storage.getFileBuffer(fileKey);
    if (!buffer) throw new AppError(404, 'NOT_FOUND', 'Document file not found');

    const meta = await storage.getFileMetadata(fileKey);
    res.setHeader('Content-Type', meta?.contentType || 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/fields', authenticate, fieldController.getDocumentFields);

router.put('/:id/fields', authenticate, fieldController.saveDocumentFields);

router.post('/:id/void', authenticate, documentController.voidDocument);

router.post('/:id/resend', authenticate, documentController.resendDocument);

router.delete('/:id', authenticate, documentController.deleteDocument);

router.get('/:id/recipients', authenticate, async (req, res, next) => {
  try {
    const { getRecipients } = await import('../services/recipient.service.js');
    const recipients = await getRecipients(req.params.id as string, req.user!.userId);
    res.json(recipients);
  } catch (err) { next(err); }
});

router.post('/:id/recipients', authenticate, async (req, res, next) => {
  try {
    const { addRecipients } = await import('../services/recipient.service.js');
    const recipients = await addRecipients(req.params.id as string, req.user!.userId, req.body.recipients ?? []);
    res.json(recipients);
  } catch (err) { next(err); }
});

export default router;
