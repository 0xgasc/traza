import { Resend } from 'resend';
import { render } from '@react-email/render';
import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';
import { SignatureRequest } from '../emails/SignatureRequest.js';
import { DocumentCompleted } from '../emails/DocumentCompleted.js';
import { Reminder } from '../emails/Reminder.js';
import { ExpirationNotice } from '../emails/ExpirationNotice.js';
import { OrgInvitation } from '../emails/OrgInvitation.js';
import { SignatureDeclined } from '../emails/SignatureDeclined.js';

let resend: Resend | null = null;

export function getResendClient(): Resend | null {
  return getResend();
}

function getResend(): Resend | null {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
}

async function sendEmail(to: string, subject: string, html: string) {
  const client = getResend();
  const env = getEnv();

  if (!client) {
    logger.warn(`[email] RESEND_API_KEY not set — skipping email to ${to}: "${subject}"`);
    return;
  }

  const { error } = await client.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error(`[email] Failed to send to ${to}:`, error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
}

export async function sendSignatureRequestEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: Date;
  message?: string;
  locale?: string; // Language for email content (en, es)
}) {
  const locale = params.locale || 'en';
  const html = await render(
    SignatureRequest({
      recipientName: params.recipientName,
      senderName: params.senderName,
      documentTitle: params.documentTitle,
      signingUrl: params.signingUrl,
      expiresAt: params.expiresAt,
      message: params.message,
      locale,
    }),
  );

  // Localized email subjects
  const subjects = {
    en: `${params.senderName} sent you a document to sign`,
    es: `${params.senderName} te envió un documento para firmar`,
  };

  await sendEmail(
    params.to,
    subjects[locale as keyof typeof subjects] || subjects.en,
    html,
  );
}

export async function sendDocumentCompletedEmail(params: {
  to: string;
  recipientName: string;
  documentTitle: string;
  completedAt: Date;
  totalSigners: number;
  downloadUrl: string;
  locale?: string; // Language for email content (en, es)
}) {
  const locale = params.locale || 'en';
  const html = await render(
    DocumentCompleted({
      recipientName: params.recipientName,
      documentTitle: params.documentTitle,
      completedAt: params.completedAt,
      totalSigners: params.totalSigners,
      downloadUrl: params.downloadUrl,
      locale,
    }),
  );

  // Localized email subjects
  const subjects = {
    en: `"${params.documentTitle}" has been fully signed`,
    es: `"${params.documentTitle}" ha sido firmado completamente`,
  };

  await sendEmail(
    params.to,
    subjects[locale as keyof typeof subjects] || subjects.en,
    html,
  );
}

export async function sendReminderEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: Date;
  locale?: string; // Language for email content (en, es)
}) {
  const locale = params.locale || 'en';
  const html = await render(
    Reminder({
      recipientName: params.recipientName,
      senderName: params.senderName,
      documentTitle: params.documentTitle,
      signingUrl: params.signingUrl,
      expiresAt: params.expiresAt,
      locale,
    }),
  );

  // Localized email subjects
  const subjects = {
    en: `Reminder: "${params.documentTitle}" needs your signature`,
    es: `Recordatorio: "${params.documentTitle}" necesita tu firma`,
  };

  await sendEmail(
    params.to,
    subjects[locale as keyof typeof subjects] || subjects.en,
    html,
  );
}

export async function sendExpirationNoticeEmail(params: {
  to: string;
  recipientName: string;
  documentTitle: string;
  expiredAt: Date;
  senderEmail: string;
}) {
  const html = await render(
    ExpirationNotice({
      recipientName: params.recipientName,
      documentTitle: params.documentTitle,
      expiredAt: params.expiredAt,
      senderEmail: params.senderEmail,
    }),
  );

  await sendEmail(
    params.to,
    `Signing link for "${params.documentTitle}" has expired`,
    html,
  );
}

export async function sendSignatureDeclinedEmail(params: {
  to: string;
  recipientName: string;
  documentTitle: string;
  signerName: string;
  signerEmail: string;
  declinedAt: Date;
  reason?: string;
  documentUrl: string;
  locale?: string; // Language for email content (en, es)
}) {
  const locale = params.locale || 'en';
  const html = await render(
    SignatureDeclined({
      recipientName: params.recipientName,
      documentTitle: params.documentTitle,
      signerName: params.signerName,
      signerEmail: params.signerEmail,
      declinedAt: params.declinedAt,
      reason: params.reason,
      documentUrl: params.documentUrl,
      locale,
    }),
  );

  // Localized email subjects
  const subjects = {
    en: `${params.signerName} declined to sign "${params.documentTitle}"`,
    es: `${params.signerName} rechazó firmar "${params.documentTitle}"`,
  };

  await sendEmail(
    params.to,
    subjects[locale as keyof typeof subjects] || subjects.en,
    html,
  );
}

export async function sendOrgInvitationEmail(params: {
  to: string;
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: string;
  token: string;
  expiresAt: Date;
}) {
  const env = getEnv();
  const acceptUrl = `${env.APP_URL}/invite/${params.token}`;

  const html = await render(
    OrgInvitation({
      inviteeName: params.inviteeName,
      inviterName: params.inviterName,
      organizationName: params.organizationName,
      role: params.role,
      acceptUrl,
      expiresAt: params.expiresAt,
    }),
  );

  await sendEmail(
    params.to,
    `${params.inviterName} invited you to join ${params.organizationName}`,
    html,
  );
}
