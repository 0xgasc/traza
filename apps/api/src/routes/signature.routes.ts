import { Router } from 'express';
import * as signatureController from '../controllers/signature.controller.js';
import * as fieldController from '../controllers/field.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  sendForSigningSchema,
  submitSignatureSchema,
  declineSignatureSchema,
} from '../validators/signature.validators.js';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import * as storage from '../services/storage.service.js';
import { verifySigningToken } from '../utils/signingToken.js';

const router = Router();

// Authenticated routes (document owner)
router.post(
  '/documents/:id/send',
  requireAuth,
  validate(sendForSigningSchema),
  signatureController.sendForSigning,
);

router.get(
  '/documents/:id/signatures',
  requireAuth,
  signatureController.getDocumentSignatures,
);

// Public routes (signer with token)
router.get('/sign/:token', signatureController.getSigningContext);

router.get('/sign/:token/pdf', async (req, res, next) => {
  try {
    const token = req.params.token as string;
    verifySigningToken(token);

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: {
        document: {
          select: {
            id: true,
            pdfFileUrl: true,
            fileUrl: true,
          },
        },
      },
    });

    if (!signature) {
      throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
    }

    if (signature.tokenExpiresAt < new Date()) {
      throw new AppError(410, 'EXPIRED', 'This signing link has expired');
    }

    const fileKey = signature.document.pdfFileUrl || signature.document.fileUrl;

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

router.get('/sign/:token/fields', fieldController.getSignerFields);

router.post(
  '/sign/:token',
  validate(submitSignatureSchema),
  signatureController.submitSignature,
);

router.post(
  '/sign/:token/decline',
  validate(declineSignatureSchema),
  signatureController.declineSignature,
);

export default router;
