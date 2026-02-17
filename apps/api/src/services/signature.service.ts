import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { generateSigningToken, verifySigningToken } from '../utils/signingToken.js';
import { getEnv } from '../config/env.js';
import { sendSignatureRequestEmail, sendDocumentCompletedEmail } from './email.service.js';

interface SignerInput {
  email: string;
  name: string;
  order?: number;
}

interface SendForSigningInput {
  documentId: string;
  userId: string;
  signers: SignerInput[];
  message?: string;
  expiresInDays?: number;
}

export async function sendForSigning({
  documentId,
  userId,
  signers,
  expiresInDays = 7,
}: SendForSigningInput) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.status !== 'DRAFT') {
    throw new AppError(400, 'INVALID_STATUS', 'Document must be in DRAFT status to send for signing');
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const env = getEnv();

  // Create signature records and tokens
  const signatureRecords = await Promise.all(
    signers.map(async (signer, index) => {
      const signature = await prisma.signature.create({
        data: {
          documentId,
          signerEmail: signer.email.toLowerCase(),
          signerName: signer.name,
          order: signer.order ?? index + 1,
          token: '', // Placeholder, will be updated
          tokenExpiresAt: expiresAt,
          status: 'PENDING',
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

      // Update with actual token
      await prisma.signature.update({
        where: { id: signature.id },
        data: { token },
      });

      return {
        id: signature.id,
        signerEmail: signer.email,
        signerName: signer.name,
        signingUrl: `${env.APP_URL}/sign/${token}`,
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

  // Update document status
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PENDING', expiresAt },
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

  // Send emails to signers (fire-and-forget, don't block on failure)
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const senderName = owner?.name || 'Someone';

  for (const record of signatureRecords) {
    sendSignatureRequestEmail({
      to: record.signerEmail,
      recipientName: record.signerName,
      senderName,
      documentTitle: document.title,
      signingUrl: record.signingUrl,
      expiresAt,
    }).catch((err) => {
      console.error(`[email] Failed to send signature request to ${record.signerEmail}:`, err);
    });
  }

  return { signatures: signatureRecords };
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

  // Audit log
  await prisma.auditLog.create({
    data: {
      documentId: payload.documentId,
      eventType: 'document.signed',
      metadata: {
        signerEmail: signature.signerEmail,
        signatureType,
        ipAddress,
        ...(fieldValues ? { fieldCount: fieldValues.length } : {}),
      },
    },
  });

  // Check if all signatures are complete
  const allSignatures = await prisma.signature.findMany({
    where: { documentId: payload.documentId },
  });

  const allSigned = allSignatures.every((s) => s.status === 'SIGNED');

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
        },
      },
    });

    // Send completion email to document owner
    const doc = await prisma.document.findUnique({
      where: { id: payload.documentId },
      include: { owner: { select: { email: true, name: true } } },
    });
    if (doc?.owner) {
      const env = getEnv();
      sendDocumentCompletedEmail({
        to: doc.owner.email,
        recipientName: doc.owner.name || 'there',
        documentTitle: doc.title,
        completedAt: new Date(),
        totalSigners: allSignatures.length,
        downloadUrl: `${env.APP_URL}/documents/${doc.id}`,
      }).catch((err) => {
        console.error(`[email] Failed to send completion email:`, err);
      });
    }
  }

  return {
    signed: true,
    documentCompleted: allSigned,
  };
}

export async function declineSignature(token: string, reason?: string) {
  const payload = verifySigningToken(token);

  const signature = await prisma.signature.findUnique({ where: { token } });

  if (!signature || signature.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot decline this signature');
  }

  await prisma.signature.update({
    where: { id: signature.id },
    data: { status: 'DECLINED' },
  });

  await prisma.auditLog.create({
    data: {
      documentId: payload.documentId,
      eventType: 'document.declined',
      metadata: { signerEmail: signature.signerEmail, reason },
    },
  });

  return { declined: true };
}

export async function getDocumentSignatures(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

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
      createdAt: true,
    },
    orderBy: { order: 'asc' },
  });

  return signatures;
}
