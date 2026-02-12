import { prisma } from '@traza/database';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware.js';
import { generateAccessToken } from '../utils/jwt.js';
import type { OrgRole } from '@traza/database';

// ============================================
// Organization CRUD
// ============================================

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          planTier: true,
          logoUrl: true,
          primaryColor: true,
          _count: {
            select: { members: true, documents: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map(m => ({
    ...m.organization,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export interface CreateOrgInput {
  name: string;
  slug: string;
}

export async function createOrganization(input: CreateOrgInput, userId: string) {
  // Check if slug is available
  const existing = await prisma.organization.findUnique({
    where: { slug: input.slug },
  });

  if (existing) {
    throw new AppError(400, 'SLUG_EXISTS', 'Organization URL is already taken');
  }

  // Get user's current plan tier (for initial org plan)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planTier: true, email: true },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  // Create organization with user as OWNER
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      status: 'ACTIVE',
      planTier: user.planTier,
      billingEmail: user.email,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      _count: {
        select: { members: true, documents: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      organizationId: organization.id,
      eventType: 'organization.created',
      resourceType: 'Organization',
      resourceId: organization.id,
    },
  });

  return organization;
}

export async function getOrganization(orgId: string, userId: string) {
  const membership = await prisma.orgMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
    include: {
      organization: {
        include: {
          _count: {
            select: { members: true, documents: true, invitations: true },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'Organization not found');
  }

  return {
    ...membership.organization,
    currentUserRole: membership.role,
  };
}

export interface UpdateOrgInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  billingEmail?: string;
}

export async function updateOrganization(orgId: string, input: UpdateOrgInput, userId: string, userRole: OrgRole) {
  // Only ADMIN and OWNER can update org settings
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    throw new AppError(403, 'FORBIDDEN', 'Only admins can update organization settings');
  }

  // Billing email can only be changed by OWNER
  if (input.billingEmail && userRole !== 'OWNER') {
    throw new AppError(403, 'FORBIDDEN', 'Only owner can change billing email');
  }

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
      actorId: userId,
      organizationId: orgId,
      eventType: 'organization.updated',
      resourceType: 'Organization',
      resourceId: orgId,
      metadata: { changes: Object.keys(input) },
    },
  });

  return organization;
}

export async function deleteOrganization(orgId: string, userId: string, userRole: OrgRole) {
  if (userRole !== 'OWNER') {
    throw new AppError(403, 'FORBIDDEN', 'Only owner can delete organization');
  }

  // Audit log first
  await prisma.auditLog.create({
    data: {
      actorId: userId,
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
// Member Management
// ============================================

export async function getMembers(orgId: string) {
  const members = await prisma.orgMembership.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map(m => ({
    id: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    joinedAt: m.joinedAt,
    lastLoginAt: m.user.lastLoginAt,
  }));
}

export async function updateMemberRole(
  orgId: string,
  targetMembershipId: string,
  newRole: OrgRole,
  actorUserId: string,
  actorRole: OrgRole,
) {
  // Get the target membership
  const targetMembership = await prisma.orgMembership.findUnique({
    where: { id: targetMembershipId },
    include: { user: true },
  });

  if (!targetMembership || targetMembership.organizationId !== orgId) {
    throw new AppError(404, 'NOT_FOUND', 'Member not found');
  }

  // Cannot change own role
  if (targetMembership.userId === actorUserId) {
    throw new AppError(400, 'INVALID_OPERATION', 'Cannot change your own role');
  }

  // Role hierarchy checks
  const roleHierarchy: Record<OrgRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  // Can only manage users with lower role
  if (roleHierarchy[targetMembership.role] >= roleHierarchy[actorRole]) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot manage users with equal or higher role');
  }

  // Cannot promote to equal or higher than own role
  if (roleHierarchy[newRole] >= roleHierarchy[actorRole]) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot promote to equal or higher role than yourself');
  }

  // There must always be at least one OWNER
  if (targetMembership.role === 'OWNER') {
    const ownerCount = await prisma.orgMembership.count({
      where: { organizationId: orgId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw new AppError(400, 'INVALID_OPERATION', 'Organization must have at least one owner');
    }
  }

  const updated = await prisma.orgMembership.update({
    where: { id: targetMembershipId },
    data: { role: newRole },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actorUserId,
      organizationId: orgId,
      eventType: 'member.role_changed',
      resourceType: 'OrgMembership',
      resourceId: targetMembershipId,
      metadata: { oldRole: targetMembership.role, newRole, userId: targetMembership.userId },
    },
  });

  return updated;
}

export async function removeMember(
  orgId: string,
  targetMembershipId: string,
  actorUserId: string,
  actorRole: OrgRole,
) {
  const targetMembership = await prisma.orgMembership.findUnique({
    where: { id: targetMembershipId },
    include: { user: true },
  });

  if (!targetMembership || targetMembership.organizationId !== orgId) {
    throw new AppError(404, 'NOT_FOUND', 'Member not found');
  }

  // Cannot remove self (use leave endpoint instead)
  if (targetMembership.userId === actorUserId) {
    throw new AppError(400, 'INVALID_OPERATION', 'Use leave endpoint to remove yourself');
  }

  // Role hierarchy checks
  const roleHierarchy: Record<OrgRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  if (roleHierarchy[targetMembership.role] >= roleHierarchy[actorRole]) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot remove users with equal or higher role');
  }

  // Cannot remove last owner
  if (targetMembership.role === 'OWNER') {
    const ownerCount = await prisma.orgMembership.count({
      where: { organizationId: orgId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot remove the last owner');
    }
  }

  await prisma.orgMembership.delete({
    where: { id: targetMembershipId },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actorUserId,
      organizationId: orgId,
      eventType: 'member.removed',
      resourceType: 'OrgMembership',
      resourceId: targetMembershipId,
      metadata: { removedUserId: targetMembership.userId, email: targetMembership.user.email },
    },
  });
}

export async function leaveOrganization(orgId: string, userId: string) {
  const membership = await prisma.orgMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
  });

  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'Not a member of this organization');
  }

  // Cannot leave if you're the only owner
  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.orgMembership.count({
      where: { organizationId: orgId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot leave as the only owner. Transfer ownership first.');
    }
  }

  await prisma.orgMembership.delete({
    where: { id: membership.id },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      organizationId: orgId,
      eventType: 'member.left',
      resourceType: 'OrgMembership',
      resourceId: membership.id,
    },
  });
}

