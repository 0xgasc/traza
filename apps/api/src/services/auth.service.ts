import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@traza/database';
import { logger } from '../config/logger.js';
import { AUTH_CONFIG } from '../config/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  AccessTokenPayload,
} from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';
import { getEnv } from '../config/env.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { validateTotpCode } from './totp.service.js';
import type { PlatformRole, OrgRole } from '@traza/database';

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

function parseDeviceName(ua: string): string {
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Mac OS')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

export async function register(email: string, password: string, name: string, sessionMeta?: SessionMeta) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  // New user has no org yet
  const tokens = await createTokenPair(user.id, user.email, user.platformRole, null, null, sessionMeta);

  // Fire-and-forget verification email
  sendVerificationEmail(user.id).catch((err) => {
    logger.error('[AUTH] Failed to send verification email', { userId: user.id, error: err });
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      planTier: user.planTier,
    },
    ...tokens,
  };
}

// Account lockout: 5 failed attempts = 15 min lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

function recordFailedAttempt(email: string) {
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(email, entry);
}

export async function login(email: string, password: string, sessionMeta?: SessionMeta) {
  // Check lockout
  const attempts = loginAttempts.get(email);
  if (attempts?.lockedUntil && Date.now() < attempts.lockedUntil) {
    const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    throw new AppError(429, 'ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${minutesLeft} minute(s)`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      },
    },
  });

  if (!user) {
    recordFailedAttempt(email);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled');
  }

  if (!user.passwordHash) {
    // Magic-link account — cannot log in with password
    recordFailedAttempt(email);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    recordFailedAttempt(email);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Clear failed attempts on successful login
  loginAttempts.delete(email);

  // If 2FA is enabled, require TOTP code
  if (user.totpEnabled && user.totpSecret) {
    // Return a partial response - client must provide TOTP code
    return {
      requires2FA: true,
      tempToken: generateAccessToken({
        userId: user.id,
        email: user.email,
        platformRole: user.platformRole,
        orgId: null,
        orgRole: null,
      }),
      user: null,
      organization: null,
      accessToken: null,
      refreshToken: null,
    } as any;
  }

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Get default org context (first org user is member of)
  const defaultMembership = user.memberships[0];
  const hasActiveOrg = defaultMembership?.organization.status === 'ACTIVE';
  const orgId = hasActiveOrg ? defaultMembership.organizationId : null;
  const orgRole = hasActiveOrg ? defaultMembership.role : null;

  const tokens = await createTokenPair(user.id, user.email, user.platformRole, orgId, orgRole, sessionMeta);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      planTier: user.planTier,
    },
    organization: hasActiveOrg ? {
      id: defaultMembership.organization.id,
      name: defaultMembership.organization.name,
      slug: defaultMembership.organization.slug,
      role: orgRole,
    } : null,
    ...tokens,
  };
}

export async function refreshTokens(refreshTokenStr: string, sessionMeta?: SessionMeta) {
  const payload = verifyRefreshToken(refreshTokenStr);
  const tokenHash = hashToken(refreshTokenStr);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  // SECURITY: Token reuse detection
  if (!stored) {
    // Token was already used (rotated) - this is a token reuse attack!
    // Revoke ALL tokens for this user to prevent the attacker from using stolen tokens
    const allTokens = await prisma.refreshToken.findMany({
      where: { userId: payload.userId },
    });

    if (allTokens.length > 0) {
      logger.warn(
        `[SECURITY] Token reuse detected for user ${payload.userId}. Revoking all ${allTokens.length} tokens.`,
      );

      await prisma.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });

      throw new AppError(
        401,
        'TOKEN_REUSE_DETECTED',
        'Security breach detected: this token was already used. All sessions have been terminated. Please log in again.',
      );
    }

    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }

  if (stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }

  // Rotate: delete old token
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        include: {
          organization: {
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_TOKEN', 'User not found');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Your account has been disabled');
  }

  // Preserve org context on refresh
  const defaultMembership = user.memberships[0];
  const hasActiveOrg = defaultMembership?.organization.status === 'ACTIVE';
  const orgId = hasActiveOrg ? defaultMembership.organizationId : null;
  const orgRole = hasActiveOrg ? defaultMembership.role : null;

  return createTokenPair(user.id, user.email, user.platformRole, orgId, orgRole, sessionMeta);
}

export async function logout(refreshTokenStr: string) {
  const tokenHash = hashToken(refreshTokenStr);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true, planTier: true, status: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    platformRole: user.platformRole,
    planTier: user.planTier,
    createdAt: user.createdAt,
    organizations: user.memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      planTier: m.organization.planTier,
      status: m.organization.status,
      role: m.role,
    })),
  };
}

