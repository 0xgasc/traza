-- Branding fields on User
ALTER TABLE "User" ADD COLUMN "brandingLogoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "brandingColor" TEXT;

-- Delegation fields on Signature
ALTER TABLE "Signature" ADD COLUMN "delegatedToEmail" TEXT;
ALTER TABLE "Signature" ADD COLUMN "delegatedToName" TEXT;
ALTER TABLE "Signature" ADD COLUMN "delegatedAt" TIMESTAMP(3);

-- Tags
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Tag_userId_name_key" UNIQUE ("userId", "name"),
  CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- DocumentTag junction table
CREATE TABLE "DocumentTag" (
  "documentId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "DocumentTag_pkey" PRIMARY KEY ("documentId", "tagId"),
  CONSTRAINT "DocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
