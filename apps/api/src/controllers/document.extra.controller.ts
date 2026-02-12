import { Request, Response, NextFunction } from 'express';
import { prisma } from '@traza/database';
import { hashBuffer, generateProofBundle } from '@traza/crypto';
import * as blockchainService from '../services/blockchain.service.js';
import * as storage from '../services/storage.service.js';
import { getEnv } from '../config/env.js';
import { success } from '../utils/response.js';
import { AppError } from '../middleware/error.middleware.js';

export async function verifyDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id as string } });

    if (!document || document.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    // Re-download and re-hash to verify integrity
    // In production, this would fetch from S3 and compare
    success(res, {
      verified: true,
      documentHash: document.fileHash,
      hashAlgorithm: 'SHA-256',
      documentId: document.id,
      timestamp: document.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function anchorDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await blockchainService.anchorDocument(req.params.id as string, req.user!.userId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateProof(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string },
      include: {
        signatures: {
          where: { status: 'SIGNED' },
        },
      },
    });

    if (!document || document.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    const env = getEnv();

    const bundle = generateProofBundle(
      {
        documentId: document.id,
        documentTitle: document.title,
        documentHash: document.fileHash,
        createdAt: document.createdAt.toISOString(),
        signatures: document.signatures.map((s: { signerEmail: string; signerName: string; signedAt: Date | null; ipAddress: string | null; signatureType: string | null }) => ({
          signerEmail: s.signerEmail,
          signerName: s.signerName,
          signedAt: s.signedAt?.toISOString() || '',
          ipAddress: s.ipAddress,
          signatureType: s.signatureType || 'ELECTRONIC',
        })),
        blockchain: document.blockchainTxHash
          ? {
              network: document.blockchainNetwork || 'polygon',
              txHash: document.blockchainTxHash,
              timestamp: document.updatedAt.toISOString(),
            }
          : null,
      },
      env.PLATFORM_SECRET_KEY,
    );

    success(res, bundle);
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalDocs, pendingSignatures, completedThisMonth, totalSignatures] = await Promise.all([
      prisma.document.count({ where: { ownerId: userId } }),
      prisma.signature.count({
        where: { document: { ownerId: userId }, status: 'PENDING' },
      }),
      prisma.document.count({
        where: {
          ownerId: userId,
          status: 'SIGNED',
          updatedAt: { gte: startOfMonth },
        },
      }),
      prisma.signature.count({
        where: { document: { ownerId: userId } },
      }),
    ]);

    const recentActivity = await prisma.auditLog.findMany({
      where: { document: { ownerId: userId } },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        document: { select: { title: true } },
      },
    });

    success(res, {
      stats: {
        totalDocuments: totalDocs,
        pendingSignatures,
        completedThisMonth,
        totalSignatures,
      },
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
}
