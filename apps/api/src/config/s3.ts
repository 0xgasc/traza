import { S3Client } from '@aws-sdk/client-s3';
import { getEnv } from './env.js';

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const env = getEnv();
    _s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Required for MinIO / R2 compatibility
    });
  }
  return _s3Client;
}
