import { z } from 'zod';

export const sendForSigningSchema = z.object({
  signers: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(100),
        order: z.number().int().positive().optional(),
      }),
    )
    .min(1, 'At least one signer is required')
    .max(20),
  message: z.string().max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(7),
});

export const submitSignatureSchema = z.object({
  signatureData: z.string().min(1).optional(),
  signatureType: z.enum(['drawn', 'typed', 'uploaded']).optional(),
  fieldValues: z.array(
    z.object({
      fieldId: z.string().uuid(),
      value: z.string().min(1),
    })
  ).optional(),
}).refine(
  (data) => data.signatureData || (data.fieldValues && data.fieldValues.length > 0),
  { message: 'Either signatureData or fieldValues must be provided' }
);

export const declineSignatureSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type SendForSigningInput = z.infer<typeof sendForSigningSchema>;
export type SubmitSignatureInput = z.infer<typeof submitSignatureSchema>;
