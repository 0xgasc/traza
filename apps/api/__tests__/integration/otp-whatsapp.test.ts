import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../src/app.js';
import { prisma } from '@traza/database';
import { generateSigningToken } from '../../src/utils/signingToken.js';
import { stubOutbox, sendSigningLinkWhatsApp } from '../../src/services/whatsapp.service.js';

describe('WhatsApp stub adapter', () => {
  it('records signing-link sends in the stub outbox', async () => {
    const before = stubOutbox.length;
    const result = await sendSigningLinkWhatsApp({
      phone: '+50255512345',
      signerName: 'María',
      senderName: 'Carlos',
      documentTitle: 'Contrato de prueba',
      signingUrl: 'https://example.com/es/sign/tok',
      locale: 'es',
    });

    expect(result.delivered).toBe(true);
    expect(result.provider).toBe('stub');
    expect(stubOutbox.length).toBe(before + 1);
    const last = stubOutbox[stubOutbox.length - 1]!;
    expect(last.phone).toBe('+50255512345');
    expect(last.text).toContain('Contrato de prueba');
    expect(last.text).toContain('https://example.com/es/sign/tok');
  });
});

describe('OTP signer verification', () => {
  let documentId: string;
  let token: string;
  let signatureId: string;

  beforeAll(async () => {
    const doc = await prisma.document.create({
      data: {
        title: 'OTP Test Doc',
        fileUrl: 's3://test/otp-test.pdf',
        fileHash: randomUUID().replace(/-/g, '').padEnd(64, '0'),
        status: 'PENDING',
        emailLocale: 'es',
      },
    });
    documentId = doc.id;

    const signature = await prisma.signature.create({
      data: {
        documentId,
        signerEmail: 'otp-signer@test.local',
        signerName: 'OTP Signer',
        order: 1,
        token: randomUUID(),
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'PENDING',
        signerPhone: '+50255598765',
        deliveryChannel: 'BOTH',
        verificationLevel: 'WHATSAPP_OTP',
      },
    });
    signatureId = signature.id;

    token = generateSigningToken(
      { signatureId, documentId, signerEmail: 'otp-signer@test.local' },
      1,
    );
    await prisma.signature.update({ where: { id: signatureId }, data: { token } });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { documentId } });
    await prisma.document.delete({ where: { id: documentId } });
    await prisma.$disconnect();
  });

  it('blocks submission before OTP verification (server-side gate)', async () => {
    const response = await request(app)
      .post(`/api/v1/sign/${token}`)
      .send({ signatureData: 'data:image/png;base64,aGk=', signatureType: 'drawn' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('OTP_REQUIRED');
  });

  it('rejects verify before any code was requested', async () => {
    const response = await request(app)
      .post(`/api/v1/sign/${token}/otp/verify`)
      .send({ code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('OTP_NOT_REQUESTED');
  });

  it('requests an OTP via the WhatsApp stub and verifies it', async () => {
    const before = stubOutbox.length;
    const requestRes = await request(app)
      .post(`/api/v1/sign/${token}/otp/request`)
      .send({});

    expect(requestRes.status).toBe(200);
    expect(requestRes.body.sent).toBe(true);
    expect(requestRes.body.channel).toBe('whatsapp');
    expect(stubOutbox.length).toBe(before + 1);

    // Pull the 6-digit code out of the stubbed WhatsApp message
    const code = stubOutbox[stubOutbox.length - 1]!.text.match(/\b(\d{6})\b/)?.[1];
    expect(code).toBeDefined();

    const wrong = await request(app)
      .post(`/api/v1/sign/${token}/otp/verify`)
      .send({ code: code === '000000' ? '000001' : '000000' });
    expect(wrong.status).toBe(403);

    const right = await request(app)
      .post(`/api/v1/sign/${token}/otp/verify`)
      .send({ code });
    expect(right.status).toBe(200);
    expect(right.body.verified).toBe(true);

    const sig = await prisma.signature.findUnique({ where: { id: signatureId } });
    expect(sig?.otpVerifiedAt).not.toBeNull();
  });

  it('locks after too many wrong attempts', async () => {
    // Fresh code, then exhaust the attempt budget directly (burning it over
    // HTTP would trip the shared accessCodeLimiter and mask the OTP lock)
    await request(app).post(`/api/v1/sign/${token}/otp/request`).send({});
    await prisma.signature.update({
      where: { id: signatureId },
      data: { otpAttempts: 5, otpVerifiedAt: null },
    });
    const locked = await request(app)
      .post(`/api/v1/sign/${token}/otp/verify`)
      .send({ code: '999999' });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('OTP_LOCKED');
  });
});
