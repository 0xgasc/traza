-- Template model (reusable document with pre-placed fields)
CREATE TABLE IF NOT EXISTS "Template" (
  "id"          TEXT NOT NULL,
  "ownerId"     TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "fileUrl"     TEXT NOT NULL,
  "fileHash"    TEXT NOT NULL,
  "pageCount"   INTEGER,
  "useCount"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Template_ownerId_idx" ON "Template"("ownerId");

ALTER TABLE "Template" ADD CONSTRAINT "Template_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TemplateField model (pre-placed fields saved with template)
CREATE TABLE IF NOT EXISTS "TemplateField" (
  "id"          TEXT NOT NULL,
  "templateId"  TEXT NOT NULL,
  "signerRole"  TEXT NOT NULL DEFAULT 'Signer 1',
  "fieldType"   "FieldType" NOT NULL,
  "page"        INTEGER NOT NULL,
  "positionX"   DECIMAL(65,30) NOT NULL,
  "positionY"   DECIMAL(65,30) NOT NULL,
  "width"       DECIMAL(65,30) NOT NULL,
  "height"      DECIMAL(65,30) NOT NULL,
  "required"    BOOLEAN NOT NULL DEFAULT true,
  "label"       TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TemplateField_templateId_idx" ON "TemplateField"("templateId");

ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recipient model (CC recipients who get a copy but don't sign)
CREATE TABLE IF NOT EXISTS "Recipient" (
  "id"          TEXT NOT NULL,
  "documentId"  TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "notifiedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Recipient_documentId_idx" ON "Recipient"("documentId");

ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add accessCode to Signature (optional PIN to open signing link)
ALTER TABLE "Signature" ADD COLUMN IF NOT EXISTS "accessCode" TEXT;
ALTER TABLE "Signature" ADD COLUMN IF NOT EXISTS "accessCodeVerifiedAt" TIMESTAMP(3);

-- Add templateId to Document (track which template was used)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
