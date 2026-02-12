import { prisma } from '@traza/database';
import { createBlockchainClient } from '@traza/crypto';
import { getEnv } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

function getClient() {
  const env = getEnv();
  if (!env.POLYGON_PRIVATE_KEY || !env.CONTRACT_ADDRESS) {
    throw new AppError(503, 'BLOCKCHAIN_NOT_CONFIGURED', 'Blockchain anchoring is not configured');
  }
  return createBlockchainClient({
    rpcUrl: env.POLYGON_RPC_URL,
    privateKey: env.POLYGON_PRIVATE_KEY,
    contractAddress: env.CONTRACT_ADDRESS,
  });
}

export async function anchorDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.blockchainTxHash) {
    throw new AppError(409, 'ALREADY_ANCHORED', 'Document is already anchored on blockchain');
  }

  const client = getClient();
  const { txHash } = await client.anchorHash(document.fileHash);

  await prisma.document.update({
    where: { id: documentId },
    data: {
      blockchainTxHash: txHash,
      blockchainNetwork: 'polygon',
    },
  });

  await prisma.auditLog.create({
    data: {
      documentId,
      eventType: 'document.anchored',
      actorId: userId,
      metadata: { txHash, network: 'polygon', fileHash: document.fileHash },
    },
  });

  return { txHash, network: 'polygon' };
}

export async function verifyOnChain(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (!document.blockchainTxHash) {
    return { anchored: false, txHash: null, timestamp: null };
  }

  const client = getClient();
  const result = await client.verifyOnChain(document.fileHash);

  return {
    anchored: result.anchored,
    txHash: document.blockchainTxHash,
    network: document.blockchainNetwork,
    timestamp: result.timestamp,
    anchor: result.anchor,
  };
}
