import { prisma, DocumentStatus } from '@traza/database';
import { hashBuffer } from '@traza/crypto';
import { AppError } from '../middleware/error.middleware.js';
import * as storage from './storage.service.js';
import { generateStorageKey, validateMagicBytes } from '../utils/fileValidation.js';
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
  filters: { status?: DocumentStatus; page?: number; limit?: number },
) {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    ownerId: userId,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { signatures: true } },
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

export async function deleteDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.status === 'SIGNED') {
    throw new AppError(400, 'CANNOT_DELETE', 'Cannot delete a signed document');
  }

  // Delete from S3
  await storage.deleteFile(document.fileUrl);

  // Delete from DB (cascades to signatures, audit logs)
  await prisma.document.delete({ where: { id } });

  return { deleted: true };
}
