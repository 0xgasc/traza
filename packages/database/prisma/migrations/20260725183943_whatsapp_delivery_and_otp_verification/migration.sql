-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('NONE', 'EMAIL_OTP', 'WHATSAPP_OTP');

-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "allowedIps" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Signature" ADD COLUMN     "deliveryChannel" "DeliveryChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT,
ADD COLUMN     "otpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "signerPhone" TEXT,
ADD COLUMN     "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Template" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TemplateField" ALTER COLUMN "updatedAt" DROP DEFAULT;
