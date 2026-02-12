import { prisma } from '@traza/database';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware.js';
import { generateAccessToken, generateImpersonationToken } from '../utils/jwt.js';
import type { PlanTier, OrgStatus, PlatformRole, OrgRole } from '@traza/database';

// ============================================
// Organization Management
// ============================================

export interface ListOrgsParams {
  page?: number;
  limit?: number;
  status?: OrgStatus;
  planTier?: PlanTier;
  search?: string;
}

export async function listOrganizations(params: ListOrgsParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.planTier) {
    where.planTier = params.planTier;
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { slug: { contains: params.search, mode: 'insensitive' } },
      { billingEmail: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface CreateOrgInput {
  name: string;
  slug: string;
  planTier: PlanTier;
  ownerEmail: string;
  billingEmail?: string;
}

export async function createOrganization(input: CreateOrgInput, createdByUserId: string) {
  // Check if slug is available
  const existing = await prisma.organization.findUnique({
    where: { slug: input.slug },
  });

  if (existing) {
    throw new AppError(400, 'SLUG_EXISTS', 'Organization slug already exists');
  }

  // Find or create owner user
  let owner = await prisma.user.findUnique({
    where: { email: input.ownerEmail },
  });

  if (!owner) {
    // Create user account with temporary password (they'll need to reset)
    const tempPasswordHash = await import('bcryptjs').then(bcrypt =>
      bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
    );

    owner = await prisma.user.create({
      data: {
        email: input.ownerEmail,
        passwordHash: tempPasswordHash,
        name: input.ownerEmail.split('@')[0] || 'User',
        platformRole: 'USER',
      },
    });
  }

  // Create organization with owner membership
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      planTier: input.planTier,
      billingEmail: input.billingEmail ?? input.ownerEmail,
      status: 'ACTIVE',
      members: {
        create: {
          userId: owner.id,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: {
        select: { members: true, documents: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: createdByUserId,
      organizationId: organization.id,
      eventType: 'organization.created',
      resourceType: 'Organization',
      resourceId: organization.id,
      metadata: { planTier: input.planTier, createdBy: 'super_admin' },
    },
  });

  return organization;
}

export async function getOrganization(orgId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, name: true, platformRole: true, createdAt: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      _count: {
        select: { members: true, documents: true, invitations: true },
      },
    },
  });

  if (!organization) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  return organization;
}

export interface UpdateOrgInput {
  name?: string;
  planTier?: PlanTier;
  status?: OrgStatus;
  billingEmail?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export async function updateOrganization(orgId: string, input: UpdateOrgInput, actorId: string) {
  const organization = await prisma.organization.update({
    where: { id: orgId },
    data: input,
    include: {
      _count: {
        select: { members: true, documents: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId,
      organizationId: orgId,
      eventType: 'organization.updated',
      resourceType: 'Organization',
      resourceId: orgId,
      metadata: { changes: Object.keys(input) },
    },
  });

  return organization;
}

export async function suspendOrganization(orgId: string, reason: string, actorId: string) {
  const organization = await prisma.organization.update({
    where: { id: orgId },
    data: { status: 'SUSPENDED' },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId,
      organizationId: orgId,
      eventType: 'organization.suspended',
      resourceType: 'Organization',
      resourceId: orgId,
      metadata: { reason },
    },
  });

  return organization;
}

export async function deleteOrganization(orgId: string, actorId: string) {
  // Audit log first (before cascade delete removes org)
  await prisma.auditLog.create({
    data: {
      actorId,
      eventType: 'organization.deleted',
      resourceType: 'Organization',
      resourceId: orgId,
      metadata: { orgId },
    },
  });

  await prisma.organization.delete({
    where: { id: orgId },
  });
}

// ============================================
// User Management
// ============================================

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  platformRole?: PlatformRole;
}

export async function listUsers(params: ListUsersParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.platformRole) {
    where.platformRole = params.platformRole;
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { memberships: true, documents: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true, planTier: true, status: true },
          },
        },
      },
      _count: {
        select: { documents: true, webhooks: true },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return user;
}

export interface UpdateUserInput {
  name?: string;
  platformRole?: PlatformRole;
  isActive?: boolean;
}

export async function updateUser(userId: string, input: UpdateUserInput, actorId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      isActive: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId,
      eventType: 'user.updated',
      resourceType: 'User',
      resourceId: userId,
      metadata: { changes: Object.keys(input) },
    },
  });

  return user;
}

// ============================================
// Impersonation
// ============================================

