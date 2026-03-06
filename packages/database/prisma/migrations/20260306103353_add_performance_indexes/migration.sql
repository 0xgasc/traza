-- CreateIndex: Optimize signature queries by document and status
CREATE INDEX IF NOT EXISTS "Signature_documentId_status_idx" ON "Signature"("documentId", "status");

-- CreateIndex: Optimize signature lookups by email
CREATE INDEX IF NOT EXISTS "Signature_signerEmail_idx" ON "Signature"("signerEmail");

-- CreateIndex: Optimize signature queries sorted by date and status
CREATE INDEX IF NOT EXISTS "Signature_status_createdAt_idx" ON "Signature"("status", "createdAt");

-- CreateIndex: Optimize field queries by document and page
CREATE INDEX IF NOT EXISTS "DocumentField_documentId_page_idx" ON "DocumentField"("documentId", "page");

-- CreateIndex: Optimize field lookups by signer email
CREATE INDEX IF NOT EXISTS "DocumentField_signerEmail_idx" ON "DocumentField"("signerEmail");

-- CreateIndex: Optimize document queries by status and date
CREATE INDEX IF NOT EXISTS "Document_status_createdAt_idx" ON "Document"("status", "createdAt");

-- CreateIndex: Optimize document queries by owner and date
CREATE INDEX IF NOT EXISTS "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");

-- CreateIndex: Optimize document queries by organization and date
CREATE INDEX IF NOT EXISTS "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");