export async function generateApiKey(
  userId: string,
  name = 'Default',
  expiresInDays?: number,
) {
  const rawKey = `${AUTH_CONFIG.apiKeyPrefix}${crypto.randomBytes(AUTH_CONFIG.apiKeyLength).toString('base64url')}`;
  const keyHash = hashToken(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash,
      keyPrefix,
      expiresAt,
    },
  });

  // Also keep legacy apiKeyHash on User for backward compatibility
  await prisma.user.update({
    where: { id: userId },
    data: { apiKeyHash: keyHash },
  });

  return {
    id: apiKey.id,
    key: rawKey, // Only shown once
    name: apiKey.name,
    keyPrefix,
    expiresAt,
    createdAt: apiKey.createdAt,
  };
}

export async function listApiKeys(userId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return keys.map((k) => ({
    ...k,
    isExpired: k.expiresAt ? k.expiresAt < new Date() : false,
  }));
}

export async function revokeApiKey(keyId: string, userId: string) {
  const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!apiKey || apiKey.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'API key not found');
  }
  if (apiKey.revokedAt) {
    throw new AppError(400, 'ALREADY_REVOKED', 'API key is already revoked');
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  // If this was the latest active key, clear legacy field
  const remaining = await prisma.apiKey.findFirst({
    where: { userId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (!remaining) {
    await prisma.user.update({
      where: { id: userId },
      data: { apiKeyHash: null },
    });
  }

  return { revoked: true };
}

// In-memory rate limiter for API key validation (prevents brute force)
const apiKeyAttempts = new Map<string, { count: number; resetAt: Date }>();

function checkApiKeyRateLimit(keyHash: string) {
  const now = new Date();
  const attempts = apiKeyAttempts.get(keyHash);

  // Clean up old entries periodically
  if (apiKeyAttempts.size > 10000) {
    for (const [hash, data] of apiKeyAttempts.entries()) {
      if (data.resetAt < now) {
        apiKeyAttempts.delete(hash);
      }
    }
  }

  if (attempts) {
    if (attempts.resetAt < now) {
      // Reset window expired
      apiKeyAttempts.delete(keyHash);
    } else if (attempts.count >= 10) {
      // Too many attempts
      const remainingSeconds = Math.ceil((attempts.resetAt.getTime() - now.getTime()) / 1000);
      throw new AppError(
        429,
        'TOO_MANY_ATTEMPTS',
        `Too many API key validation attempts. Try again in ${remainingSeconds} seconds.`,
      );
    }
  }
}

function recordApiKeyAttempt(keyHash: string, success: boolean) {
  if (success) {
    // Clear attempts on successful validation
    apiKeyAttempts.delete(keyHash);
    return;
  }

  const now = new Date();
  const attempts = apiKeyAttempts.get(keyHash);

  if (attempts && attempts.resetAt > now) {
    attempts.count++;
  } else {
    // Start new window (15 minutes)
    apiKeyAttempts.set(keyHash, {
      count: 1,
      resetAt: new Date(now.getTime() + 15 * 60 * 1000),
    });
  }
}

export async function validateApiKey(key: string) {
  const keyHash = hashToken(key);

  // SECURITY: Rate limit API key validation attempts
  checkApiKeyRateLimit(keyHash);

  // Check new ApiKey model first
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, email: true, platformRole: true, planTier: true, isActive: true } } },
  });

  if (apiKey) {
    if (apiKey.revokedAt) {
      recordApiKeyAttempt(keyHash, false);
      throw new AppError(401, 'API_KEY_REVOKED', 'This API key has been revoked');
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      recordApiKeyAttempt(keyHash, false);
      throw new AppError(401, 'API_KEY_EXPIRED', 'This API key has expired');
    }
    if (!apiKey.user.isActive) {
      recordApiKeyAttempt(keyHash, false);
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
    }

    // Update last used timestamp (fire-and-forget)
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    recordApiKeyAttempt(keyHash, true);
    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      platformRole: apiKey.user.platformRole,
      planTier: apiKey.user.planTier,
    };
  }

  // Fallback: check legacy apiKeyHash on User
  const user = await prisma.user.findFirst({ where: { apiKeyHash: keyHash } });
  if (!user) {
    recordApiKeyAttempt(keyHash, false);
    throw new AppError(401, 'INVALID_API_KEY', 'Invalid API key');
  }

  if (!user.isActive) {
    recordApiKeyAttempt(keyHash, false);
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
  }

  recordApiKeyAttempt(keyHash, true);
  return {
    id: user.id,
    email: user.email,
    platformRole: user.platformRole,
    planTier: user.planTier,
  };
}

