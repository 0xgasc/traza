import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';

const ISSUER = 'Traza';

export async function setupTotp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, totpEnabled: true } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (user.totpEnabled) throw new AppError(400, 'TOTP_ALREADY_ENABLED', '2FA is already enabled');

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, label: user.email, secret, digits: 6, period: 30 });

  // Store secret temporarily (not enabled until verified)
  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret.base32 } });

  const otpauthUri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  return { secret: secret.base32, qrCode: qrCodeDataUrl, otpauthUri };
}

export async function verifyAndEnableTotp(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabled: true } });
  if (!user?.totpSecret) throw new AppError(400, 'TOTP_NOT_SETUP', 'TOTP has not been set up');
  if (user.totpEnabled) throw new AppError(400, 'TOTP_ALREADY_ENABLED', '2FA is already enabled');

  const totp = new OTPAuth.TOTP({ issuer: ISSUER, secret: OTPAuth.Secret.fromBase32(user.totpSecret), digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) throw new AppError(400, 'INVALID_CODE', 'Invalid verification code');

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });

  // Generate recovery codes would go here in a future iteration
  return { enabled: true };
}

export function validateTotpCode(totpSecret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({ issuer: ISSUER, secret: OTPAuth.Secret.fromBase32(totpSecret), digits: 6, period: 30 });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export async function disableTotp(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabled: true } });
  if (!user?.totpEnabled || !user.totpSecret) throw new AppError(400, 'TOTP_NOT_ENABLED', '2FA is not enabled');

  const valid = validateTotpCode(user.totpSecret, code);
  if (!valid) throw new AppError(400, 'INVALID_CODE', 'Invalid verification code');

  await prisma.user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabled: false } });
  return { disabled: true };
}
