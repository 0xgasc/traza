import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireSuperAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { z } from 'zod';

const router = Router();

// All admin routes require SUPER_ADMIN role
router.use(requireSuperAdmin);

// ============================================
// Organization Management
// ============================================

const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    planTier: z.enum(['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE']),
    ownerEmail: z.string().email(),
    billingEmail: z.string().email().optional(),
  }),
});

const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    planTier: z.enum(['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_SETUP']).optional(),
    billingEmail: z.string().email().optional(),
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

router.get('/organizations', adminController.listOrganizations);
router.post('/organizations', validate(createOrgSchema), adminController.createOrganization);
router.get('/organizations/:orgId', adminController.getOrganization);
router.patch('/organizations/:orgId', validate(updateOrgSchema), adminController.updateOrganization);
router.post('/organizations/:orgId/suspend', adminController.suspendOrganization);
router.delete('/organizations/:orgId', adminController.deleteOrganization);

// ============================================
// User Management
// ============================================

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    platformRole: z.enum(['USER', 'SUPER_ADMIN']).optional(),
    isActive: z.boolean().optional(),
  }),
});

router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUser);
router.patch('/users/:userId', validate(updateUserSchema), adminController.updateUser);

// ============================================
// Impersonation
// ============================================

const impersonateSchema = z.object({
  body: z.object({
    reason: z.string().min(5).max(500),
  }),
});

router.post('/users/:userId/impersonate', validate(impersonateSchema), adminController.startImpersonation);
router.post('/impersonation/end', adminController.endImpersonation);

// ============================================
// Feature Flags
// ============================================

const createFlagSchema = z.object({
  body: z.object({
    key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric with underscores'),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
    enabledForAll: z.boolean().optional(),
    enabledOrgIds: z.array(z.string().uuid()).optional(),
    enabledPlanTiers: z.array(z.enum(['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'])).optional(),
  }),
});

const updateFlagSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
    enabledForAll: z.boolean().optional(),
    enabledOrgIds: z.array(z.string().uuid()).optional(),
    enabledPlanTiers: z.array(z.enum(['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'])).optional(),
  }),
});

router.get('/feature-flags', adminController.listFeatureFlags);
router.post('/feature-flags', validate(createFlagSchema), adminController.createFeatureFlag);
router.patch('/feature-flags/:flagId', validate(updateFlagSchema), adminController.updateFeatureFlag);
router.delete('/feature-flags/:flagId', adminController.deleteFeatureFlag);

// ============================================
// Audit Logs
// ============================================

router.get('/audit-logs', adminController.listAuditLogs);

// ============================================
// Analytics
// ============================================

router.get('/analytics', adminController.getPlatformAnalytics);

export default router;
