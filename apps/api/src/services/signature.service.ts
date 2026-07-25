import { createHash } from 'node:crypto';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { generateSigningToken, verifySigningToken } from '../utils/signingToken.js';
import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';
import { sendSignatureRequestEmail, sendDocumentCompletedEmail, sendReminderEmail, sendSignatureDeclinedEmail, sendOtpEmail } from './email.service.js';
import { dispatchEvent } from './webhookDispatcher.js';
import { sendSigningLinkWhatsApp, sendOtpWhatsApp } from './whatsapp.service.js';
import { anchorDocumentToArweave } from './arweave.service.js';
import * as storage from './storage.service.js';
import { assertDocumentAccess } from '../utils/orgAccess.js';

interface SignerInput {
  email: string;
  name: string;
  order?: number;
  accessCode?: string;
  phone?: string;
  deliveryChannel?: 'EMAIL' | 'WHATSAPP' | 'BOTH';
  verificationLevel?: 'NONE' | 'EMAIL_OTP' | 'WHATSAPP_OTP';
}

interface SendForSigningInput {
  documentId: string;
  userId: string;
  signers: SignerInput[];
  message?: string;
  expiresInDays?: number;
  emailLocale?: string; // Language for email notifications (en, es)
}

export async function sendForSigning({
  documentId,
  userId,
  signers,
  message,
  expiresInDays = 7,
  emailLocale = 'en',
}: SendForSigningInput) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  const document = await assertDocumentAccess(raw, userId, 'write');

  if (document.status !== 'DRAFT') {
    throw new AppError(400, 'INVALID_STATUS', 'Document must be in DRAFT status to send for signing');
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const env = getEnv();

  // Create signature records and tokens
  const signatureRecords = await Promise.all(
    signers.map(async (signer, index) => {
      const order = signer.order ?? index + 1;

      // Use temporary UUID to avoid unique constraint collision
      const crypto = await import('crypto');
      const tempToken = crypto.randomUUID();

      const signature = await prisma.signature.create({
        data: {
          documentId,
          signerEmail: signer.email.toLowerCase(),
          signerName: signer.name,
          order,
          token: tempToken, // Temporary unique token
          tokenExpiresAt: expiresAt,
          status: 'PENDING',
          accessCode: signer.accessCode ?? null,
          signerPhone: signer.phone ?? null,
          deliveryChannel: signer.deliveryChannel ?? 'EMAIL',
          verificationLevel: signer.verificationLevel ?? 'NONE',
        },
      });

      // Generate JWT token for this signature
      const token = generateSigningToken(
        {
          signatureId: signature.id,
          documentId,
          signerEmail: signer.email,
        },
        expiresInDays,
      );

      // Update with actual JWT token
      await prisma.signature.update({
        where: { id: signature.id },
        data: { token },
      });

      return {
        id: signature.id,
        order,
        signerEmail: signer.email,
        signerName: signer.name,
        signerPhone: signer.phone,
        deliveryChannel: signer.deliveryChannel ?? 'EMAIL',
        signingUrl: `${env.APP_URL}/${emailLocale === 'es' ? 'es' : 'en'}/sign/${token}`,
      };
    }),
  );

  // Link DocumentFields to Signatures by matching signerEmail
  for (const record of signatureRecords) {
    await prisma.documentField.updateMany({
      where: {
        documentId,
        signerEmail: record.signerEmail.toLowerCase(),
      },
      data: {
        signatureId: record.id,
      },
    });
  }

  // Update document status and email locale
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: 'PENDING',
      expiresAt,
      emailLocale,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      documentId,
      eventType: 'document.sent',
      actorId: userId,
      metadata: {
        signers: signers.map((s) => s.email),
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  // Fire webhook
  dispatchEvent(userId, 'document.sent', documentId, {
    title: document.title,
    signers: signers.map((s) => ({ email: s.email, name: s.name })),
    expiresAt: expiresAt.toISOString(),
  }).catch((err) => logger.error('[webhook] document.sent dispatch failed:', err));

  // Send emails only to the FIRST signing group (sequential signing support)
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const senderName = owner?.name ?? 'Someone';

  const hasMultipleOrders = new Set(signatureRecords.map((r) => r.order)).size > 1;
  const minOrder = Math.min(...signatureRecords.map((r) => r.order));

  for (const record of signatureRecords) {
    // Only notify first-order signers now; others will be notified when it's their turn
    if (hasMultipleOrders && record.order !== minOrder) continue;

    // Email goes out unless the signer opted for WhatsApp-only delivery
    if (record.deliveryChannel !== 'WHATSAPP') {
      sendSignatureRequestEmail({
        to: record.signerEmail,
        recipientName: record.signerName,
        senderName,
        documentTitle: document.title,
        signingUrl: record.signingUrl,
        expiresAt,
        message, // Include custom message from sender
        locale: emailLocale, // Use document's email language
      }).catch((err) => {
        logger.error(`[email] Failed to send signature request to ${record.signerEmail}:`, err);
      });
    }

    if (record.signerPhone && record.deliveryChannel !== 'EMAIL') {
      sendSigningLinkWhatsApp({
        phone: record.signerPhone,
        signerName: record.signerName,
        senderName,
        documentTitle: document.title,
        signingUrl: record.signingUrl,
        locale: emailLocale,
      }).catch((err) => {
        logger.error(`[whatsapp] Failed to send signing link to ${record.signerPhone}:`, err);
      });
    }
  }

  return { signatures: signatureRecords };
}

export async function remindPendingSigners(documentId: string, userId: string) {
  const raw = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { name: true } },
    },
  });

  const document = await assertDocumentAccess(raw, userId, 'write');

  if (document.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Reminders can only be sent for PENDING documents');
  }

  // Email the signers whose turn it currently is — that's the lowest order
  // group that still has any PENDING signatures.
  const allSignatures = await prisma.signature.findMany({
    where: { documentId },
    orderBy: { order: 'asc' },
  });

  const currentOrder = allSignatures
    .filter((s) => s.status === 'PENDING')
    .map((s) => s.order)
    .reduce<number | null>((min, o) => (min === null || o < min ? o : min), null);

  if (currentOrder === null) {
    throw new AppError(400, 'NO_PENDING_SIGNERS', 'No pending signers to remind');
  }

  const toRemind = allSignatures.filter(
    (s) => s.status === 'PENDING' && s.order === currentOrder,
  );

  const env = getEnv();
  const senderName = document.owner?.name ?? 'Someone';

  const results = await Promise.allSettled(
    toRemind.map((sig) =>
      sendSignatureRequestEmail({
        to: sig.signerEmail,
        recipientName: sig.signerName,
        senderName,
        documentTitle: document.title,
        signingUrl: `${env.APP_URL}/en/sign/${sig.token}`,
        expiresAt: sig.tokenExpiresAt,
        locale: document.emailLocale ?? 'en',
      }),
    ),
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  await prisma.auditLog.create({
    data: {
      documentId,
      eventType: 'document.reminded',
      actorId: userId,
      metadata: {
        signers: toRemind.map((s) => s.signerEmail),
        sent,
        failed,
      },
    },
  });

  return { sent, failed, recipients: toRemind.map((s) => s.signerEmail) };
}

