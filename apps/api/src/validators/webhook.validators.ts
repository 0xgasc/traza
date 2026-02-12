import { z } from 'zod';

const VALID_EVENTS = [
  'document.sent',
  'document.viewed',
  'document.signed',
  'document.completed',
  'document.expired',
  'document.declined',
] as const;

export const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z
    .array(z.enum(VALID_EVENTS))
    .min(1, 'At least one event is required'),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
