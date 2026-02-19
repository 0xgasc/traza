import { z } from 'zod';

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
});

export const listDocumentsSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'SIGNED', 'EXPIRED', 'VOID']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  tagId: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsSchema>;