export async function getSigningContext(token: string) {
  const payload = verifySigningToken(token);

  const signature = await prisma.signature.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          fileUrl: true,
          fileHash: true,
          status: true,
        },
      },
    },
  });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
  }

  if (signature.document.status === 'VOID') {
    throw new AppError(410, 'VOIDED', 'This document has been voided by the sender');
  }

  if (signature.status === 'SIGNED') {
    throw new AppError(400, 'ALREADY_SIGNED', 'This document has already been signed');
  }

  if (signature.status === 'DECLINED') {
    throw new AppError(400, 'DECLINED', 'This signature request was declined');
  }

  if (signature.tokenExpiresAt < new Date()) {
    throw new AppError(410, 'EXPIRED', 'This signing link has expired');
  }

  // Check sequential signing order: are all previous signers done?
  const allSignatures = await prisma.signature.findMany({
    where: { documentId: signature.documentId },
    select: { id: true, order: true, status: true },
    orderBy: { order: 'asc' },
  });

  const hasManyOrders = new Set(allSignatures.map((s) => s.order)).size > 1;
  let waitingForPreviousSigners = false;

  if (hasManyOrders) {
    const previousSigners = allSignatures.filter((s) => s.order < signature.order);
    waitingForPreviousSigners = previousSigners.some((s) => s.status === 'PENDING');
  }

  // Log view (only if it's their turn)
  if (!waitingForPreviousSigners) {
    await prisma.auditLog.create({
      data: {
        documentId: payload.documentId,
        eventType: 'document.viewed',
        metadata: { signerEmail: signature.signerEmail },
      },
    });
  }

  return {
    signatureId: signature.id,
    documentTitle: signature.document.title,
    signerEmail: signature.signerEmail,
    signerName: signature.signerName,
    status: signature.status,
    waitingForPreviousSigners,
    requiresAccessCode: Boolean(signature.accessCode) && !signature.accessCodeVerifiedAt,
    verificationLevel: signature.verificationLevel,
    otpVerified: Boolean(signature.otpVerifiedAt),
  };
}

