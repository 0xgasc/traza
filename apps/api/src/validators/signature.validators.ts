import { z } from 'zod';

const signerSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    order: z.number().int().positive().optional(),
    accessCode: z.string().min(4).max(16).optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format, e.g. +50255512345')
      .optional(),
    deliveryChannel: z.enum(['EMAIL', 'WHATSAPP', 'BOTH']).default('EMAIL'),
    verificationLevel: z.enum(['NONE', 'EMAIL_OTP', 'WHATSAPP_OTP']).default('NONE'),
  })
  .superRefine((signer, ctx) => {
    const needsPhone =
      signer.deliveryChannel !== 'EMAIL' || signer.verificationLevel === 'WHATSAPP_OTP';
    if (needsPhone && !signer.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'phone is required for WhatsApp delivery or WhatsApp OTP verification',
      });
    }
  });

export const sendForSigningSchema = z.object({
  signers: z
    .array(signerSchema)
    .min(1, 'At least one signer is required')
    .max(100, 'Maximum 100 signers allowed per document'), // Increased from 20 to 100
  message: z.string().max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(7),
  emailLocale: z.enum(['en', 'es']).optional().default('en'),
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
