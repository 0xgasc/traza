import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../config/s3.js';
import { getEnv } from '../config/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Local storage directory for dev (when S3/MinIO isn't available)
const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.local-storage');

async function ensureLocalDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function useLocalStorage(): boolean {
  const env = getEnv();
  return env.NODE_ENV === 'development' && !env.S3_ENDPOINT?.includes('amazonaws');
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const env = getEnv();

  // Try S3 first, fall back to local storage on error
  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return key;
    } catch (err) {
      console.warn('S3 upload failed, falling back to local storage:', (err as Error).message);
    }
  }

  // Local file storage fallback
  await ensureLocalDir();
  const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
  await fs.writeFile(filePath, buffer);

  // Store metadata
  const metaPath = filePath + '.meta.json';
  await fs.writeFile(metaPath, JSON.stringify({ contentType, key, createdAt: new Date().toISOString() }));

  return key;
}

export async function generatePresignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const env = getEnv();

  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
        { expiresIn: expiresInSeconds },
      );
    } catch (err) {
      console.warn('S3 presigned URL failed, using local path:', (err as Error).message);
    }
  }

  // Return a local API endpoint for serving the file
  return `/api/v1/files/${encodeURIComponent(key)}`;
}

export async function getFileBuffer(key: string): Promise<Buffer | null> {
  const env = getEnv();

  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );
      const bytes = await response.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch (err) {
      console.warn('S3 get failed, trying local storage:', (err as Error).message);
    }
  }

  // Local file fallback
  try {
    const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function getFileMetadata(key: string): Promise<{ contentType: string } | null> {
  const env = getEnv();

  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      const response = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
      return { contentType: response.ContentType || 'application/pdf' };
    } catch {
      return { contentType: 'application/pdf' };
    }
  }

  try {
    const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
    const metaPath = filePath + '.meta.json';
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    return { contentType: meta.contentType };
  } catch {
    return { contentType: 'application/pdf' };
  }
}

export async function deleteFile(key: string): Promise<void> {
  const env = getEnv();

  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );
      return;
    } catch (err) {
      console.warn('S3 delete failed, trying local:', (err as Error).message);
    }
  }

  // Local file fallback
  try {
    const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
    await fs.unlink(filePath);
    await fs.unlink(filePath + '.meta.json').catch(() => {});
  } catch {
    // ignore
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const env = getEnv();

  if (!useLocalStorage()) {
    try {
      const s3 = getS3Client();
      await s3.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }),
      );
      return true;
    } catch {
      // Fall through to local check
    }
  }

  // Local file check
  try {
    const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