export async function submitSignature(
  token: string,
  signatureData: string | null,
  signatureType: 'drawn' | 'typed' | 'uploaded',
  ipAddress: string | null,
  userAgent: string | null,
  fieldValues?: Array<{ fieldId: string; value: string }>,
) {
  const payload = verifySigningToken(token);

  const signature = await prisma.signature.findUnique({
    where: { token },
  });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
  }

  if (signature.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'This signature is no longer pending');
  }

  if (signature.tokenExpiresAt < new Date()) {
    throw new AppError(410, 'EXPIRED', 'This signing link has expired');
  }

  // Access-code and OTP gates — enforced server-side; the client-side
  // steps alone are not a security boundary
  if (signature.accessCode && !signature.accessCodeVerifiedAt) {
    throw new AppError(403, 'ACCESS_CODE_REQUIRED', 'Access code verification is required before signing');
  }
  if (signature.verificationLevel !== 'NONE' && !signature.otpVerifiedAt) {
    throw new AppError(403, 'OTP_REQUIRED', 'Identity verification is required before signing');
  }

  // Enforce signing order: block if previous signers haven't signed yet
  const siblingSignatures = await prisma.signature.findMany({
    where: { documentId: payload.documentId },
    select: { id: true, order: true, status: true },
  });

  const hasManyOrders = new Set(siblingSignatures.map((s) => s.order)).size > 1;
  if (hasManyOrders) {
    const previousPending = siblingSignatures.some(
      (s) => s.order < signature.order && s.status === 'PENDING',
    );
    if (previousPending) {
      throw new AppError(
        409,
        'AWAITING_PREVIOUS_SIGNERS',
        'Previous signers must complete before you can sign',
      );
    }
  }

  // SECURITY: Validate all field IDs belong to this document before processing
  if (fieldValues && fieldValues.length > 0) {
    const fieldIds = fieldValues.map((fv) => fv.fieldId);
    const documentFields = await prisma.documentField.findMany({
      where: {
        id: { in: fieldIds },
        documentId: payload.documentId,
        signerEmail: signature.signerEmail,
      },
      select: { id: true },
    });

    const validFieldIds = new Set(documentFields.map((f) => f.id));
    const invalidFields = fieldIds.filter((id) => !validFieldIds.has(id));

    if (invalidFields.length > 0) {
      throw new AppError(
        400,
        'INVALID_FIELDS',
        `Invalid field IDs: ${invalidFields.join(', ')}. Fields must belong to this document and signer.`,
      );
    }
  }

  // Use a transaction to update signature and create field values atomically
  await prisma.$transaction(async (tx) => {
    // Update signature
    await tx.signature.update({
      where: { id: signature.id },
      data: {
        ...(signatureData ? { signatureData } : {}),
        signatureType: 'ELECTRONIC',
        status: 'SIGNED',
        signedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    // Create FieldValue records and link DocumentFields if fieldValues provided
    if (fieldValues && fieldValues.length > 0) {
      for (const fv of fieldValues) {
        await tx.fieldValue.create({
          data: {
            fieldId: fv.fieldId,
            signatureId: signature.id,
            value: fv.value,
          },
        });

        await tx.documentField.update({
          where: { id: fv.fieldId },
          data: { signatureId: signature.id },
        });
      }
    }
  });

  // Link signer account if one exists for this email
  const signerUser = await prisma.user.findFirst({
    where: { email: signature.signerEmail, isSignerAccount: true },
    select: { id: true },
  });
  if (signerUser) {
    await prisma.signature.update({
      where: { id: signature.id },
      data: { signerUserId: signerUser.id },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      documentId: payload.documentId,
      eventType: 'document.signed',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      metadata: {
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        signatureType,
        ipAddress,
        userAgent,
        ...(fieldValues ? { fieldCount: fieldValues.length } : {}),
      },
    },
  });

  // Check completion and trigger next-signer emails for sequential workflows
  const allSignatures = await prisma.signature.findMany({
    where: { documentId: payload.documentId },
    include: { document: { include: { owner: { select: { id: true, name: true } } } } },
    orderBy: { order: 'asc' },
  });

  const allSigned = allSignatures.every((s) => s.status === 'SIGNED');
  const documentOwnerId = allSignatures[0]?.document?.owner?.id;

  // Fire signature.signed webhook for every signing event
  if (documentOwnerId) {
    dispatchEvent(documentOwnerId, 'signature.signed', payload.documentId, {
      signerEmail: signature.signerEmail,
      signerName: signature.signerName,
      signedAt: new Date().toISOString(),
    }).catch((err) => logger.error('[webhook] signature.signed dispatch failed:', err));
  }

  if (allSigned) {
    await prisma.document.update({
      where: { id: payload.documentId },
      data: { status: 'SIGNED' },
    });

    await prisma.auditLog.create({
      data: {
        documentId: payload.documentId,
        eventType: 'document.completed',
        metadata: {
          totalSignatures: allSignatures.length,
          completedAt: new Date().toISOString(),
          signers: allSignatures.map((s) => ({
            name: s.signerName,
            email: s.signerEmail,
            signedAt: s.signedAt?.toISOString() || null,
            ip: s.ipAddress,
          })),
        },
      },
    });

    // Fire document.completed webhook
    if (documentOwnerId) {
      dispatchEvent(documentOwnerId, 'document.completed', payload.documentId, {
        totalSigners: allSignatures.length,
        completedAt: new Date().toISOString(),
      }).catch((err) => logger.error('[webhook] document.completed dispatch failed:', err));
    }

    // Send completion email to document owner
    const doc = await prisma.document.findUnique({
      where: { id: payload.documentId },
      include: { owner: { select: { email: true, name: true } } },
    });
    if (doc?.owner) {
      const env2 = getEnv();
      sendDocumentCompletedEmail({
        to: doc.owner.email,
        recipientName: doc.owner.name ?? 'there',
        documentTitle: doc.title,
        completedAt: new Date(),
        totalSigners: allSignatures.length,
        downloadUrl: `${env2.APP_URL}/documents/${doc.id}`,
        locale: doc.emailLocale || 'en',
        signers: allSignatures.map((s) => ({
          name: s.signerName,
          email: s.signerEmail,
          signedAt: s.signedAt?.toISOString() || null,
          ip: s.ipAddress,
        })),
      }).catch((err) => {
        logger.error(`[email] Failed to send completion email:`, err);
      });
    }

    // Notify CC recipients
    const { notifyCcRecipients } = await import('./recipient.service.js');
    notifyCcRecipients(payload.documentId).catch((err) => {
      logger.error('[cc] Failed to notify CC recipients:', err);
    });

    // Generate signed PDF with all signatures overlaid, certificate, then anchor to Arweave (fire and forget)
    const { generateSignedPdf } = await import('./pdfGenerator.service.js');
    generateSignedPdf(payload.documentId)
      .then(async (signedPdfBuffer) => {
        // Save signed PDF to storage
        const storageKey = `signed-pdfs/${payload.documentId}.pdf`;
        await storage.uploadFile(signedPdfBuffer, storageKey, 'application/pdf');

        // Update document with signed PDF URL
        await prisma.document.update({
          where: { id: payload.documentId },
          data: { pdfFileUrl: storageKey },
        });

        logger.info(`[pdfGenerator] Generated and saved signed PDF for document ${payload.documentId}`);

        // Generate Certificate of Completion
        const { saveCertificateToDocument } = await import('./certificate.service.js');
        await saveCertificateToDocument(payload.documentId).catch((err) => {
          logger.error('[certificate] Failed to generate certificate:', err);
        });

        // Now anchor the SIGNED PDF to Arweave (after it's ready)
        return anchorDocumentToArweave(payload.documentId);
      })
      .catch((err) => {
        logger.error('[pdfGenerator/arweave] Failed:', err);
      });
  } else {
    // Sequential signing: notify the next group of pending signers
    const pendingSignatures = allSignatures.filter((s) => s.status === 'PENDING');
    const hasMultipleOrders = new Set(allSignatures.map((s) => s.order)).size > 1;

    if (hasMultipleOrders && pendingSignatures.length > 0) {
      const nextOrder = Math.min(...pendingSignatures.map((s) => s.order));
      const nextSigners = pendingSignatures.filter((s) => s.order === nextOrder);

      // Only email next-order signers who were NOT emailed yet
      // (they have no reminderSentAt and this is their first turn)
      const docInfo = allSignatures[0]?.document;
      const senderName = docInfo?.owner?.name ?? 'Someone';
      const env3 = getEnv();

      for (const nextSig of nextSigners) {
        sendSignatureRequestEmail({
          to: nextSig.signerEmail,
          recipientName: nextSig.signerName,
          senderName,
          documentTitle: docInfo?.title ?? 'document',
          signingUrl: `${env3.APP_URL}/en/sign/${nextSig.token}`,
          expiresAt: nextSig.tokenExpiresAt,
          locale: docInfo?.emailLocale || 'en', // Use document's email language
        }).catch((err) => {
          logger.error(`[email] Failed to notify next signer ${nextSig.signerEmail}:`, err);
        });
      }
    }
  }

  return {
    signed: true,
    documentCompleted: allSigned,
  };
}

export async function declineSignature(
  token: string,
  reason?: string,
  ipAddress?: string | null,
  userAgent?: string | null
) {
  const payload = verifySigningToken(token);

  const signature = await prisma.signature.findUnique({ where: { token } });

  if (!signature || signature.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot decline this signature');
  }

  await prisma.signature.update({
    where: { id: signature.id },
    data: {
      status: 'DECLINED',
      ...(reason ? { declineReason: reason } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      documentId: payload.documentId,
      eventType: 'document.declined',
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      metadata: { signerEmail: signature.signerEmail, reason },
    },
  });

  // Notify the document owner
  const doc = await prisma.document.findUnique({
    where: { id: payload.documentId },
    include: { owner: { select: { id: true, email: true, name: true } } },
  });

  if (doc?.owner) {
    // Fire signature.declined webhook
    dispatchEvent(doc.owner.id, 'signature.declined', payload.documentId, {
      signerEmail: signature.signerEmail,
      signerName: signature.signerName,
      reason: reason ?? null,
      declinedAt: new Date().toISOString(),
    }).catch((err) => logger.error('[webhook] signature.declined dispatch failed:', err));

    const env = getEnv();
    sendSignatureDeclinedEmail({
      to: doc.owner.email,
      recipientName: doc.owner.name ?? 'there',
      documentTitle: doc.title,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      declinedAt: new Date(),
      reason,
      documentUrl: `${env.APP_URL}/documents/${doc.id}`,
      locale: doc.emailLocale || 'en', // Use document's email language
    }).catch((err) => {
      logger.error(`[email] Failed to send decline notification:`, err);
    });
  }

  return { declined: true };
}

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function remindSigner(documentId: string, signatureId: string, userId: string) {
  const raw = await prisma.document.findUnique({
    where: { id: documentId },
    include: { owner: { select: { name: true } } },
  });

  const document = await assertDocumentAccess(raw, userId, 'write');

  if (document.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Can only remind signers on pending documents');
  }

  const sig = await prisma.signature.findFirst({
    where: { id: signatureId, documentId },
  });

  if (!sig) {
    throw new AppError(404, 'NOT_FOUND', 'Signer not found');
  }

  if (sig.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Signer has already signed or declined');
  }

  // Enforce 24h cooldown to prevent spam
  if (sig.reminderSentAt && Date.now() - sig.reminderSentAt.getTime() < REMINDER_COOLDOWN_MS) {
    const nextAvailable = new Date(sig.reminderSentAt.getTime() + REMINDER_COOLDOWN_MS);
    throw new AppError(429, 'REMINDER_COOLDOWN', `Reminder already sent. Next reminder available at ${nextAvailable.toISOString()}`);
  }

  const env = getEnv();
  const senderName = document.owner?.name ?? 'Someone';

  await sendReminderEmail({
    to: sig.signerEmail,
    recipientName: sig.signerName,
    senderName,
    documentTitle: document.title,
    signingUrl: `${env.APP_URL}/en/sign/${sig.token}`,
    expiresAt: sig.tokenExpiresAt,
    locale: document.emailLocale || 'en', // Use document's email language
  });

  await prisma.signature.update({
    where: { id: sig.id },
    data: { reminderSentAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      documentId,
      eventType: 'document.reminded',
      actorId: userId,
      metadata: { signerEmail: sig.signerEmail },
    },
  });

  return { reminded: true, signerEmail: sig.signerEmail };
}

export async function getDocumentSignatures(documentId: string, userId: string) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  await assertDocumentAccess(raw, userId, 'read');

  const signatures = await prisma.signature.findMany({
    where: { documentId },
    select: {
      id: true,
      signerEmail: true,
      signerName: true,
      status: true,
      signedAt: true,
      signatureType: true,
      order: true,
      declineReason: true,
      delegatedToEmail: true,
      delegatedToName: true,
      createdAt: true,
    },
    orderBy: { order: 'asc' },
  });

  return signatures;
}

export async function delegateSignature(token: string, newEmail: string, newName: string) {
  const payload = verifySigningToken(token);

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(newEmail)) {
    throw new AppError(400, 'INVALID_EMAIL', 'Invalid email address format');
  }

  // Normalize email to lowercase
  newEmail = newEmail.toLowerCase();

  const signature = await prisma.signature.findUnique({
    where: { token },
    include: {
      document: {
        select: { id: true, title: true, ownerId: true, expiresAt: true },
      },
    },
  });

  if (!signature || signature.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot delegate: signature is not pending');
  }

  if (signature.tokenExpiresAt < new Date()) {
    throw new AppError(410, 'EXPIRED', 'This signing link has expired');
  }

  // Prevent delegation to the same email
  if (newEmail === signature.signerEmail.toLowerCase()) {
    throw new AppError(400, 'INVALID_DELEGATION', 'Cannot delegate to the same email address');
  }

  const env = getEnv();
  const expiresAt = signature.document.expiresAt ?? signature.tokenExpiresAt;

  // Generate a new token for the delegate
  const newToken = generateSigningToken(
    { signatureId: signature.id, documentId: payload.documentId, signerEmail: newEmail },
    Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  // Store original signer info before updating
  const originalEmail = signature.signerEmail;
  const originalName = signature.signerName;

  // Update the signature with the delegate's info
  await prisma.signature.update({
    where: { id: signature.id },
    data: {
      signerEmail: newEmail,
      signerName: newName,
      delegatedToEmail: newEmail,
      delegatedToName: newName,
      delegatedAt: new Date(),
      token: newToken,
      tokenExpiresAt: expiresAt,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      documentId: payload.documentId,
      eventType: 'document.delegated',
      metadata: {
        from: originalEmail,
        to: newEmail,
        originalSignerName: originalName,
        delegatedToName: newName,
        timestamp: new Date().toISOString(),
      },
    },
  });

  // Get owner info for notifications
  const owner = await prisma.user.findUnique({
    where: { id: signature.document.ownerId ?? '' },
    select: { name: true, email: true },
  });

  // SECURITY: Log delegation for audit purposes
  // TODO: Add dedicated email template for delegation notifications
  logger.info(`[delegation] Document owner notification: ${originalEmail} → ${newEmail} for "${signature.document.title}"`);

  // Send email to the new delegate
  sendSignatureRequestEmail({
    to: newEmail,
    recipientName: newName,
    senderName: owner?.name ?? 'Someone',
    documentTitle: signature.document.title,
    signingUrl: `${env.APP_URL}/en/sign/${newToken}`,
    expiresAt,
  }).catch((err) => {
    logger.error(`[email] Failed to notify delegate ${newEmail}:`, err);
  });

  return { delegated: true, newSignerEmail: newEmail };
}

export async function verifyAccessCode(token: string, code: string) {
  const signature = await prisma.signature.findUnique({ where: { token } });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature not found');
  }

  // SECURITY FIX: If no access code is set, this endpoint shouldn't be called
  // Return an error to prevent bypass
  if (!signature.accessCode) {
    throw new AppError(400, 'NO_CODE_REQUIRED', 'No access code required for this signature');
  }

  if (!code || code.trim() === '') {
    throw new AppError(400, 'CODE_REQUIRED', 'Access code is required');
  }

  // Constant-time comparison to prevent timing attacks
  if (signature.accessCode.length !== code.length) {
    throw new AppError(403, 'INVALID_CODE', 'Incorrect access code');
  }

  // Use crypto.timingSafeEqual for constant-time comparison
  const crypto = await import('crypto');
  const accessCodeBuffer = Buffer.from(signature.accessCode, 'utf8');
  const codeBuffer = Buffer.from(code, 'utf8');

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(accessCodeBuffer, codeBuffer);
  } catch {
    // Length mismatch or other error
    isValid = false;
  }

  if (!isValid) {
    throw new AppError(403, 'INVALID_CODE', 'Incorrect access code');
  }

  await prisma.signature.update({
    where: { id: signature.id },
    data: { accessCodeVerifiedAt: new Date() },
  });

  return { verified: true };
}

