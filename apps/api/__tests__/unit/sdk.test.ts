import { createHmac, createHash } from 'node:crypto';
import { verifyWebhookSignature, hashDocument, TrazaClient, TrazaApiError } from 'traza-sdk';

// Mirrors the exact signing in src/services/webhookDispatcher.ts
function signLikeDispatcher(payload: Record<string, unknown>, secret: string): string {
  const body = JSON.stringify(payload);
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('traza-sdk', () => {
  describe('verifyWebhookSignature', () => {
    const secret = 'whsec_test_123';
    const payload = { event: 'document.completed', data: { documentId: 'abc' } };
    const rawBody = JSON.stringify(payload);

    it('accepts a signature produced by the dispatcher scheme', () => {
      const header = signLikeDispatcher(payload, secret);
      expect(verifyWebhookSignature(rawBody, header, secret)).toBe(true);
    });

    it('rejects a tampered body', () => {
      const header = signLikeDispatcher(payload, secret);
      const tampered = rawBody.replace('abc', 'xyz');
      expect(verifyWebhookSignature(tampered, header, secret)).toBe(false);
    });

    it('rejects a wrong secret', () => {
      const header = signLikeDispatcher(payload, secret);
      expect(verifyWebhookSignature(rawBody, header, 'wrong')).toBe(false);
    });

    it('rejects missing or malformed headers', () => {
      expect(verifyWebhookSignature(rawBody, undefined, secret)).toBe(false);
      expect(verifyWebhookSignature(rawBody, '', secret)).toBe(false);
      expect(verifyWebhookSignature(rawBody, 'sha256=nothex', secret)).toBe(false);
      expect(verifyWebhookSignature(rawBody, 'sha256=abcd', secret)).toBe(false);
    });

    it('accepts raw body as bytes (express.raw)', () => {
      const header = signLikeDispatcher(payload, secret);
      expect(verifyWebhookSignature(Buffer.from(rawBody), header, secret)).toBe(true);
    });
  });

  describe('hashDocument', () => {
    it('matches the fileHash format used by @traza/crypto', () => {
      const buffer = Buffer.from('test document content');
      const expected = createHash('sha256').update(buffer).digest('hex');
      expect(hashDocument(buffer)).toBe(expected);
      expect(hashDocument(buffer)).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('TrazaClient', () => {
    it('requires an apiKey', () => {
      expect(() => new TrazaClient({ apiKey: '' })).toThrow();
    });

    it('sends X-API-Key and parses responses', async () => {
      const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
      const fakeFetch = (async (url: unknown, init?: unknown) => {
        calls.push({ url: String(url), init: init as RequestInit });
        return new Response(JSON.stringify({ id: 'doc_1', status: 'DRAFT' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      const client = new TrazaClient({
        apiKey: 'tk_test',
        baseUrl: 'https://api.example.com/',
        fetch: fakeFetch,
      });
      const doc = await client.documents.get('doc_1');

      expect(doc).toMatchObject({ id: 'doc_1' });
      expect(calls[0]!.url).toBe('https://api.example.com/api/v1/documents/doc_1');
      expect((calls[0]!.init?.headers as Record<string, string>)['X-API-Key']).toBe('tk_test');
    });

    it('omits the API key on public verify endpoints and throws typed errors', async () => {
      const fakeFetch = (async (url: unknown, init?: unknown) => {
        const headers = (init as RequestInit | undefined)?.headers as Record<string, string>;
        expect(headers?.['X-API-Key']).toBeUndefined();
        return new Response(
          JSON.stringify({ error: { code: 'INVALID_HASH', message: 'bad hash' } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }) as typeof fetch;

      const client = new TrazaClient({ apiKey: 'tk_test', fetch: fakeFetch });
      await expect(client.verify.byHash('nope')).rejects.toMatchObject({
        name: 'TrazaApiError',
        status: 400,
        code: 'INVALID_HASH',
      });
      await expect(client.verify.byHash('nope')).rejects.toBeInstanceOf(TrazaApiError);
    });
  });
});
