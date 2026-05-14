import { prisma } from '@traza/database';
import { sendDocumentCompletedEmail } from './email.service.js';
import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';
import { assertDocumentAccess } from '../utils/orgAccess.js';

export async function addRecipients(
  documentId: string,
  userId: string,
  recipients: Array<{ email: string; name: string }>,
) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  await assertDocumentAccess(raw, userId, 'write');

  await prisma.recipient.deleteMany({ where: { documentId } });

  if (recipients.length > 0) {
    await prisma.recipient.createMany({
      data: recipients.map((r) => ({
        documentId,
        email: r.email.toLowerCase().trim(),
        name: r.name.trim(),
      })),
    });
  }

  return prisma.recipient.findMany({ where: { documentId } });
}

export async function getRecipients(documentId: string, userId: string) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  await assertDocumentAccess(raw, userId, 'read');
  return prisma.recipient.findMany({ where: { documentId }, orderBy: { createdAt: 'asc' } });
}

/** Called when a document is fully signed — emails all CC recipients */
export async function notifyCcRecipients(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { name: true } },
      recipients: { where: { notifiedAt: null } },
    },
  });

  if (!doc || doc.recipients.length === 0) return;

  const env = getEnv();
  const downloadUrl = `${env.APP_URL}/documents/${documentId}`;

  for (const recipient of doc.recipients) {
    sendDocumentCompletedEmail({
      to: recipient.email,
      recipientName: recipient.name,
      documentTitle: doc.title,
      completedAt: new Date(),
      totalSigners: 0,
      downloadUrl,
    }).catch((err) => {
      logger.error(`[email] Failed to notify CC recipient ${recipient.email}:`, err);
    });

    await prisma.recipient.update({
      where: { id: recipient.id },
      data: { notifiedAt: new Date() },
    });
  }
}