// ---------------------------------------------------------------------------
// OTP identity verification at signature (verificationLevel EMAIL_OTP /
// WHATSAPP_OTP). Codes are 6 digits, hashed at rest, 10-minute expiry,
// 5 attempts max. submitSignature refuses until otpVerifiedAt is set.
// ---------------------------------------------------------------------------

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string, signatureId: string): string {
  return createHash('sha256').update(`${signatureId}:${code}`).digest('hex');
}

export async function requestSigningOtp(token: string) {
  const signature = await prisma.signature.findUnique({
    where: { token },
    include: { document: { select: { emailLocale: true, title: true } } },
  });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
  }
  if (signature.verificationLevel === 'NONE') {
    throw new AppError(400, 'NO_OTP_REQUIRED', 'This signature does not require OTP verification');
  }
  if (signature.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'This signature is no longer pending');
  }
  if (signature.tokenExpiresAt < new Date()) {
    throw new AppError(410, 'EXPIRED', 'This signing link has expired');
  }

  const crypto = await import('crypto');
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const locale = signature.document.emailLocale ?? 'en';

  await prisma.signature.update({
    where: { id: signature.id },
    data: {
      otpHash: hashOtp(code, signature.id),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      otpAttempts: 0,
      otpVerifiedAt: null,
    },
  });

  const channel = signature.verificationLevel === 'WHATSAPP_OTP' ? 'whatsapp' : 'email';
  if (channel === 'whatsapp') {
    if (!signature.signerPhone) {
      throw new AppError(400, 'NO_PHONE', 'No phone number on file for WhatsApp verification');
    }
    await sendOtpWhatsApp({ phone: signature.signerPhone, code, locale });
  } else {
    await sendOtpEmail({
      to: signature.signerEmail,
      recipientName: signature.signerName,
      code,
      documentTitle: signature.document.title,
      locale,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  }

  await prisma.auditLog.create({
    data: {
      documentId: signature.documentId,
      eventType: 'signature.otp_requested',
      metadata: { signerEmail: signature.signerEmail, channel },
    },
  });

  return { sent: true, channel, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifySigningOtp(token: string, code: string) {
  const signature = await prisma.signature.findUnique({ where: { token } });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
  }
  if (signature.verificationLevel === 'NONE') {
    throw new AppError(400, 'NO_OTP_REQUIRED', 'This signature does not require OTP verification');
  }
  if (!signature.otpHash || !signature.otpExpiresAt) {
    throw new AppError(400, 'OTP_NOT_REQUESTED', 'Request a verification code first');
  }
  if (signature.otpExpiresAt < new Date()) {
    throw new AppError(410, 'OTP_EXPIRED', 'The verification code expired — request a new one');
  }
  if (signature.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(429, 'OTP_LOCKED', 'Too many attempts — request a new code');
  }
  if (!code || !/^\d{6}$/.test(code.trim())) {
    throw new AppError(400, 'CODE_REQUIRED', 'A 6-digit code is required');
  }

  // Count the attempt before comparing so failures can't be retried freely
  await prisma.signature.update({
    where: { id: signature.id },
    data: { otpAttempts: { increment: 1 } },
  });

  const crypto = await import('crypto');
  const expected = Buffer.from(signature.otpHash, 'hex');
  const received = Buffer.from(hashOtp(code.trim(), signature.id), 'hex');
  const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    throw new AppError(403, 'INVALID_CODE', 'Incorrect verification code');
  }

  await prisma.signature.update({
    where: { id: signature.id },
    data: { otpVerifiedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      documentId: signature.documentId,
      eventType: 'signature.otp_verified',
      metadata: {
        signerEmail: signature.signerEmail,
        channel: signature.verificationLevel === 'WHATSAPP_OTP' ? 'whatsapp' : 'email',
      },
    },
  });

  return { verified: true };
}
