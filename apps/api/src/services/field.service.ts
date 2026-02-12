import { prisma, FieldType } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { verifySigningToken } from '../utils/signingToken.js';

interface FieldInput {
  fieldType: FieldType;
  signerEmail: string;
  signerName?: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  required: boolean;
  label?: string;
  order: number;
}

export async function getDocumentFields(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  const fields = await prisma.documentField.findMany({
    where: { documentId },
    orderBy: [{ page: 'asc' }, { order: 'asc' }],
  });

  return fields;
}

export async function saveDocumentFields(
  documentId: string,
  userId: string,
  fields: FieldInput[],
) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });

  if (!document || document.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }

  if (document.status !== 'DRAFT' && document.status !== 'PENDING') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Fields can only be modified on DRAFT or PENDING documents',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete all existing fields for this document
    await tx.documentField.deleteMany({ where: { documentId } });

    // Bulk create new fields
    const created = await tx.documentField.createManyAndReturn({
      data: fields.map((field) => ({
        documentId,
        fieldType: field.fieldType,
        signerEmail: field.signerEmail,
        signerName: field.signerName ?? null,
        page: field.page,
        positionX: field.positionX,
        positionY: field.positionY,
        width: field.width,
        height: field.height,
        required: field.required,
        label: field.label ?? null,
        order: field.order,
      })),
    });

    return created;
  });

  return result;
}

export async function getSignerFields(token: string) {
  const payload = verifySigningToken(token);

  const signature = await prisma.signature.findUnique({
    where: { token },
  });

  if (!signature) {
    throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
  }

  if (signature.tokenExpiresAt < new Date()) {
    throw new AppError(410, 'EXPIRED', 'This signing link has expired');
  }

  const fields = await prisma.documentField.findMany({
    where: {
      documentId: payload.documentId,
      signerEmail: signature.signerEmail,
    },
    orderBy: [{ page: 'asc' }, { order: 'asc' }],
  });

  return fields;
}
