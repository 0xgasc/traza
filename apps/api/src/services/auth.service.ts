import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@traza/database';
import { AUTH_CONFIG } from '../config/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AccessTokenPayload,
} from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';
import type { PlatformRole, OrgRole } from '@traza/database';

export async function register(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  // New user has no org yet
  const tokens = await createTokenPair(user.id, user.email, user.platformRole, null, null);

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

export async function login(email: string, password: string) {
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

  const tokens = await createTokenPair(user.id, user.email, user.platformRole, orgId, orgRole);

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

export async function refreshTokens(refreshTokenStr: string) {
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
      console.warn(
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

  return createTokenPair(user.id, user.email, user.platformRole, orgId, orgRole);
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

export async function generateApiKey(userId: string) {
  const rawKey = `${AUTH_CONFIG.apiKeyPrefix}${crypto.randomBytes(AUTH_CONFIG.apiKeyLength).toString('base64url')}`;
  const apiKeyHash = hashToken(rawKey);

  await prisma.user.update({
    where: { id: userId },
    data: { apiKeyHash },
  });

  return { key: rawKey };
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
  const apiKeyHash = hashToken(key);

  // SECURITY: Rate limit API key validation attempts
  checkApiKeyRateLimit(apiKeyHash);

  const user = await prisma.user.findFirst({ where: { apiKeyHash } });
  if (!user) {
    recordApiKeyAttempt(apiKeyHash, false);
    throw new AppError(401, 'INVALID_API_KEY', 'Invalid API key');
  }

  if (!user.isActive) {
    recordApiKeyAttempt(apiKeyHash, false);
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Account has been disabled');
  }

  // Clear attempts on success
  recordApiKeyAttempt(apiKeyHash, true);

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
