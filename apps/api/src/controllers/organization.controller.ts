import { Request, Response, NextFunction } from 'express';
import * as orgService from '../services/organization.service.js';
import { success, created } from '../utils/response.js';
import { AppError } from '../middleware/error.middleware.js';
import type { OrgRole } from '@traza/database';

// ============================================
// Organization CRUD
// ============================================

export async function getUserOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const organizations = await orgService.getUserOrganizations(req.user!.userId);
    success(res, { organizations });
  } catch (err) {
    next(err);
  }
}

export async function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organization = await orgService.createOrganization(req.body, req.user!.userId);
    created(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function getOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const organization = await orgService.getOrganization(req.params.orgId as string, req.user!.userId);
    success(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user!.orgRole) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
    }

    const organization = await orgService.updateOrganization(
      req.params.orgId as string,
      req.body,
      req.user!.userId,
      req.user!.orgRole,
    );
    success(res, organization);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user!.orgRole) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
    }

    await orgService.deleteOrganization(req.params.orgId as string, req.user!.userId, req.user!.orgRole);
    success(res, { message: 'Organization deleted' });
  } catch (err) {
    next(err);
  }
}

// ============================================
// Member Management
// ============================================

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await orgService.getMembers(req.params.orgId as string);
    success(res, { members });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user!.orgRole) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
    }

    const { role } = req.body;
    const member = await orgService.updateMemberRole(
      req.params.orgId as string,
      req.params.memberId as string,
      role as OrgRole,
      req.user!.userId,
      req.user!.orgRole,
    );
    success(res, member);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user!.orgRole) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
    }

    await orgService.removeMember(
      req.params.orgId as string,
      req.params.memberId as string,
      req.user!.userId,
      req.user!.orgRole,
    );
    success(res, { message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

export async function leaveOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    await orgService.leaveOrganization(req.params.orgId as string, req.user!.userId);
    success(res, { message: 'Left organization' });
  } catch (err) {
    next(err);
  }
}

// ============================================
// Invitations
// ============================================

export async function inviteMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user!.orgRole) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
    }

    const invitation = await orgService.inviteMember(
      req.params.orgId as string,
      req.body,
      req.user!.userId,
      req.user!.orgRole,
    );
    created(res, invitation);
  } catch (err) {
    next(err);
  }
}

export async function getPendingInvitations(req: Request, res: Response, next: NextFunction) {
  try {
    const invitations = await orgService.getPendingInvitations(req.params.orgId as string);
    success(res, { invitations });
  } catch (err) {
    next(err);
  }
}

export async function revokeInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    await orgService.revokeInvitation(
      req.params.invitationId as string,
      req.params.orgId as string,
      req.user!.userId,
    );
    success(res, { message: 'Invitation revoked' });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const result = await orgService.acceptInvitation(token, req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// ============================================
// Organization Switching
// ============================================

export async function switchOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = req.body;
    const result = await orgService.switchOrganization(req.user!.userId, orgId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
