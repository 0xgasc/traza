import { prisma, OrgRole } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';

export type AccessLevel = 'read' | 'write' | 'admin';

/**
 * Resolve every organization the user belongs to and their role in each.
 */
export async function getUserOrgRoles(
  userId: string,
): Promise<Map<string, OrgRole>> {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  return new Map(memberships.map((m) => [m.organizationId, m.role]));
}

/**
 * Throws 404 unless the user can access the given document at the requested level.
 *
 * - read: legacy owner OR any member of the doc's org
 * - write: legacy owner OR doc's createdBy OR org ADMIN/OWNER
 * - admin: legacy owner OR org ADMIN/OWNER
 *
 * Returns the document narrowed to non-null for ergonomic callsites.
 */
export async function assertDocumentAccess<
  T extends {
    ownerId: string | null;
    organizationId: string | null;
    createdById: string | null;
  },
>(document: T | null, userId: string, level: AccessLevel = 'read'): Promise<T> {
  if (!document) {
    throw new AppError(404, 'NOT_FOUND', 'Document not found');
  }
  if (document.ownerId === userId) return document;
  if (document.organizationId) {
    const orgs = await getUserOrgRoles(userId);
    const role = orgs.get(document.organizationId);
    if (role) {
      if (level === 'read') return document;
      const isAdminish = role === 'OWNER' || role === 'ADMIN';
      if (
        level === 'write' &&
        (isAdminish || document.createdById === userId)
      ) {
        return document;
      }
      if (level === 'admin' && isAdminish) return document;
    }
  }
  throw new AppError(404, 'NOT_FOUND', 'Document not found');
}

/**
 * The user's primary org (oldest membership), used as the default home for
 * newly-created documents/templates.
 */
export async function pickPrimaryOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMembership.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}
