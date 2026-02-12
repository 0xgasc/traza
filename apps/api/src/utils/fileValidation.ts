import crypto from 'node:crypto';
import path from 'node:path';

// Magic byte signatures
const MAGIC_BYTES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK (ZIP)
} as const;

export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') {
    return buffer.subarray(0, 4).equals(MAGIC_BYTES.pdf);
  }
  if (ext === '.docx') {
    return buffer.subarray(0, 4).equals(MAGIC_BYTES.docx);
  }
  if (ext === '.txt') {
    // TXT files don't have magic bytes — accept any non-binary content
    return true;
  }
  return false;
}

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
  return `${base}${ext}`;
}

export function generateStorageKey(userId: string, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const uuid = crypto.randomUUID();
  return `documents/${userId}/${uuid}${ext}`;
}