// ============================================
// Invitations
// ============================================

export interface InviteMemberInput {
  email: string;
  role: OrgRole;
}

export async function inviteMember(
  orgId: string,
  input: InviteMemberInput,
  invitedById: string,
  inviterRole: OrgRole,
) {
  // Cannot invite with higher or equal role
  const roleHierarchy: Record<OrgRole, number> = {
    VIEWER: 0,
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  if (roleHierarchy[input.role] >= roleHierarchy[inviterRole]) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot invite with equal or higher role than yourself');
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: {
        where: { organizationId: orgId },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    throw new AppError(400, 'ALREADY_MEMBER', 'User is already a member of this organization');
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.orgInvitation.findFirst({
    where: {
      organizationId: orgId,
      email: input.email,
      status: 'PENDING',
    },
  });

  if (existingInvite) {
    throw new AppError(400, 'ALREADY_INVITED', 'User already has a pending invitation');
  }

  // Create invitation
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.orgInvitation.create({
    data: {
      organizationId: orgId,
      email: input.email,
      role: input.role,
      token,
      invitedById,
      expiresAt,
    },
    include: {
      organization: {
        select: { name: true, slug: true },
      },
      invitedBy: {
        select: { name: true, email: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: invitedById,
      organizationId: orgId,
      eventType: 'member.invited',
      resourceType: 'OrgInvitation',
      resourceId: invitation.id,
      metadata: { email: input.email, role: input.role },
    },
  });

  // TODO: Send invitation email
  // await sendInvitationEmail(input.email, invitation);

  return invitation;
}

export async function getPendingInvitations(orgId: string) {
  return prisma.orgInvitation.findMany({
    where: {
      organizationId: orgId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeInvitation(invitationId: string, orgId: string, actorUserId: string) {
  const invitation = await prisma.orgInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.organizationId !== orgId) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Invitation is not pending');
  }

  await prisma.orgInvitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED' },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actorUserId,
      organizationId: orgId,
      eventType: 'invitation.revoked',
      resourceType: 'OrgInvitation',
      resourceId: invitationId,
      metadata: { email: invitation.email },
    },
  });
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  });

  if (!invitation) {
    throw new AppError(404, 'NOT_FOUND', 'Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(400, 'INVALID_STATUS', 'Invitation is no longer valid');
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError(400, 'EXPIRED', 'Invitation has expired');
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  // Check email matches (if user exists with different email, reject)
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new AppError(400, 'EMAIL_MISMATCH', 'Invitation was sent to a different email address');
  }

  // Check not already a member
  const existingMembership = await prisma.orgMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: invitation.organizationId,
      },
    },
  });

  if (existingMembership) {
    throw new AppError(400, 'ALREADY_MEMBER', 'You are already a member of this organization');
  }

  // Create membership and update invitation in transaction
  const [membership] = await prisma.$transaction([
    prisma.orgMembership.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    }),
  ]);

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      organizationId: invitation.organizationId,
      eventType: 'member.joined',
      resourceType: 'OrgMembership',
      resourceId: membership.id,
      metadata: { role: invitation.role, invitationId: invitation.id },
    },
  });

  return {
    membership,
    organization: invitation.organization,
  };
}

// ============================================
// Organization Switching
// ============================================

export async function switchOrganization(userId: string, newOrgId: string) {
  // Verify user has access to this org
  const membership = await prisma.orgMembership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: newOrgId,
      },
    },
    include: {
      organization: true,
      user: true,
    },
  });

  if (!membership) {
    throw new AppError(403, 'FORBIDDEN', 'Not a member of this organization');
  }

  if (membership.organization.status !== 'ACTIVE') {
    throw new AppError(403, 'ORG_INACTIVE', 'Organization is not active');
  }

  // Generate new access token with new org context
  const accessToken = generateAccessToken({
    userId: membership.user.id,
    email: membership.user.email,
    platformRole: membership.user.platformRole,
    orgId: newOrgId,
    orgRole: membership.role,
  });

  return {
    accessToken,
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    },
  };
}
