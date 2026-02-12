import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { AUTH_CONFIG } from '../config/auth.js';
import type { PlatformRole, OrgRole } from '@traza/database';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  // Platform-level role (USER or SUPER_ADMIN)
  platformRole: PlatformRole;
  // Current organization context (null if not in an org)
  orgId: string | null;
  orgRole: OrgRole | null;
  // Legacy field - will be removed after migration
  planTier?: string;
  // Impersonation tracking
  isImpersonating?: boolean;
  realUserId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export interface ImpersonationTokenPayload extends AccessTokenPayload {
  isImpersonating: true;
  realUserId: string;
  impersonationSessionId: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: AUTH_CONFIG.accessTokenExpiry,
  });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: AUTH_CONFIG.refreshTokenExpiry,
  });
}

export function generateImpersonationToken(payload: ImpersonationTokenPayload): string {
  const env = getEnv();
  // Impersonation tokens have a shorter expiry (2 hours max)
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '2h',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

// Helper to check if a token is from impersonation
export function isImpersonationToken(payload: AccessTokenPayload): payload is ImpersonationTokenPayload {
  return payload.isImpersonating === true && typeof payload.realUserId === 'string';
}
