import crypto from 'node:crypto';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { generateAccessToken } from '../utils/jwt.js';
import { getEnv } from '../config/env.js';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Request a magic link for signer account creation/login.
 * Creates the signer account if it doesn't exist yet.
 */
export async function requestMagicLink(email: string, name?: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  // Find or create the signer user
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    // Create a signer-only account (no password)
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() ?? normalizedEmail.split('@')[0]!,
        passwordHash: null, // Magic-link accounts have no password
        isSignerAccount: true,
        platformRole: 'USER',
      },
    });
  } else if (!user.isSignerAccount && !user.passwordHash) {
    // Edge case: somehow no passwordHash and not a signer account — make it one
    await prisma.user.update({
      where: { id: user.id },
      data: { isSignerAccount: true },
    });
  }
  // Note: if the user is a regular account holder, they still get the magic link
  // so they can access their saved signature profile from the signing page.

  // Generate a raw random token and store its hash
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any previous unused tokens for this email
  await prisma.signerMagicToken.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() }, // mark old ones as used (effectively revoked)
  });

  await prisma.signerMagicToken.create({
    data: { email: normalizedEmail, tokenHash, expiresAt },
  });

  // Send the magic link email
  const env = getEnv();
  const magicUrl = `${env.APP_URL}/signer/auth?token=${rawToken}`;
  await sendMagicLinkEmail({ to: normalizedEmail, name: user.name, magicUrl });
}

/**
 * Verify a magic link token and return an access token.
 */
export async function verifyMagicLink(rawToken: string): Promise<{
  accessToken: string;
  user: { id: string; email: string; name: string; savedSignatureData: string | null };
}> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.signerMagicToken.findUnique({ where: { tokenHash } });

  if (!record) {
    throw new AppError(401, 'INVALID_TOKEN', 'Magic link is invalid or has expired');
  }

  if (record.usedAt) {
    throw new AppError(401, 'TOKEN_USED', 'This magic link has already been used');
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(410, 'TOKEN_EXPIRED', 'This magic link has expired — please request a new one');
  }

  // Mark token as used
  await prisma.signerMagicToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    platformRole: user.platformRole,
    orgId: null,
    orgRole: null,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      savedSignatureData: user.savedSignatureData,
    },
  };
}

/**
 * Get signer profile (requires authenticated signer session).
 */
export async function getSignerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      savedSignatureData: true,
      savedSignatureUpdatedAt: true,
      isSignerAccount: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return user;
}

/**
 * Save or update the signer's signature drawing.
 */
export async function saveSignerSignature(
  userId: string,
  signatureData: string,
): Promise<void> {
  // Basic validation: must be a data URL
  if (!signatureData.startsWith('data:image/')) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Signature must be an image data URL');
  }
  // Rough size check: base64 PNG should be < 2MB
  if (signatureData.length > 2_000_000) {
    throw new AppError(400, 'SIGNATURE_TOO_LARGE', 'Signature image is too large');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      savedSignatureData: signatureData,
      savedSignatureUpdatedAt: new Date(),
    },
  });
}

/**
 * Delete the signer's saved signature drawing.
 */
export async function deleteSignerSignature(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { savedSignatureData: null, savedSignatureUpdatedAt: null },
  });
}

/**
 * Get the signing history for a signer account.
 */
export async function getSignerHistory(userId: string) {
  const signatures = await prisma.signature.findMany({
    where: { signerUserId: userId },
    select: {
      id: true,
      signerEmail: true,
      signerName: true,
      status: true,
      signedAt: true,
      declineReason: true,
      createdAt: true,
      document: {
        select: {
          id: true,
          title: true,
          status: true,
          owner: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return signatures;
}

// ---------------------------------------------------------------------------
// Internal: send magic link email (plain HTML — no React email template needed)
// ---------------------------------------------------------------------------

async function sendMagicLinkEmail(params: {
  to: string;
  name: string;
  magicUrl: string;
}): Promise<void> {
  const { getResendClient } = await import('./email.service.js');
  const client = getResendClient();
  const env = getEnv();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:0 20px;color:#111;">
  <h1 style="font-size:24px;font-weight:900;letter-spacing:-1px;text-transform:uppercase;margin-bottom:8px;">
    Sign in to Traza
  </h1>
  <p style="color:#555;margin-bottom:32px;">
    Hi ${params.name}, click the button below to set up your signer profile and save your signature for reuse.
    This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes.
  </p>
  <a href="${params.magicUrl}"
     style="display:inline-block;background:#000;color:#fff;padding:14px 28px;
            font-weight:700;text-transform:uppercase;letter-spacing:2px;
            text-decoration:none;font-size:13px;border:4px solid #000;">
    Sign In
  </a>
  <p style="margin-top:32px;font-size:12px;color:#999;font-family:monospace;">
    Or copy this link: ${params.magicUrl}
  </p>
  <p style="margin-top:24px;font-size:11px;color:#ccc;">
    If you didn't request this, you can safely ignore this email.
  </p>
</body>
</html>`;

  if (!client) {
    console.warn(`[signer-auth] RESEND_API_KEY not set — magic link for ${params.to}: ${params.magicUrl}`);
    return;
  }

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: 'Your Traza sign-in link',
    html,
  });

  if (error) {
    console.error('[signer-auth] Failed to send magic link email:', error);
    throw new Error(`Magic link email failed: ${error.message}`);
  }
}
