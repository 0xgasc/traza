-- Add VOID to DocumentStatus enum
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- Add voidedAt and voidReason to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;

-- Add reminderSentAt to Signature
ALTER TABLE "Signature" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
