import { prisma, FieldType } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { verifySigningToken } from '../utils/signingToken.js';
import { assertDocumentAccess } from '../utils/orgAccess.js';

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
  checkboxStyle?: string;
  order: number;
}

export async function getDocumentFields(documentId: string, userId: string) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  await assertDocumentAccess(raw, userId, 'read');

  const fields = await prisma.documentField.findMany({
    where: { documentId },
    orderBy: [{ page: 'asc' }, { order: 'asc' }],
  });

  // Coerce Prisma Decimal columns to plain numbers so the frontend can do
  // arithmetic on them without string-concat surprises.
  return fields.map((f) => ({
    ...f,
    positionX: Number(f.positionX),
    positionY: Number(f.positionY),
    width: Number(f.width),
    height: Number(f.height),
  }));
}

export async function saveDocumentFields(
  documentId: string,
  userId: string,
  fields: FieldInput[],
) {
  const raw = await prisma.document.findUnique({ where: { id: documentId } });
  const document = await assertDocumentAccess(raw, userId, 'write');

  if (document.status !== 'DRAFT' && document.status !== 'PENDING') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Fields can only be modified on DRAFT or PENDING documents',
    );
  }

  // Capture pre-edit snapshot for the audit trail
  const before = await prisma.documentField.findMany({
    where: { documentId },
    select: {
      id: true,
      fieldType: true,
      page: true,
      positionX: true,
      positionY: true,
      width: true,
      height: true,
      signerEmail: true,
      required: true,
      label: true,
    },
  });

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
        checkboxStyle: field.checkboxStyle ?? null,
        order: field.order,
      })),
    });

    // Audit trail: record what changed. Compare normalized snapshots — only
    // emit if there's a real diff (some clients re-save with no changes).
    const normalizeBefore = before.map((f) => ({
      fieldType: f.fieldType,
      page: f.page,
      x: Number(f.positionX),
      y: Number(f.positionY),
      w: Number(f.width),
      h: Number(f.height),
      signer: f.signerEmail,
      required: f.required,
      label: f.label,
    }));
    const normalizeAfter = fields.map((f) => ({
      fieldType: f.fieldType,
      page: f.page,
      x: f.positionX,
      y: f.positionY,
      w: f.width,
      h: f.height,
      signer: f.signerEmail,
      required: f.required,
      label: f.label ?? null,
    }));

    const sameLength = normalizeBefore.length === normalizeAfter.length;
    const changed =
      !sameLength ||
      normalizeBefore.some(
        (b, i) => JSON.stringify(b) !== JSON.stringify(normalizeAfter[i]),
      );

    if (changed) {
      await tx.auditLog.create({
        data: {
          documentId,
          eventType: 'document.fields_edited',
          actorId: userId,
          metadata: {
            documentStatus: document.status,
            fieldsBefore: normalizeBefore,
            fieldsAfter: normalizeAfter,
            countBefore: normalizeBefore.length,
            countAfter: normalizeAfter.length,
          },
        },
      });
    }

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

  // Fetch ALL fields for the document (not just current signer's)
  // This allows signers to see fields filled by others
  const fields = await prisma.documentField.findMany({
    where: {
      documentId: payload.documentId,
    },
    include: {
      fieldValue: {
        include: {
          signature: {
            select: {
              signerName: true,
              signerEmail: true,
              signedAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ page: 'asc' }, { order: 'asc' }],
  });

  // Map database field names to frontend expected names (percentages)
  return fields.map((field) => ({
    id: field.id,
    fieldType: field.fieldType,
    label: field.label,
    page: field.page,
    xPercent: Number(field.positionX),
    yPercent: Number(field.positionY),
    widthPercent: Number(field.width),
    heightPercent: Number(field.height),
    required: field.required,
    signerEmail: field.signerEmail,
    checkboxStyle: field.checkboxStyle,
    // Add fill status info
    isFilled: !!field.fieldValue,
    value: field.fieldValue?.value || null,
    filledBy: field.fieldValue?.signature.signerName || null,
    filledByEmail: field.fieldValue?.signature.signerEmail || null,
    filledAt: field.fieldValue?.filledAt || null,
    isCurrentSigner: field.signerEmail === signature.signerEmail,
    isReadOnly: field.signerEmail !== signature.signerEmail, // Can't edit other signers' fields
  }));
}
