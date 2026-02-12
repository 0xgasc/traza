import { createHash } from 'node:crypto';

export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function verifyHash(buffer: Buffer, expectedHash: string): boolean {
  return hashBuffer(buffer) === expectedHash;
}

export function hashString(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
