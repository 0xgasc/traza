-- AlterTable: make User.passwordHash nullable (signer accounts use magic links, no password)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable: add signer account fields to User
ALTER TABLE "User" ADD COLUMN "isSignerAccount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "savedSignatureData" TEXT;
ALTER TABLE "User" ADD COLUMN "savedSignatureUpdatedAt" TIMESTAMP(3);

-- AlterTable: link Signature to signer account
ALTER TABLE "Signature" ADD COLUMN "signerUserId" TEXT;

-- CreateTable: magic link tokens for signer authentication
CREATE TABLE "SignerMagicToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignerMagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignerMagicToken_tokenHash_key" ON "SignerMagicToken"("tokenHash");
CREATE INDEX "SignerMagicToken_email_idx" ON "SignerMagicToken"("email");
CREATE INDEX "User_isSignerAccount_idx" ON "User"("isSignerAccount");
CREATE INDEX "Signature_signerUserId_idx" ON "Signature"("signerUserId");

-- AddForeignKey: Signature -> User (signer account)
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signerUserId_fkey"
    FOREIGN KEY ("signerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
