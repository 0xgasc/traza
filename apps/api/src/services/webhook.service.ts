import crypto from 'node:crypto';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';

export async function createWebhook(userId: string, url: string, events: string[]) {
  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await prisma.webhook.create({
    data: { userId, url, events, secret },
  });

  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    secret, // Only shown once
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
  };
}

export async function listWebhooks(userId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { userId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
      secret: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Mask secrets
  return webhooks.map((w) => ({
    ...w,
    secret: `...${w.secret.slice(-4)}`,
  }));
}

export async function updateWebhook(
  id: string,
  userId: string,
  data: { url?: string; events?: string[]; isActive?: boolean },
) {
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Webhook not found');
  }

  return prisma.webhook.update({ where: { id }, data });
}

export async function deleteWebhook(id: string, userId: string) {
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Webhook not found');
  }

  await prisma.webhook.delete({ where: { id } });
  return { deleted: true };
}

export async function getDeliveries(webhookId: string, userId: string, page = 1, limit = 20) {
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!webhook || webhook.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Webhook not found');
  }

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.webhookDelivery.count({ where: { webhookId } }),
  ]);

  return { deliveries, total, page, limit };
}
