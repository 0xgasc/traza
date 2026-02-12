import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload, isImpersonationToken } from '../utils/jwt.js';
import { validateApiKey } from '../services/auth.service.js';
import { AppError } from './error.middleware.js';
import type { OrgRole } from '@traza/database';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Require any valid authentication (JWT or API key)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
  }

  try {
    const token = header.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'));
  }
}

/**
 * Require SUPER_ADMIN platform role
 */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    if (payload.platformRole !== 'SUPER_ADMIN') {
      return next(new AppError(403, 'FORBIDDEN', 'Super admin access required'));
    }

    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'));
  }
}

/**
 * Require an active organization context
 */
export function requireOrgContext(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    if (!payload.orgId) {
      return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required. Please select an organization.'));
    }

    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'));
  }
}

/**
 * Require specific organization roles
 * Usage: requireOrgRole('ADMIN', 'OWNER') - allows ADMIN or OWNER
 */
export function requireOrgRole(...allowedRoles: OrgRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
    }

    try {
      const token = header.slice(7);
      const payload = verifyAccessToken(token);

      if (!payload.orgId || !payload.orgRole) {
        return next(new AppError(400, 'NO_ORG_CONTEXT', 'Organization context required'));
      }

      if (!allowedRoles.includes(payload.orgRole)) {
        return next(new AppError(403, 'INSUFFICIENT_PERMISSIONS', `Required role: ${allowedRoles.join(' or ')}`));
      }

      req.user = payload;
      next();
    } catch {
      next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'));
    }
  };
}

/**
 * Require org admin (ADMIN or OWNER role)
 */
export const requireOrgAdmin = requireOrgRole('ADMIN', 'OWNER');

/**
 * Require org owner (OWNER role only)
 */
export const requireOrgOwner = requireOrgRole('OWNER');

/**
 * Check if the current request is from an impersonation session
 */
export function isImpersonating(req: Request): boolean {
  return req.user ? isImpersonationToken(req.user) : false;
}

/**
 * Block certain actions during impersonation
 */
export function blockDuringImpersonation(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  if (isImpersonationToken(req.user)) {
    return next(new AppError(403, 'IMPERSONATION_BLOCKED', 'This action is not allowed during impersonation'));
  }

  next();
}

/**
 * Require API key authentication
 */
export async function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string | undefined;
  if (!key) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing X-API-Key header'));
  }

  try {
    const user = await validateApiKey(key);
    // Build a minimal payload for API key auth
    // Note: API keys don't have org context by default - they use the user's default org
    req.user = {
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
      orgId: null, // API keys need explicit org context via header or query
      orgRole: null,
      planTier: user.planTier,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Flexible authentication - accepts Bearer token or API key
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Try Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
      return next();
    } catch {
      // Fall through to API key
    }
  }

  // Try API key
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    try {
      const user = await validateApiKey(apiKey);
      req.user = {
        userId: user.id,
        email: user.email,
        platformRole: user.platformRole,
        orgId: null,
        orgRole: null,
        planTier: user.planTier,
      };
      return next();
    } catch {
      // Fall through
    }
  }

  next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
}

// Role hierarchy for permission checks
const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Check if user's org role meets minimum required level
 */
export function hasMinimumOrgRole(userRole: OrgRole | null, requiredRole: OrgRole): boolean {
  if (!userRole) return false;
  return ORG_ROLE_HIERARCHY[userRole] >= ORG_ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can manage another user based on role hierarchy
 * (can only manage users with lower role level)
 */
export function canManageUser(managerRole: OrgRole | null, targetRole: OrgRole): boolean {
  if (!managerRole) return false;
  // OWNER can manage anyone, ADMIN can manage MEMBER and VIEWER
  return ORG_ROLE_HIERARCHY[managerRole] > ORG_ROLE_HIERARCHY[targetRole];
}
