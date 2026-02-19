import { prisma, DocumentStatus } from '@traza/database';
import { hashBuffer } from '@traza/crypto';
import { AppError } from '../middleware/error.middleware.js';
import * as storage from './storage.service.js';
import { generateStorageKey, validateMagicBytes } from '../utils/fileValidation.js';
import { sendExpirationNoticeEmail } from './email.service.js';
import { getEnv } from '../config/env.js';
import path from 'node:path';

interface CreateDocumentInput {
  userId: string;
  file: Express.Multer.File;
  title: string;
}

export async function createDocument({ userId, file, title }: CreateDocumentInput) {
  // Validate magic bytes
  const ext = path.extname(file.originalname);
  if (!validateMagicBytes(file.buffer, ext)) {
    throw new AppError(400, 'INVALID_FILE', 'File content does not match its extension');
  }

  // Hash the document
  const fileHash = hashBuffer(file.buffer);

  // Upload to S3
  const storageKey = generateStorageKey(userId, file.originalname);
  await storage.uploadFile(file.buffer, storageKey, file.mimetype);

  // Create database record
  const document = await prisma.document.create({
    data: {
      ownerId: userId,
      title,
      fileUrl: storageKey,
      fileHash,
      status: 'DRAFT',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      documentId: document.id,
      eventType: 'document.created',
      actorId: userId,
      metadata: { title, fileHash, originalName: file.originalname },
    },
  });

  return {
    id: document.id,
    title: document.title,
    fileHash: document.fileHash,
    status: document.status,
    createdAt: document.createdAt,
  };
}

export async function getDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      signatures: {
        select: {
          id: true,
          signerEmail: true,
          signerName: true,
          status: true,
          signedAt: true,
          order: true,
          declineReason: true,
        },
        orderBy: { order: 'asc' },
      },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 30,
        select: {
          id: true,
          eventType: true,
          metadata: true,
          timestamp: true,
          actorId: true,
        },
      },
    },
  });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  return document;
}

export async function listDocuments(
  userId: string,
  filters: { status?: DocumentStatus; page?: number; limit?: number; search?: string; tagId?: string },
) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    ownerId: userId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { title: { contains: filters.search, mode: 'insensitive' as const } } : {}),
    ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { signatures: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total, page, limit };
}

export async function getDownloadUrl(id: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  const downloadUrl = await storage.generatePresignedUrl(document.fileUrl);

  // Log access
  await prisma.auditLog.create({
    data: {
      documentId: id,
      eventType: 'document.downloaded',
      actorId: userId,
    },
  });

  return { downloadUrl };
}

export async function voidDocument(id: string, userId: string, reason?: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      signatures: {
        where: { status: 'PENDING' },
        select: { id: true, signerEmail: true, signerName: true, token: true },
      },
    },
  });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Only pending documents can be voided');
  }

  const env = getEnv();

  await prisma.$transaction(async (tx) => {
    // Mark document as VOID
    await tx.document.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidReason: reason ?? null,
      },
    });

    // Mark all pending signatures as DECLINED
    await tx.signature.updateMany({
      where: { documentId: id, status: 'PENDING' },
      data: { status: 'DECLINED' },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        documentId: id,
        eventType: 'document.voided',
        actorId: userId,
        metadata: { reason: reason ?? null, pendingSigners: document.signatures.length },
      },
    });
  });

  // Notify pending signers (fire-and-forget)
  const senderEmail = document.owner?.email ?? 'no-reply@traza.dev';
  for (const sig of document.signatures) {
    sendExpirationNoticeEmail({
      to: sig.signerEmail,
      recipientName: sig.signerName,
      documentTitle: document.title,
      expiredAt: new Date(),
      senderEmail,
    }).catch((err) => {
      console.warn(`[email] Failed to notify signer of void:`, err.message);
    });
  }

  return { voided: true };
}

export async function resendDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      fields: true,
    },
  });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (!['PENDING', 'EXPIRED', 'VOID', 'SIGNED'].includes(document.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot resend a DRAFT document — send it first');
  }

  const newDocument = await prisma.$transaction(async (tx) => {
    // Void original if still PENDING
    if (document.status === 'PENDING') {
      await tx.document.update({
        where: { id },
        data: { status: 'VOID', voidedAt: new Date(), voidReason: 'Resent by owner' },
      });
      await tx.signature.updateMany({
        where: { documentId: id, status: 'PENDING' },
        data: { status: 'DECLINED' },
      });
    }

    // Create new DRAFT document with the same file
    const newDoc = await tx.document.create({
      data: {
        ownerId: userId,
        title: document.title,
        fileUrl: document.fileUrl,
        fileHash: document.fileHash,
        pageCount: document.pageCount,
        templateId: document.templateId,
        status: 'DRAFT',
      },
    });

    // Copy fields (positions preserved, signatures reset)
    if (document.fields.length > 0) {
      await tx.documentField.createMany({
        data: document.fields.map((f) => ({
          documentId: newDoc.id,
          signerEmail: f.signerEmail,
          signerName: f.signerName,
          fieldType: f.fieldType,
          page: f.page,
          positionX: f.positionX,
          positionY: f.positionY,
          width: f.width,
          height: f.height,
          required: f.required,
          label: f.label,
          order: f.order,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        documentId: newDoc.id,
        eventType: 'document.created',
        actorId: userId,
        metadata: { resendOf: id, title: document.title },
      },
    });

    return newDoc;
  });

  return { newDocumentId: newDocument.id };
}

export async function deleteDocument(
  id: string,
  userId: string,
  orgId?: string | null,
  orgRole?: string | null,
) {
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  // Allow: document owner/creator OR org admin/owner deleting a document in their org
  const isOwner = document.ownerId === userId || document.createdById === userId;
  const isOrgAdmin =
    orgId &&
    document.organizationId === orgId &&
    (orgRole === 'ADMIN' || orgRole === 'OWNER');

  if (!isOwner && !isOrgAdmin) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.status === 'SIGNED') {
    throw new AppError(400, 'CANNOT_DELETE', 'Cannot delete a signed document');
  }

  // Delete from S3
  await storage.deleteFile(document.fileUrl);
  if (document.pdfFileUrl && document.pdfFileUrl !== document.fileUrl) {
    await storage.deleteFile(document.pdfFileUrl).catch(() => {});
  }

  // Delete from DB (cascades to signatures, audit logs)
  await prisma.document.delete({ where: { id } });

  return { deleted: true };
}
