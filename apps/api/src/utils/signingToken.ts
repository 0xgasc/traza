import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';

export interface SigningTokenPayload {
  signatureId: string;
  documentId: string;
  signerEmail: string;
}

export function generateSigningToken(
  payload: SigningTokenPayload,
  expiresInDays: number,
): string {
  const env = getEnv();
  return jwt.sign(payload, env.SIGNING_TOKEN_SECRET, {
    expiresIn: `${expiresInDays}d`,
  });
}

export function verifySigningToken(token: string): SigningTokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.SIGNING_TOKEN_SECRET) as SigningTokenPayload;
}