// --- Helpers ---

async function createTokenPair(
  userId: string,
  email: string,
  platformRole: PlatformRole,
  orgId: string | null,
  orgRole: OrgRole | null,
  sessionMeta?: SessionMeta,
) {
  const tokenId = crypto.randomUUID();

  const accessToken = generateAccessToken({
    userId,
    email,
    platformRole,
    orgId,
    orgRole,
  });
  const refreshToken = generateRefreshToken({ userId, tokenId });

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + AUTH_CONFIG.refreshTokenExpiryMs),
      ipAddress: sessionMeta?.ipAddress,
      userAgent: sessionMeta?.userAgent,
      deviceName: sessionMeta?.userAgent ? parseDeviceName(sessionMeta.userAgent) : null,
    },
  });

  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function updateProfile(userId: string, name: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, email: true, name: true, platformRole: true },
  });
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  if (!user.passwordHash) throw new AppError(400, 'NO_PASSWORD', 'This account does not have a password set');
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, 'INVALID_PASSWORD', 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { changed: true };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Don't reveal if user exists — always return success
  if (!user) {
    logger.info(`[AUTH] Password reset requested for non-existent email: ${email}`);
    return { sent: true };
  }

  // Invalidate any existing password reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate raw token and hash it
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  // Create token with 1 hour expiry
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Send reset email
  const env = getEnv();
  const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: user.email,
    recipientName: user.name,
    resetUrl,
    expiresInMinutes: 60,
  });

  logger.info(`[AUTH] Password reset email sent to user ${user.id}`);
  return { sent: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  });

  if (!resetToken) {
    throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
  }

  if (resetToken.usedAt) {
    throw new AppError(400, 'TOKEN_USED', 'This reset token has already been used');
  }

  if (resetToken.expiresAt < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', 'This reset token has expired');
  }

  // Hash new password and update user
  const passwordHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  // Revoke all refresh tokens for security
  await prisma.refreshToken.deleteMany({
    where: { userId: resetToken.userId },
  });

  logger.info(`[AUTH] Password reset completed for user ${resetToken.userId}`);
  return { reset: true };
}

export async function verifyLoginTotp(tempToken: string, code: string, sessionMeta?: SessionMeta) {
  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(tempToken);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired temporary token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      memberships: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      },
    },
  });

  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (!user.totpEnabled || !user.totpSecret) {
    throw new AppError(400, 'TOTP_NOT_ENABLED', '2FA is not enabled for this account');
  }

  const valid = validateTotpCode(user.totpSecret, code);
  if (!valid) throw new AppError(400, 'INVALID_CODE', 'Invalid verification code');

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Get default org context
  const defaultMembership = user.memberships[0];
  const hasActiveOrg = defaultMembership?.organization.status === 'ACTIVE';
  const orgId = hasActiveOrg ? defaultMembership.organizationId : null;
  const orgRole = hasActiveOrg ? defaultMembership.role : null;

  const tokens = await createTokenPair(user.id, user.email, user.platformRole, orgId, orgRole, sessionMeta);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platformRole,
      planTier: user.planTier,
    },
    organization: hasActiveOrg ? {
      id: defaultMembership.organization.id,
      name: defaultMembership.organization.name,
      slug: defaultMembership.organization.slug,
      role: orgRole,
    } : null,
    ...tokens,
  };
}

// --- Session Management ---

export async function listSessions(userId: string) {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      deviceName: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return sessions;
}

export async function revokeSession(sessionId: string, userId: string) {
  const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Session not found');
  }
  await prisma.refreshToken.delete({ where: { id: sessionId } });
  return { revoked: true };
}

export async function revokeAllSessions(userId: string, currentTokenHash?: string) {
  if (currentTokenHash) {
    await prisma.refreshToken.deleteMany({
      where: { userId, tokenHash: { not: currentTokenHash } },
    });
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
  return { revokedAll: true };
}

// --- Email Verification ---

export async function sendVerificationEmail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.emailVerified) throw new AppError(400, 'ALREADY_VERIFIED', 'Email is already verified');

  // Invalidate existing tokens
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const env = getEnv();
  const verifyUrl = `${env.APP_URL}/verify-email?token=${rawToken}`;
  logger.info('Verification email would be sent', { userId, verifyUrl });

  return { sent: true };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!stored) throw new AppError(400, 'INVALID_TOKEN', 'Invalid verification token');
  if (stored.usedAt) throw new AppError(400, 'TOKEN_USED', 'This token has already been used');
  if (stored.expiresAt < new Date()) throw new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired');

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);

  return { verified: true };
}
