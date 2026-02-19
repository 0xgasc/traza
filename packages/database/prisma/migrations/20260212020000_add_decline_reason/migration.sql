-- Add declineReason to Signature table
ALTER TABLE "Signature" ADD COLUMN IF NOT EXISTS "declineReason" TEXT;
