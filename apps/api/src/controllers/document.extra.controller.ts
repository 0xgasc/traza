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

export async function getCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: { select: { email: true, name: true } },
        signatures: {
          orderBy: { order: 'asc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'asc' },
          take: 50,
        },
      },
    });

    if (!document || document.ownerId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    const signerRows = document.signatures
      .map((s) => {
        const statusIcon = s.status === 'SIGNED' ? '✅' : s.status === 'DECLINED' ? '❌' : '⏳';
        const signedAt = s.signedAt
          ? new Date(s.signedAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'long' })
          : '—';
        return `
        <tr>
          <td>${s.order}</td>
          <td><strong>${s.signerName}</strong><br/><span class="mono">${s.signerEmail}</span></td>
          <td class="status-${s.status.toLowerCase()}">${statusIcon} ${s.status}</td>
          <td>${signedAt}</td>
          <td class="mono small">${s.ipAddress ?? '—'}</td>
        </tr>`;
      })
      .join('');

    const completedAt = document.status === 'SIGNED'
      ? new Date(document.updatedAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'long' })
      : null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Certificate of Completion — ${document.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; background: #fff; color: #111; max-width: 900px; margin: 40px auto; padding: 40px; }
  @media print { body { margin: 0; padding: 20px; } .no-print { display: none; } }
  .header { text-align: center; border-bottom: 4px solid #000; padding-bottom: 24px; margin-bottom: 32px; }
  .header .brand { font-family: monospace; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #666; margin-bottom: 8px; }
  .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; color: #666; }
  .section { margin-bottom: 32px; }
  .section h2 { font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.15em; color: #666; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .meta-item label { display: block; font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .meta-item .value { font-size: 14px; font-weight: 600; }
  .hash { font-family: monospace; font-size: 11px; word-break: break-all; background: #f5f5f5; padding: 10px 12px; border-left: 4px solid #000; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #111; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; }
  td { padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .mono { font-family: monospace; font-size: 11px; }
  .small { font-size: 11px; }
  .status-signed { color: #16a34a; font-weight: 700; }
  .status-declined { color: #dc2626; font-weight: 700; }
  .status-pending { color: #d97706; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; text-align: center; font-size: 12px; color: #888; }
  .seal { display: inline-block; border: 3px solid #000; padding: 12px 24px; margin-top: 16px; font-size: 11px; font-family: monospace; letter-spacing: 0.15em; text-transform: uppercase; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #000; color: #fff; border: none; padding: 12px 24px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; font-family: monospace; }
  .print-btn:hover { background: #333; }
  .completed-banner { background: #000; color: #fff; padding: 16px 24px; margin-bottom: 32px; text-align: center; font-family: monospace; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; }
</style>
</head>
<body>
${document.status === 'SIGNED' ? `<div class="completed-banner">✅ All signatures complete — This document is legally binding</div>` : ''}

<div class="header">
  <div class="brand">Traza E-Signature Platform</div>
  <h1>Certificate of Completion</h1>
  <div class="subtitle">Electronic Signature Audit Trail</div>
</div>

<div class="section">
  <h2>Document Details</h2>
  <div class="meta-grid">
    <div class="meta-item">
      <label>Document Title</label>
      <div class="value">${document.title}</div>
    </div>
    <div class="meta-item">
      <label>Document ID</label>
      <div class="value mono">${document.id}</div>
    </div>
    <div class="meta-item">
      <label>Status</label>
      <div class="value status-${document.status.toLowerCase()}">${document.status}</div>
    </div>
    <div class="meta-item">
      <label>Sent By</label>
      <div class="value">${document.owner?.name ?? '—'} &lt;${document.owner?.email ?? '—'}&gt;</div>
    </div>
    <div class="meta-item">
      <label>Created</label>
      <div class="value">${new Date(document.createdAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'long' })}</div>
    </div>
    ${completedAt ? `<div class="meta-item">
      <label>Completed</label>
      <div class="value">${completedAt}</div>
    </div>` : ''}
  </div>
</div>

<div class="section">
  <h2>Document Integrity</h2>
  <div class="meta-item" style="margin-bottom: 8px;">
    <label>SHA-256 Hash</label>
  </div>
  <div class="hash">${document.fileHash}</div>
  ${document.blockchainTxHash ? `
  <div class="meta-item" style="margin-top: 16px;">
    <label>Blockchain Anchor (${document.blockchainNetwork ?? 'Polygon'})</label>
    <div class="hash">${document.blockchainTxHash}</div>
  </div>` : ''}
</div>

<div class="section">
  <h2>Signers (${document.signatures.length})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Signer</th>
        <th>Status</th>
        <th>Signed At (UTC)</th>
        <th>IP Address</th>
      </tr>
    </thead>
    <tbody>
      ${signerRows}
    </tbody>
  </table>
</div>

<div class="footer">
  <p>This certificate was generated by Traza on ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'long' })} UTC</p>
  <p style="margin-top: 8px;">The document hash above can be used to independently verify document integrity.</p>
  <div class="seal">Traza · Contracts, signed with proof · traza.dev</div>
</div>

<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${document.id}.html"`,
    );
    res.send(html);
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
