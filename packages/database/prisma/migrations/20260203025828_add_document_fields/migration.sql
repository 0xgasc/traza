-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('SIGNATURE', 'DATE', 'TEXT', 'INITIALS', 'CHECKBOX');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "pdfFileUrl" TEXT;

-- CreateTable
CREATE TABLE "DocumentField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signatureId" TEXT,
    "signerEmail" TEXT,
    "fieldType" "FieldType" NOT NULL,
    "page" INTEGER NOT NULL,
    "positionX" DECIMAL(65,30) NOT NULL,
    "positionY" DECIMAL(65,30) NOT NULL,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "signatureId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "filledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentField_documentId_idx" ON "DocumentField"("documentId");

-- CreateIndex
CREATE INDEX "DocumentField_signatureId_idx" ON "DocumentField"("signatureId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_fieldId_key" ON "FieldValue"("fieldId");

-- CreateIndex
CREATE INDEX "FieldValue_signatureId_idx" ON "FieldValue"("signatureId");

-- AddForeignKey
ALTER TABLE "DocumentField" ADD CONSTRAINT "DocumentField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentField" ADD CONSTRAINT "DocumentField_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "DocumentField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
