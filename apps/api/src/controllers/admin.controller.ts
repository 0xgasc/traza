import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';
import { success, created } from '../utils/response.js';
import type { OrgStatus, PlanTier, PlatformRole } from '@traza/database';

// ============================================
// Organization Management
// ============================================

export async function listOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as OrgStatus | undefined,
      planTier: req.query.planTier as PlanTier | undefined,
      search: req.query.search as string | undefined,
    };

    const result = await adminService.listOrganizations(params);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organization = await adminService.createOrganization(req.body, req.user!.userId);
    created(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function getOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organization = await adminService.getOrganization(req.params.orgId as string);
    success(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organization = await adminService.updateOrganization(
      req.params.orgId as string,
      req.body,
      req.user!.userId,
    );
    success(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function suspendOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const organization = await adminService.suspendOrganization(
      req.params.orgId as string,
      reason || 'No reason provided',
      req.user!.userId,
    );
    success(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.deleteOrganization(req.params.orgId as string, req.user!.userId);
    success(res, { message: 'Organization deleted' });
  } catch (err) {
    next(err);
  }
}

// ============================================
// User Management
// ============================================

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      search: req.query.search as string | undefined,
      platformRole: req.query.platformRole as PlatformRole | undefined,
    };

    const result = await adminService.listUsers(params);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.getUser(req.params.userId as string);
    success(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.updateUser(
      req.params.userId as string,
      req.body,
      req.user!.userId,
    );
    success(res, user);
  } catch (err) {
    next(err);
  }
}

// ============================================
// Impersonation
// ============================================

export async function startImpersonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    const result = await adminService.startImpersonation(
      req.user!.userId,
      req.params.userId as string,
      reason || 'Support request',
    );
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function endImpersonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId, realUserId } = req.body;
    const result = await adminService.endImpersonation(sessionId, realUserId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// ============================================
// Feature Flags
// ============================================

export async function listFeatureFlags(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await adminService.listFeatureFlags();
    success(res, { flags });
  } catch (err) {
    next(err);
  }
}

export async function createFeatureFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const flag = await adminService.createFeatureFlag(req.body);
    created(res, flag);
  } catch (err) {
    next(err);
  }
}

export async function updateFeatureFlag(req: Request, res: Response, next: NextFunction) {
  try {
    const flag = await adminService.updateFeatureFlag(req.params.flagId as string, req.body);
    success(res, flag);
  } catch (err) {
    next(err);
  }
}

export async function deleteFeatureFlag(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.deleteFeatureFlag(req.params.flagId as string);
    success(res, { message: 'Feature flag deleted' });
  } catch (err) {
    next(err);
  }
}

// ============================================
// Audit Logs
// ============================================

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const params = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      eventType: req.query.eventType as string | undefined,
      organizationId: req.query.organizationId as string | undefined,
      actorId: req.query.actorId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    const result = await adminService.listAuditLogs(params);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// ============================================
// Analytics
// ============================================

export async function getPlatformAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const analytics = await adminService.getPlatformAnalytics();
    success(res, analytics);
  } catch (err) {
    next(err);
  }
}
