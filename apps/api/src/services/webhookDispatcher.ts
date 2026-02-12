import crypto from 'node:crypto';
import { prisma } from '@traza/database';

export async function dispatchEvent(
  documentOwnerId: string,
  eventType: string,
  documentId: string,
  payload: Record<string, unknown>,
) {
  // Find matching webhooks
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId: documentOwnerId,
      isActive: true,
      events: { has: eventType },
    },
  });

  for (const webhook of webhooks) {
    const deliveryPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: { documentId, ...payload },
    };

    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload: deliveryPayload,
        attempts: 0,
      },
    });

    // Fire and forget — async delivery
    deliverWebhook(delivery.id, webhook.url, webhook.secret, deliveryPayload).catch(
      (err) => console.error(`Webhook delivery failed: ${delivery.id}`, err),
    );
  }
}

async function deliverWebhook(
  deliveryId: string,
  url: string,
  secret: string,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Traza-Signature': `sha256=${signature}`,
        'X-Traza-Event': payload.event as string,
        'X-Traza-Delivery': deliveryId,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        responseCode: response.status,
        responseBody: (await response.text()).slice(0, 1000),
        attempts: { increment: 1 },
        deliveredAt: response.ok ? new Date() : null,
        nextRetryAt: response.ok
          ? null
          : new Date(Date.now() + getRetryDelay(1)),
      },
    });
  } catch (err) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: { increment: 1 },
        responseBody: err instanceof Error ? err.message : 'Unknown error',
        nextRetryAt: new Date(Date.now() + getRetryDelay(1)),
      },
    });
  }
}

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1min, 5min, 30min
  const delays = [60_000, 300_000, 1_800_000];
  return delays[Math.min(attempt - 1, delays.length - 1)] ?? 60_000;
}
