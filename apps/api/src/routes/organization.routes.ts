import { Router } from 'express';
import * as orgController from '../controllers/organization.controller.js';
import { requireAuth, requireOrgContext, requireOrgAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = Router();

// All org routes require authentication
router.use(requireAuth);

// ============================================
// Organization CRUD
// ============================================

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  billingEmail: z.string().email().optional(),
});

// List user's organizations
router.get('/', orgController.getUserOrganizations);

// Create new organization
router.post('/', validate(createOrgSchema), orgController.createOrganization);

// Get organization details (must be a member)
router.get('/:orgId', orgController.getOrganization);

// Update organization (requires ADMIN or OWNER role in the org)
router.patch('/:orgId', requireOrgContext, validate(updateOrgSchema), orgController.updateOrganization);

// Delete organization (requires OWNER role)
router.delete('/:orgId', requireOrgContext, orgController.deleteOrganization);

// Leave organization
router.post('/:orgId/leave', orgController.leaveOrganization);

// ============================================
// Member Management
// ============================================

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
});

// List members (any member can view)
router.get('/:orgId/members', requireOrgContext, orgController.getMembers);

// Update member role (requires ADMIN or OWNER)
router.patch('/:orgId/members/:memberId', requireOrgAdmin, validate(updateMemberSchema), orgController.updateMemberRole);

// Remove member (requires ADMIN or OWNER)
router.delete('/:orgId/members/:memberId', requireOrgAdmin, orgController.removeMember);

// ============================================
// Invitations
// ============================================

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']), // Cannot invite as OWNER
});

// List pending invitations (requires ADMIN or OWNER)
router.get('/:orgId/invitations', requireOrgAdmin, orgController.getPendingInvitations);

// Create invitation (requires ADMIN or OWNER)
router.post('/:orgId/invitations', requireOrgAdmin, validate(inviteSchema), orgController.inviteMember);

// Revoke invitation (requires ADMIN or OWNER)
router.delete('/:orgId/invitations/:invitationId', requireOrgAdmin, orgController.revokeInvitation);

// ============================================
// Invitation Acceptance (separate endpoint)
// ============================================

const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

// Accept invitation (authenticated user with token)
router.post('/invitations/accept', validate(acceptInviteSchema), orgController.acceptInvitation);

// ============================================
// Organization Switching
// ============================================

const switchOrgSchema = z.object({
  orgId: z.string().uuid(),
});

// Switch active organization (returns new token)
router.post('/switch', validate(switchOrgSchema), orgController.switchOrganization);

export default router;
