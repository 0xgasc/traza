import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import app from '../../src/app.js';
import { prisma } from '@traza/database';

describe('Public verify-by-hash', () => {
  const fileHash = createHash('sha256')
    .update(`verify-hash-test-${randomUUID()}`)
    .digest('hex');
  let documentId: string;

  beforeAll(async () => {
    const doc = await prisma.document.create({
      data: {
        title: 'Verify Hash Test Doc',
        fileUrl: 's3://test/verify-hash-test.pdf',
        fileHash,
        status: 'PENDING',
      },
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    await prisma.document.delete({ where: { id: documentId } });
    await prisma.$disconnect();
  });

  it('returns found:true with minimal shape for a known hash', async () => {
    const response = await request(app)
      .get(`/api/v1/verify/hash/${fileHash}`)
      .expect(200);

    const data = response.body.data ?? response.body;
    expect(data.found).toBe(true);
    expect(data.status).toBe('PENDING');
    expect(data.signerCount).toBe(0);
    expect(data.anchored).toBe(false);

    // Must never leak PII or pivotable identifiers
    expect(data.documentId).toBeUndefined();
    expect(data.title).toBeUndefined();
    expect(data.signers).toBeUndefined();
  });

  it('accepts a sha256: prefix and uppercase input', async () => {
    const response = await request(app)
      .get(`/api/v1/verify/hash/sha256:${fileHash.toUpperCase()}`)
      .expect(200);

    const data = response.body.data ?? response.body;
    expect(data.found).toBe(true);
  });

  it('returns found:false for an unknown hash', async () => {
    const unknown = createHash('sha256').update(randomUUID()).digest('hex');
    const response = await request(app)
      .get(`/api/v1/verify/hash/${unknown}`)
      .expect(200);

    const data = response.body.data ?? response.body;
    expect(data.found).toBe(false);
  });

  it('rejects malformed hashes with 400', async () => {
    const response = await request(app)
      .get('/api/v1/verify/hash/not-a-hash')
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
