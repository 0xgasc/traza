import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';

/**
 * GDPR Data Export - Right of Access (Article 15)
 * Returns all personal data associated with a user.
 */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      auditLogs: {
        select: {
          id: true,
          eventType: true,
          resourceType: true,
          resourceId: true,
          ipAddress: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return {
    exportedAt: new Date().toISOString(),
    format: 'GDPR_DATA_EXPORT_V1',
    personalData: {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      planTier: user.planTier,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    organizations: user.memberships.map((m) => ({
      organizationId: m.organization.id,
      organizationName: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    documents: user.documents,
    activityLog: user.auditLogs,
  };
}

/**
 * GDPR Account Deletion - Right to Erasure (Article 17)
 * Anonymizes personal data while preserving audit integrity.
 */
export async function deleteUserData(userId: string, confirmedByUser: boolean) {
  if (!confirmedByUser) {
    throw new AppError(400, 'CONFIRMATION_REQUIRED', 'You must confirm the deletion request');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  logger.warn('GDPR deletion requested', { userId, email: user.email });

  await prisma.$transaction(async (tx) => {
    // Remove refresh tokens
    await tx.refreshToken.deleteMany({ where: { userId } });

    // Remove org memberships
    await tx.orgMembership.deleteMany({ where: { userId } });

    // Remove pending invitations sent to this email
    await tx.orgInvitation.deleteMany({ where: { email: user.email } });

    // Anonymize audit logs (keep the log, remove PII)
    await tx.auditLog.updateMany({
      where: { actorId: userId },
      data: { actorId: null },
    });

    // Anonymize user record (don't delete to preserve document integrity)
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId.slice(0, 8)}@anonymized.traza.dev`,
        name: 'Deleted User',
        passwordHash: '',
        apiKeyHash: null,
        isActive: false,
        lastLoginAt: null,
      },
    });

    // Create audit record of the deletion
    await tx.auditLog.create({
      data: {
        eventType: 'gdpr.account_deleted',
        resourceType: 'User',
        resourceId: userId,
        metadata: {
          deletedAt: new Date().toISOString(),
          originalEmail: '[REDACTED]',
        },
      },
    });
  });

  logger.info('GDPR deletion completed', { userId });

  return { deleted: true, userId };
}
