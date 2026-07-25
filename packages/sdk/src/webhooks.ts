import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a Traza webhook delivery.
 *
 * Traza signs every delivery with HMAC-SHA256 over the raw request body and
 * sends it as the `X-Traza-Signature` header in the form `sha256=<hex>`.
 *
 * IMPORTANT: pass the RAW body bytes exactly as received (e.g. from
 * express.raw() or the unparsed request stream) — re-serializing parsed JSON
 * may produce different bytes and fail verification.
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | undefined | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const received = signatureHeader.replace(/^sha256=/, "").trim();
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const receivedBuf = Buffer.from(received, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (receivedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(receivedBuf, expectedBuf);
}

/** Compute the SHA-256 hex digest of a file buffer — matches Traza's fileHash. */
export function hashDocument(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
