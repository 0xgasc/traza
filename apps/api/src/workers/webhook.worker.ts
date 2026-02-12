import crypto from 'node:crypto';
import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [60_000, 300_000, 1_800_000, 3_600_000, 7_200_000]; // 1m, 5m, 30m, 1h, 2h

/**
 * Webhook retry worker.
 * Polls for failed deliveries and retries them with exponential backoff.
 * Run interval: every 60 seconds.
 */
export async function processFailedDeliveries() {
  const now = new Date();

  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      deliveredAt: null,
      attempts: { lt: MAX_ATTEMPTS },
      nextRetryAt: { lte: now },
    },
    include: {
      webhook: {
        select: { url: true, secret: true, isActive: true },
      },
    },
    take: 50,
    orderBy: { nextRetryAt: 'asc' },
  });

  if (pendingDeliveries.length === 0) return;

  logger.info(`Webhook retry: processing ${pendingDeliveries.length} deliveries`);

  for (const delivery of pendingDeliveries) {
    // Skip if webhook was deactivated
    if (!delivery.webhook.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { nextRetryAt: null, responseBody: 'Webhook deactivated' },
      });
      continue;
    }

    await retryDelivery(delivery.id, delivery.webhook.url, delivery.webhook.secret, delivery.payload as Record<string, unknown>, delivery.attempts);
  }
}

async function retryDelivery(
  deliveryId: string,
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  currentAttempts: number,
) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const attempt = currentAttempts + 1;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Traza-Signature': `sha256=${signature}`,
        'X-Traza-Event': payload.event as string,
        'X-Traza-Delivery': deliveryId,
        'X-Traza-Retry': attempt.toString(),
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const isSuccess = response.ok;
    const responseBody = (await response.text()).slice(0, 1000);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        responseCode: response.status,
        responseBody,
        attempts: attempt,
        deliveredAt: isSuccess ? new Date() : null,
        nextRetryAt: isSuccess ? null : getNextRetry(attempt),
      },
    });

    if (isSuccess) {
      logger.info(`Webhook delivered on retry`, { deliveryId, attempt });
    } else {
      logger.warn(`Webhook retry failed`, { deliveryId, attempt, status: response.status });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const nextRetry = getNextRetry(attempt);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: attempt,
        responseBody: errorMsg,
        nextRetryAt: attempt >= MAX_ATTEMPTS ? null : nextRetry,
      },
    });

    if (attempt >= MAX_ATTEMPTS) {
      logger.error(`Webhook delivery permanently failed`, { deliveryId, attempt, error: errorMsg });
    } else {
      logger.warn(`Webhook retry error, will retry`, { deliveryId, attempt, nextRetry, error: errorMsg });
    }
  }
}

function getNextRetry(attempt: number): Date | null {
  if (attempt >= MAX_ATTEMPTS) return null;
  const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)] ?? 60_000;
  return new Date(Date.now() + delay);
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startWebhookWorker() {
  logger.info('Webhook retry worker started (60s interval)');
  // Run immediately, then every 60s
  processFailedDeliveries().catch((err) =>
    logger.error('Webhook worker error', { error: err.message }),
  );
  intervalId = setInterval(() => {
    processFailedDeliveries().catch((err) =>
      logger.error('Webhook worker error', { error: err.message }),
    );
  }, 60_000);
}

export function stopWebhookWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Webhook retry worker stopped');
  }
}
