import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';

export interface TemplateFieldInput {
  signerRole: string;
  fieldType: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  required?: boolean;
  label?: string;
  order?: number;
}

export async function listTemplates(userId: string) {
  return prisma.template.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      pageCount: true,
      useCount: true,
      createdAt: true,
      _count: { select: { fields: true } },
    },
  });
}

export async function getTemplate(id: string, userId: string) {
  const template = await prisma.template.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });

  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  return template;
}

export async function createTemplate(
  userId: string,
  data: {
    name: string;
    description?: string;
    fileUrl: string;
    fileHash: string;
    pageCount?: number;
  },
) {
  return prisma.template.create({
    data: {
      ownerId: userId,
      name: data.name,
      description: data.description,
      fileUrl: data.fileUrl,
      fileHash: data.fileHash,
      pageCount: data.pageCount,
    },
  });
}

export async function updateTemplate(
  id: string,
  userId: string,
  data: { name?: string; description?: string },
) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  return prisma.template.update({
    where: { id },
    data,
  });
}

export async function deleteTemplate(id: string, userId: string) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  await prisma.template.delete({ where: { id } });
}

export async function saveTemplateFields(
  id: string,
  userId: string,
  fields: TemplateFieldInput[],
) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.templateField.deleteMany({ where: { templateId: id } });

    if (fields.length > 0) {
      await tx.templateField.createMany({
        data: fields.map((f, i) => ({
          templateId: id,
          signerRole: f.signerRole,
          fieldType: f.fieldType as any,
          page: f.page,
          positionX: f.positionX,
          positionY: f.positionY,
          width: f.width,
          height: f.height,
          required: f.required !== false,
          label: f.label,
          order: f.order ?? i,
        })),
      });
    }
  });

  return prisma.templateField.findMany({
    where: { templateId: id },
    orderBy: { order: 'asc' },
  });
}

/**
 * Create a Document from a Template — copies file + fields.
 * Returns the new document so caller can send it for signing.
 */
export async function createDocumentFromTemplate(
  templateId: string,
  userId: string,
  signerRoleMap: Record<string, string>, // { "Signer 1": "alice@example.com", ... }
) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { fields: true },
  });

  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  const document = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        ownerId: userId,
        templateId,
        title: template.name,
        fileUrl: template.fileUrl,
        fileHash: template.fileHash,
        pageCount: template.pageCount,
        status: 'DRAFT',
      },
    });

    // Copy template fields, mapping signerRole → signerEmail
    if (template.fields.length > 0) {
      await tx.documentField.createMany({
        data: template.fields.map((f) => ({
          documentId: doc.id,
          signerEmail: signerRoleMap[f.signerRole] ?? null,
          signerName: f.signerRole,
          fieldType: f.fieldType,
          page: f.page,
          positionX: f.positionX,
          positionY: f.positionY,
          width: f.width,
          height: f.height,
          required: f.required,
          label: f.label,
          order: f.order,
        })),
      });
    }

    // Increment use count
    await tx.template.update({
      where: { id: templateId },
      data: { useCount: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        documentId: doc.id,
        actorId: userId,
        eventType: 'document.created',
        metadata: { fromTemplate: templateId, templateName: template.name },
      },
    });

    return doc;
  });

  return document;
}

export async function bulkSendFromTemplate(
  templateId: string,
  userId: string,
  rows: Array<{
    signerRoleMap: Record<string, string>;
    signerNames?: Record<string, string>;
    message?: string;
    expiresInDays?: number;
  }>,
) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { fields: { select: { signerRole: true } } },
  });

  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  if (rows.length === 0) {
    throw new AppError(400, 'VALIDATION', 'At least one recipient row is required');
  }

  if (rows.length > 100) {
    throw new AppError(400, 'VALIDATION', 'Maximum 100 rows per bulk send');
  }

  const { sendForSigning } = await import('./signature.service.js');
  const roles = [...new Set(template.fields.map((f) => f.signerRole))].sort();

  const results = await Promise.allSettled(
    rows.map(async (row, i) => {
      const doc = await createDocumentFromTemplate(templateId, userId, row.signerRoleMap);

      const signers = roles
        .filter((role) => row.signerRoleMap[role])
        .map((role, idx) => ({
          email: row.signerRoleMap[role] as string,
          name: row.signerNames?.[role] || role,
          order: idx + 1,
        }));

      await sendForSigning({
        documentId: doc.id,
        userId,
        signers,
        message: row.message,
        expiresInDays: row.expiresInDays || 7,
      });

      return { row: i + 1, documentId: doc.id };
    }),
  );

  return results.map((r, i) => ({
    row: i + 1,
    success: r.status === 'fulfilled',
    documentId: r.status === 'fulfilled' ? r.value.documentId : undefined,
    error: r.status === 'rejected' ? (r.reason as Error)?.message : undefined,
  }));
}

export async function getTemplateSignerRoles(templateId: string, userId: string): Promise<string[]> {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { fields: { select: { signerRole: true } } },
  });

  if (!template || template.ownerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Template not found');
  }

  const roles = [...new Set(template.fields.map((f) => f.signerRole))];
  return roles.sort();
}
