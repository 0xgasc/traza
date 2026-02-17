import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';
import { sendReminderEmail, sendExpirationNoticeEmail } from '../services/email.service.js';

/**
 * Reminder & expiration worker.
 * Runs every hour:
 *  - Sends reminder emails to pending signers whose documents expire within 48 hours
 *    (one reminder per signer, tracked via reminderSentAt)
 *  - Marks expired PENDING documents as EXPIRED
 */

export async function processRemindersAndExpirations() {
  await Promise.all([sendReminders(), expireDocuments()]);
}

async function sendReminders() {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find pending signatures on documents expiring within 48h, no reminder sent yet
  const pending = await prisma.signature.findMany({
    where: {
      status: 'PENDING',
      reminderSentAt: null,
      document: {
        status: 'PENDING',
        expiresAt: { lte: in48h, gt: now },
      },
    },
    include: {
      document: {
        include: {
          owner: { select: { name: true } },
        },
      },
    },
    take: 100,
  });

  if (pending.length === 0) return;

  logger.info(`Reminder worker: sending ${pending.length} reminder emails`);

  for (const sig of pending) {
    const doc = sig.document;
    const senderName = doc.owner?.name ?? 'The sender';

    try {
      await sendReminderEmail({
        to: sig.signerEmail,
        recipientName: sig.signerName,
        senderName,
        documentTitle: doc.title,
        signingUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/sign/${sig.token}`,
        expiresAt: doc.expiresAt!,
      });

      await prisma.signature.update({
        where: { id: sig.id },
        data: { reminderSentAt: new Date() },
      });

      logger.info(`Reminder sent`, { signatureId: sig.id, to: sig.signerEmail });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.warn(`Failed to send reminder`, { signatureId: sig.id, error: msg });
    }
  }
}

async function expireDocuments() {
  const now = new Date();

  // Find documents that should be expired
  const expiredDocs = await prisma.document.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    include: {
      owner: { select: { email: true } },
      signatures: {
        where: { status: 'PENDING' },
        select: { id: true, signerEmail: true, signerName: true },
      },
    },
    take: 50,
  });

  if (expiredDocs.length === 0) return;

  logger.info(`Expiration worker: expiring ${expiredDocs.length} documents`);

  for (const doc of expiredDocs) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { id: doc.id },
          data: { status: 'EXPIRED' },
        });

        // Mark remaining pending signatures as declined
        await tx.signature.updateMany({
          where: { documentId: doc.id, status: 'PENDING' },
          data: { status: 'DECLINED' },
        });

        await tx.auditLog.create({
          data: {
            documentId: doc.id,
            eventType: 'document.expired',
            metadata: { expiredAt: now.toISOString(), pendingSigners: doc.signatures.length },
          },
        });
      });

      // Notify pending signers of expiration
      const senderEmail = doc.owner?.email ?? 'no-reply@traza.dev';
      for (const sig of doc.signatures) {
        sendExpirationNoticeEmail({
          to: sig.signerEmail,
          recipientName: sig.signerName,
          documentTitle: doc.title,
          expiredAt: now,
          senderEmail,
        }).catch((err) => {
          logger.warn(`Failed to send expiration notice`, { error: (err as Error).message });
        });
      }

      logger.info(`Document expired`, { documentId: doc.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Failed to expire document`, { documentId: doc.id, error: msg });
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderWorker() {
  logger.info('Reminder & expiration worker started (1h interval)');
  processRemindersAndExpirations().catch((err) =>
    logger.error('Reminder worker error', { error: (err as Error).message }),
  );
  intervalId = setInterval(
    () => {
      processRemindersAndExpirations().catch((err) =>
        logger.error('Reminder worker error', { error: (err as Error).message }),
      );
    },
    60 * 60 * 1000, // 1 hour
  );
}

export function stopReminderWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Reminder & expiration worker stopped');
  }
}
