import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

// WhatsApp delivery adapter. Provider selected by WHATSAPP_PROVIDER:
//   stub — logs the message and reports success (default; safe everywhere)
//   meta — WhatsApp Cloud API (requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID)
// Callers must treat failures as non-fatal: WhatsApp never blocks the email path.

export interface WhatsAppSendResult {
  delivered: boolean;
  provider: 'stub' | 'meta';
  providerMessageId?: string;
  error?: string;
}

interface WhatsAppProvider {
  name: 'stub' | 'meta';
  sendText(phone: string, text: string): Promise<WhatsAppSendResult>;
}

// Test hook: stub sends are recorded here so the flow can be asserted
// without any external provider. Bounded to avoid growing unbounded in dev.
export const stubOutbox: Array<{ phone: string; text: string; at: Date }> = [];
const STUB_OUTBOX_LIMIT = 50;

const stubProvider: WhatsAppProvider = {
  name: 'stub',
  async sendText(phone, text) {
    stubOutbox.push({ phone, text, at: new Date() });
    if (stubOutbox.length > STUB_OUTBOX_LIMIT) stubOutbox.shift();
    logger.info(`[whatsapp:stub] to=${phone} text="${text.slice(0, 120)}..."`);
    return { delivered: true, provider: 'stub', providerMessageId: `stub-${Date.now()}` };
  },
};

const metaProvider: WhatsAppProvider = {
  name: 'meta',
  async sendText(phone, text) {
    const env = getEnv();
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return {
        delivered: false,
        provider: 'meta',
        error: 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured',
      };
    }
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/^\+/, ''),
          type: 'text',
          text: { body: text, preview_url: true },
        }),
      },
    );
    const body = (await res.json().catch(() => null)) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      return {
        delivered: false,
        provider: 'meta',
        error: body?.error?.message ?? `HTTP ${res.status}`,
      };
    }
    return {
      delivered: true,
      provider: 'meta',
      providerMessageId: body?.messages?.[0]?.id,
    };
  },
};

export function getWhatsAppProvider(): WhatsAppProvider {
  return getEnv().WHATSAPP_PROVIDER === 'meta' ? metaProvider : stubProvider;
}

function signingLinkText(params: {
  signerName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  locale: string;
}): string {
  if (params.locale === 'es') {
    return (
      `Hola ${params.signerName} 👋\n\n` +
      `${params.senderName} te envió "${params.documentTitle}" para firmar con Traza.\n\n` +
      `Firma aquí (enlace seguro, no necesitas cuenta):\n${params.signingUrl}`
    );
  }
  return (
    `Hi ${params.signerName} 👋\n\n` +
    `${params.senderName} sent you "${params.documentTitle}" to sign with Traza.\n\n` +
    `Sign here (secure link, no account needed):\n${params.signingUrl}`
  );
}

export async function sendSigningLinkWhatsApp(params: {
  phone: string;
  signerName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  locale: string;
}): Promise<WhatsAppSendResult> {
  const provider = getWhatsAppProvider();
  try {
    const result = await provider.sendText(params.phone, signingLinkText(params));
    if (!result.delivered) {
      logger.error(`[whatsapp:${provider.name}] signing link to ${params.phone} failed: ${result.error}`);
    }
    return result;
  } catch (err) {
    logger.error(`[whatsapp:${provider.name}] signing link to ${params.phone} threw:`, err);
    return { delivered: false, provider: provider.name, error: String(err) };
  }
}

export async function sendOtpWhatsApp(params: {
  phone: string;
  code: string;
  locale: string;
}): Promise<WhatsAppSendResult> {
  const provider = getWhatsAppProvider();
  const text =
    params.locale === 'es'
      ? `Tu código de verificación Traza es: ${params.code}\n\nExpira en 10 minutos. No lo compartas.`
      : `Your Traza verification code is: ${params.code}\n\nIt expires in 10 minutes. Don't share it.`;
  try {
    const result = await provider.sendText(params.phone, text);
    if (!result.delivered) {
      logger.error(`[whatsapp:${provider.name}] OTP to ${params.phone} failed: ${result.error}`);
    }
    return result;
  } catch (err) {
    logger.error(`[whatsapp:${provider.name}] OTP to ${params.phone} threw:`, err);
    return { delivered: false, provider: provider.name, error: String(err) };
  }
}
