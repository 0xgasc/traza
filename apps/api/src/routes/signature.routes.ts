import { Router } from 'express';
import * as signatureController from '../controllers/signature.controller.js';
import * as fieldController from '../controllers/field.controller.js';
import { requireAuth, authenticate } from '../middleware/auth.middleware.js';
import { accessCodeLimiter } from '../middleware/rateLimit.middleware.js';
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

// Authenticated routes (document owner) — accepts Bearer JWT or X-API-Key
router.post(
  '/documents/:id/send',
  authenticate,
  validate(sendForSigningSchema),
  signatureController.sendForSigning,
);

router.get(
  '/documents/:id/signatures',
  authenticate,
  signatureController.getDocumentSignatures,
);

router.post(
  '/documents/:id/signatures/:signatureId/remind',
  authenticate,
  signatureController.remindSigner,
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
            fileHash: true,
            updatedAt: true,
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

    // Generate ETag from file hash
    const etag = `"${signature.document.fileHash}"`;
    const clientETag = req.headers['if-none-match'];

    // Check if client has cached version
    if (clientETag === etag) {
      return res.status(304).end();
    }

    // Proxy file through the API (works for both local storage and S3/MinIO)
    const buffer = await storage.getFileBuffer(fileKey);
    if (!buffer) throw new AppError(404, 'NOT_FOUND', 'Document file not found');

    const meta = await storage.getFileMetadata(fileKey);

    // Set aggressive caching headers since PDFs don't change (immutable content)
    res.setHeader('Content-Type', meta?.contentType || 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=3600, immutable');
    res.setHeader('Last-Modified', signature.document.updatedAt.toUTCString());
    res.send(buffer);
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

router.post('/sign/:token/access', accessCodeLimiter, async (req, res, next) => {
  try {
    const { verifyAccessCode } = await import('../services/signature.service.js');
    const result = await verifyAccessCode(req.params.token as string, req.body.code ?? '');
    res.json(result);
  } catch (err) { next(err); }
});

// Signer delegation: reassign to a different person
router.post('/sign/:token/delegate', async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email?.trim() || !name?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'email and name are required' } });
    }
    const { delegateSignature } = await import('../services/signature.service.js');
    const result = await delegateSignature(req.params.token as string, email.trim().toLowerCase(), name.trim());
    res.json(result);
  } catch (err) { next(err); }
});

// Get document owner branding for signing page (public)
router.get('/sign/:token/branding', async (req, res, next) => {
  try {
    const { verifySigningToken } = await import('../utils/signingToken.js');
    const payload = verifySigningToken(req.params.token!);
    const doc = await prisma.document.findUnique({
      where: { id: payload.documentId },
      select: {
        owner: {
          select: {
            brandingLogoUrl: true,
            brandingColor: true,
            name: true,
          },
        },
      },
    });
    const branding = (doc?.owner as { brandingLogoUrl?: string; brandingColor?: string; name?: string } | null) ?? {};

    // Set caching headers - branding rarely changes
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes

    res.json({
      logoUrl: branding.brandingLogoUrl ?? null,
      primaryColor: branding.brandingColor ?? null,
      ownerName: branding.name ?? null,
    });
  } catch (err) { next(err); }
});

export default router;
