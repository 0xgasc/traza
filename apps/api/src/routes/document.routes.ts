import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import * as fieldController from '../controllers/field.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { upload } from '../config/multer.js';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import * as storage from '../services/storage.service.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  uploadLimiter,
  upload.single('file'),
  documentController.createDocument,
);

router.get('/', requireAuth, documentController.listDocuments);

router.get('/:id', requireAuth, documentController.getDocument);

router.get('/:id/download', requireAuth, documentController.getDownloadUrl);

router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string },
    });

    if (!document || document.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    const fileKey = document.pdfFileUrl || document.fileUrl;

    // Try to serve from local storage first (for dev)
    const buffer = await storage.getFileBuffer(fileKey);
    if (buffer) {
      const meta = await storage.getFileMetadata(fileKey);
      res.setHeader('Content-Type', meta?.contentType || 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      return;
    }

    // Fall back to presigned URL redirect
    const presignedUrl = await storage.generatePresignedUrl(fileKey);
    res.redirect(presignedUrl);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/fields', requireAuth, fieldController.getDocumentFields);

router.put('/:id/fields', requireAuth, fieldController.saveDocumentFields);

router.post('/:id/void', requireAuth, documentController.voidDocument);

router.delete('/:id', requireAuth, documentController.deleteDocument);

export default router;