export async function startImpersonation(
  adminUserId: string,
  targetUserId: string,
  reason: string,
) {
  // Get target user with their default org
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      memberships: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        include: { organization: true },
      },
    },
  });

  if (!targetUser) {
    throw new AppError(404, 'NOT_FOUND', 'Target user not found');
  }

  if (!targetUser.isActive) {
    throw new AppError(400, 'USER_INACTIVE', 'Cannot impersonate inactive user');
  }

  // Create impersonation session
  const session = await prisma.impersonationSession.create({
    data: {
      adminUserId,
      targetUserId,
      reason,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: adminUserId,
      eventType: 'impersonation.started',
      resourceType: 'User',
      resourceId: targetUserId,
      metadata: { reason, sessionId: session.id },
    },
  });

  const defaultMembership = targetUser.memberships[0];

  // Generate impersonation token
  const accessToken = generateImpersonationToken({
    userId: targetUser.id,
    email: targetUser.email,
    platformRole: targetUser.platformRole,
    orgId: defaultMembership?.organizationId ?? null,
    orgRole: defaultMembership?.role ?? null,
    isImpersonating: true,
    realUserId: adminUserId,
    impersonationSessionId: session.id,
  });

  return {
    accessToken,
    sessionId: session.id,
    targetUser: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
    },
  };
}

export async function endImpersonation(sessionId: string, realUserId: string) {
  // Update session
  const session = await prisma.impersonationSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  if (session.adminUserId !== realUserId) {
    throw new AppError(403, 'FORBIDDEN', 'Not your impersonation session');
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: realUserId,
      eventType: 'impersonation.ended',
      resourceType: 'ImpersonationSession',
      resourceId: sessionId,
    },
  });

  // Return admin's own token
  const admin = await prisma.user.findUnique({
    where: { id: realUserId },
    include: {
      memberships: {
        take: 1,
        include: { organization: true },
      },
    },
  });

  if (!admin) {
    throw new AppError(404, 'NOT_FOUND', 'Admin user not found');
  }

  return {
    accessToken: generateAccessToken({
      userId: admin.id,
      email: admin.email,
      platformRole: admin.platformRole,
      orgId: admin.memberships[0]?.organizationId ?? null,
      orgRole: admin.memberships[0]?.role ?? null,
    }),
  };
}

// ============================================
// Feature Flags
// ============================================

export async function listFeatureFlags() {
  return prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  enabledForAll?: boolean;
  enabledOrgIds?: string[];
  enabledPlanTiers?: PlanTier[];
}

export async function createFeatureFlag(input: CreateFeatureFlagInput) {
  const existing = await prisma.featureFlag.findUnique({
    where: { key: input.key },
  });

  if (existing) {
    throw new AppError(400, 'KEY_EXISTS', 'Feature flag key already exists');
  }

  return prisma.featureFlag.create({
    data: {
      key: input.key,
      name: input.name,
      description: input.description,
      enabled: input.enabled ?? false,
      enabledForAll: input.enabledForAll ?? false,
      enabledOrgIds: input.enabledOrgIds ?? [],
      enabledPlanTiers: input.enabledPlanTiers ?? [],
    },
  });
}

export async function updateFeatureFlag(flagId: string, input: Partial<CreateFeatureFlagInput>) {
  return prisma.featureFlag.update({
    where: { id: flagId },
    data: input,
  });
}

export async function deleteFeatureFlag(flagId: string) {
  await prisma.featureFlag.delete({
    where: { id: flagId },
  });
}

// Check if a feature flag is enabled for a specific org
export async function isFeatureEnabled(flagKey: string, orgId?: string, planTier?: PlanTier): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key: flagKey },
  });

  if (!flag || !flag.enabled) {
    return false;
  }

  if (flag.enabledForAll) {
    return true;
  }

  if (orgId && flag.enabledOrgIds.includes(orgId)) {
    return true;
  }

  if (planTier && flag.enabledPlanTiers.includes(planTier)) {
    return true;
  }

  return false;
}

// ============================================
// Audit Logs
// ============================================

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  eventType?: string;
  organizationId?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function listAuditLogs(params: ListAuditLogsParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 50, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.eventType) {
    where.eventType = params.eventType;
  }

  if (params.organizationId) {
    where.organizationId = params.organizationId;
  }

  if (params.actorId) {
    where.actorId = params.actorId;
  }

  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) {
      where.timestamp.gte = params.startDate;
    }
    if (params.endDate) {
      where.timestamp.lte = params.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: { id: true, email: true, name: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================
// Platform Analytics
// ============================================

export async function getPlatformAnalytics() {
  const [
    totalOrgs,
    totalUsers,
    totalDocuments,
    orgsByPlan,
    orgsByStatus,
    recentSignups,
    documentsByStatus,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.document.count(),
    prisma.organization.groupBy({
      by: ['planTier'],
      _count: { id: true },
    }),
    prisma.organization.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
    prisma.document.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  return {
    overview: {
      totalOrganizations: totalOrgs,
      totalUsers,
      totalDocuments,
      recentSignups,
    },
    organizations: {
      byPlan: orgsByPlan.reduce((acc, item) => {
        acc[item.planTier] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byStatus: orgsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    },
    documents: {
      byStatus: documentsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}
