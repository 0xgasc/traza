import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';

/**
 * Token cleanup worker.
 * Runs every 6 hours:
 *  - Deletes expired refresh tokens
 *  - Deletes expired signer magic tokens
 *  - Deletes old webhook deliveries (> 30 days, successfully delivered)
 */

export async function processTokenCleanup() {
  await Promise.all([
    cleanupRefreshTokens(),
    cleanupMagicTokens(),
    cleanupOldDeliveries(),
  ]);
}

async function cleanupRefreshTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  if (result.count > 0) {
    logger.info('Cleaned up expired refresh tokens', { count: result.count });
  }
}

async function cleanupMagicTokens() {
  const result = await prisma.signerMagicToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  });

  if (result.count > 0) {
    logger.info('Cleaned up expired/used magic tokens', { count: result.count });
  }
}

async function cleanupOldDeliveries() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.webhookDelivery.deleteMany({
    where: {
      deliveredAt: { not: null, lt: thirtyDaysAgo },
    },
  });

  if (result.count > 0) {
    logger.info('Cleaned up old webhook deliveries', { count: result.count });
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startTokenCleanupWorker() {
  logger.info('Token cleanup worker started (6h interval)');
  processTokenCleanup().catch((err) =>
    logger.error('Token cleanup worker error', { error: (err as Error).message }),
  );
  intervalId = setInterval(
    () => {
      processTokenCleanup().catch((err) =>
        logger.error('Token cleanup worker error', { error: (err as Error).message }),
      );
    },
    6 * 60 * 60 * 1000, // 6 hours
  );
}

export function stopTokenCleanupWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Token cleanup worker stopped');
  }
}
