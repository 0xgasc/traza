# Claude Code Prompts: E-Signature Platform

This document contains ready-to-use prompts for Claude Code to build the complete e-signature platform. Use these sequentially or as needed for specific components.

---

## 1. Initial Project Setup

```
Create a new TypeScript monorepo for an e-signature platform with:

Structure:
- /apps/api - Backend API (Node.js + Express + TypeScript)
- /apps/web - Frontend (Next.js 14 + TypeScript)
- /packages/database - Prisma schema and migrations
- /packages/crypto - Cryptographic utilities
- /packages/ui - Shared React components

Setup requirements:
- Use pnpm workspaces
- Configure TypeScript strict mode
- Setup ESLint + Prettier
- Add .env.example files

Initialize with package.json scripts for:
- dev (run all apps)
- build
- test
- lint
```

---

## 2. Database Schema & Prisma Setup

```
Setup Prisma with PostgreSQL for an e-signature platform.

Database schema requirements:

Users:
- id (uuid, primary key)
- email (unique, lowercase)
- passwordHash
- name
- planTier (enum: FREE, STARTER, PRO, PROOF, ENTERPRISE)
- apiKeyHash (nullable)
- createdAt
- updatedAt

Documents:
- id (uuid, primary key)
- ownerId (foreign key -> Users)
- title
- fileUrl (S3 path)
- fileHash (SHA-256, indexed)
- status (enum: DRAFT, PENDING, SIGNED, EXPIRED)
- expiresAt (nullable)
- blockchainTxHash (nullable)
- blockchainNetwork (nullable)
- createdAt
- updatedAt

Signatures:
- id (uuid, primary key)
- documentId (foreign key -> Documents)
- signerEmail
- signerName
- signedAt (nullable)
- ipAddress
- userAgent
- signatureType (enum: ELECTRONIC, PKI)
- certificateData (json, nullable)

AuditLogs:
- id (uuid, primary key)
- documentId (foreign key -> Documents)
- eventType (string, indexed)
- actorId (uuid, nullable)
- ipAddress
- metadata (json)
- timestamp

Add proper indexes for:
- Documents.fileHash
- Documents.ownerId + status
- Signatures.documentId
- AuditLogs.documentId + timestamp

Generate migration and seed script with test data.
```

---

## 3. Backend Authentication System

```
Build a complete authentication system for the e-signature platform API.

Requirements:

JWT Authentication:
- Access tokens (15 min expiry)
- Refresh tokens (7 day expiry, stored in httpOnly cookies)
- Token rotation on refresh

Password Security:
- bcrypt hashing (12 rounds)
- Password strength validation
- Rate limiting on login attempts

API Key Authentication:
- Generate cryptographically secure API keys
- Hash before storing in database
- Support key rotation
- Add scopes/permissions per key

Endpoints:
POST /api/v1/auth/register
  - Validate email + password
  - Create user
  - Return access + refresh tokens

POST /api/v1/auth/login
  - Verify credentials
  - Return tokens
  - Log audit event

POST /api/v1/auth/refresh
  - Validate refresh token
  - Issue new access token
  - Rotate refresh token

POST /api/v1/auth/logout
  - Invalidate refresh token

POST /api/v1/auth/api-key
  - Generate new API key
  - Return unhashed key (only time visible)

Middleware:
- requireAuth (JWT validation)
- requireApiKey (API key validation)
- Either auth method accepted

Use Express.js with proper error handling.
```

---

## 4. Document Upload & Storage Service

```
Create a document upload and storage service with S3-compatible storage.

Features:

Document Upload:
- Multipart form upload
- Support PDF, DOCX, TXT
- Max file size: 25MB
- Validate file type via magic numbers (not just extension)
- Generate unique filename (uuid + extension)

S3 Integration:
- Use AWS SDK v3 or compatible client
- Upload to encrypted bucket
- Generate SHA-256 hash before upload
- Store metadata in database

Security:
- Virus scanning integration hook
- Sanitize filenames
- Prevent directory traversal
- Rate limit uploads (5 per minute)

Database Operations:
- Create Document record
- Store file hash, URL, metadata
- Create audit log entry

API Endpoint:
POST /api/v1/documents
  - Multipart upload
  - Return document ID and hash
  - Queue for processing if needed

GET /api/v1/documents/:id/download
  - Generate pre-signed S3 URL (expires in 1 hour)
  - Check authorization
  - Log access

Include comprehensive error handling and TypeScript types.
```

---

## 5. Cryptographic Hash Service

```
Build a cryptographic service for document integrity verification.

Requirements:

Document Hashing:
- SHA-256 hash generation from file buffer
- Hex encoding
- Merkle tree support for multi-file batches

Hash Storage:
- Store in database with timestamp
- Index for fast lookup
- Immutable after creation

Verification Functions:
- Verify document matches stored hash
- Check hash hasn't been altered
- Generate proof of integrity

API:
GET /api/v1/documents/:id/verify
  - Re-hash uploaded document
  - Compare with stored hash
  - Return verification result + timestamp

POST /api/v1/documents/:id/proof
  - Generate cryptographic proof bundle (JSON)
  - Include: hash, timestamp, blockchain info (if anchored)
  - Sign with platform private key
  - Return downloadable proof

Utility Functions:
```typescript
// packages/crypto/src/hash.ts
export function hashDocument(buffer: Buffer): string;
export function verifyHash(buffer: Buffer, expectedHash: string): boolean;
export function generateProofBundle(document: Document): ProofBundle;
```

Include comprehensive unit tests.
```

---

## 6. Blockchain Anchoring Service (Polygon)

```
Implement blockchain anchoring service for document hashes on Polygon.

Smart Contract (Solidity):
```solidity
// DocumentRegistry.sol
contract DocumentRegistry {
  mapping(bytes32 => uint256) public documentHashes;
  
  event DocumentAnchored(
    bytes32 indexed hash,
    uint256 timestamp,
    address indexed anchor
  );
  
  function anchor(bytes32 hash) external {
    require(documentHashes[hash] == 0, "Already anchored");
    documentHashes[hash] = block.timestamp;
    emit DocumentAnchored(hash, block.timestamp, msg.sender);
  }
  
  function verify(bytes32 hash) external view returns (uint256) {
    return documentHashes[hash];
  }
}
```

Backend Service:
- Use ethers.js v6
- Connect to Polygon Mumbai (testnet) or Polygon mainnet
- Batch anchoring to save gas (up to 10 hashes per tx)
- Queue system for async processing
- Retry logic for failed transactions

Functions:
```typescript
// packages/crypto/src/blockchain.ts
export async function anchorHash(hash: string): Promise<string>; // Returns tx hash
export async function verifyOnChain(hash: string): Promise<boolean>;
export async function getAnchorTimestamp(hash: string): Promise<Date | null>;
```

Environment Variables:
- POLYGON_RPC_URL
- PRIVATE_KEY (encrypted at rest)
- CONTRACT_ADDRESS

API Endpoint:
POST /api/v1/documents/:id/anchor
  - Check if already anchored
  - Queue for blockchain anchoring
  - Return tx hash when complete

Include deployment script for smart contract.
```

---

## 7. Signature Workflow Engine

```
Build the core signature workflow system.

Signature Request:
- Create signature request for document
- Send email to signers
- Generate unique signing token (JWT with expiry)
- Track status (pending → signed → completed)

Signing Process:
- Validate signing token
- Render document with signature fields
- Capture:
  - Electronic signature (drawn or typed)
  - IP address
  - User agent
  - Timestamp
  - Geolocation (optional)

Completion:
- Mark signature as complete
- Update document status
- Generate signed PDF with signature overlay
- Trigger webhooks
- Send completion emails

API Endpoints:
POST /api/v1/documents/:id/send
  Body: {
    signers: [{ email, name, order }],
    message: string,
    expiresIn: number (days)
  }
  - Create signature requests
  - Generate tokens
  - Send emails
  - Return request IDs

GET /api/v1/signatures/token/:token
  - Validate token
  - Return document + signer info
  - Track view event

POST /api/v1/signatures/token/:token/sign
  Body: {
    signatureData: string (base64 image),
    signatureType: 'drawn' | 'typed'
  }
  - Save signature
  - Update status
  - Create audit log
  - Check if all signers complete
  - Trigger completion flow

Email Templates:
- Signature request
- Signature reminder
- Document completed
- Document expired

Use nodemailer or similar for email sending.
```

---

## 8. REST API with Express

```
Build the complete REST API with Express + TypeScript.

Structure:
/src
  /routes
    /auth.routes.ts
    /documents.routes.ts
    /signatures.routes.ts
    /webhooks.routes.ts
  /controllers
  /middleware
    - auth.middleware.ts
    - validation.middleware.ts
    - rateLimit.middleware.ts
    - error.middleware.ts
  /services
  /utils
  server.ts

Requirements:

Global Middleware:
- helmet (security headers)
- cors (configured for production)
- express.json()
- express-rate-limit
- morgan (logging)

Error Handling:
- Centralized error handler
- Proper HTTP status codes
- Error response format:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid email format",
      "details": []
    }
  }
  ```

Validation:
- Use Zod for request validation
- Validate all inputs
- Return clear validation errors

Rate Limiting:
- General API: 100 req/min
- Auth endpoints: 5 req/min
- Upload endpoint: 5 req/min
- Different limits by plan tier

Health Check:
GET /health
  - Check database connection
  - Check S3 connection
  - Return service status

API Versioning:
- All routes under /api/v1
- Version in path, not headers

Include comprehensive API documentation comments for auto-generating OpenAPI spec.
```

---

## 9. Webhook System

```
Implement a webhook system for real-time event notifications.

Events:
- document.sent
- document.viewed
- document.signed
- document.completed
- document.expired
- document.declined

Webhook Management:
- CRUD operations for webhook endpoints
- HMAC signature for payload verification
- Automatic retry with exponential backoff (3 attempts)
- Dead letter queue for failed deliveries
- Webhook logs for debugging

Database Schema (add to Prisma):
```prisma
model Webhook {
  id          String   @id @default(uuid())
  userId      String
  url         String
  events      String[] // Array of event types
  secret      String   // HMAC secret
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
  deliveries  WebhookDelivery[]
}

model WebhookDelivery {
  id           String   @id @default(uuid())
  webhookId    String
  eventType    String
  payload      Json
  responseCode Int?
  responseBody String?
  attempts     Int      @default(0)
  deliveredAt  DateTime?
  createdAt    DateTime @default(now())
  
  webhook      Webhook  @relation(fields: [webhookId], references: [id])
}
```

API Endpoints:
POST /api/v1/webhooks
  Body: { url, events: [] }
  - Validate URL
  - Generate HMAC secret
  - Test endpoint (send test ping)

GET /api/v1/webhooks
  - List user's webhooks

DELETE /api/v1/webhooks/:id
  - Remove webhook

GET /api/v1/webhooks/:id/deliveries
  - View delivery history

Service Functions:
```typescript
async function sendWebhook(
  webhookId: string,
  eventType: string,
  payload: any
): Promise<void>;

function signPayload(payload: any, secret: string): string;
function verifySignature(payload: any, signature: string, secret: string): boolean;
```

Use bull or similar for job queue.
```

---

## 10. Frontend: Next.js App with Neo-Brutalist Design

```
Build the Next.js frontend with neo-brutalist design system.

Setup:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui primitives (customized)

Design Tokens (tailwind.config.ts):
```typescript
theme: {
  extend: {
    colors: {
      black: '#000000',
      white: '#FFFFFF',
      stone: {
        100: '#F5F5F4',
        200: '#E7E5E4',
        300: '#D6D3D1',
        800: '#292524',
        900: '#1C1917',
      }
    },
    fontFamily: {
      sans: ['Inter', 'system-ui'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderWidth: {
      3: '3px',
      4: '4px',
    }
  }
}
```

Global CSS:
```css
* {
  @apply border-black;
}

body {
  @apply bg-white text-black font-sans antialiased;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-semibold tracking-tight;
}

/* Neo-brutalist button */
.btn {
  @apply px-6 py-3 bg-black text-white border-4 border-black
         font-semibold uppercase tracking-wide
         hover:bg-stone-900 transition-colors
         active:translate-x-0.5 active:translate-y-0.5;
}

/* Neo-brutalist input */
.input {
  @apply px-4 py-3 bg-white border-3 border-black
         focus:outline-none focus:ring-4 focus:ring-stone-300;
}

/* Neo-brutalist card */
.card {
  @apply bg-white border-4 border-black p-6;
}
```

Pages Structure:
- /app/(auth)/login
- /app/(auth)/register
- /app/dashboard
- /app/documents
- /app/documents/[id]
- /app/sign/[token]
- /app/settings

Key Components:
- DocumentUploader (drag-and-drop)
- SignatureCanvas (drawing signature)
- DocumentViewer (PDF rendering)
- StatusBadge
- AuditTimeline

Use tRPC or similar for type-safe API calls.
```

---

## 11. Document Signing Interface

```
Build the document signing interface with signature capture.

Features:

PDF Rendering:
- Use react-pdf or pdf.js
- Render full document
- Highlight signature fields
- Mobile-responsive

Signature Capture:
- Canvas-based drawing
- Touch support for mobile
- Typed text option
- Upload image option
- Clear/redo functionality

Signature Types:
```typescript
type SignatureType = 'drawn' | 'typed' | 'uploaded';

interface Signature {
  type: SignatureType;
  data: string; // base64
  width: number;
  height: number;
}
```

Signing Flow:
1. Load document via token
2. Show document with signature field highlighted
3. Capture signature
4. Preview placement
5. Confirm & submit
6. Show completion page

Component Structure:
```tsx
// app/sign/[token]/page.tsx
export default function SignPage({ params }) {
  // Fetch document
  // Render PDF
  // Show signature capture modal
  // Submit signature
}

// components/SignatureCapture.tsx
export function SignatureCapture({ onSave }) {
  // Canvas for drawing
  // Text input for typing
  // File upload for image
}

// components/DocumentViewer.tsx
export function DocumentViewer({ pdfUrl, signatureFields }) {
  // Render PDF
  // Highlight signature fields
  // Show signature overlay
}
```

Save signature as PNG overlay on final PDF.
```

---

## 12. Admin Dashboard

```
Create a comprehensive admin dashboard.

Pages:

/dashboard
- Overview stats (total docs, signatures, users)
- Recent activity
- Quick actions

/documents
- Table with all documents
- Filters: status, date range
- Search by title
- Actions: view, send, delete

/documents/new
- Upload document
- Add signature fields (drag-and-drop)
- Configure settings
- Send for signing

/documents/[id]
- Document details
- Signature status
- Audit trail
- Download signed copy
- Resend requests

/settings
- Account settings
- API keys management
- Webhook configuration
- Billing (Stripe integration)

Components:
```tsx
// components/StatsCard.tsx
export function StatsCard({ title, value, icon }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}

// components/DocumentTable.tsx
export function DocumentTable({ documents }) {
  // Table with sorting, filtering
  // Status badges
  // Action menu
}

// components/AuditTrail.tsx
export function AuditTrail({ logs }) {
  // Timeline of events
  // Timestamps, IP addresses
  // Actor information
}
```

Use React Query for data fetching and caching.
```

---

## 13. Email Templates & Sending Service

```
Create professional email templates and sending service.

Email Templates (React Email):

1. Signature Request:
```tsx
// emails/SignatureRequest.tsx
export function SignatureRequest({
  recipientName,
  senderName,
  documentTitle,
  signingUrl,
  expiresAt
}) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif' }}>
        <Container>
          <Heading>You have a document to sign</Heading>
          <Text>Hi {recipientName},</Text>
          <Text>
            {senderName} has sent you "{documentTitle}" for your signature.
          </Text>
          <Button href={signingUrl}>
            Review and Sign Document
          </Button>
          <Text>
            This request expires on {expiresAt.toLocaleDateString()}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

2. Document Completed
3. Reminder
4. Expiration Notice

Sending Service:
```typescript
// services/email.service.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSignatureRequest(params: {
  to: string;
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAt: Date;
}) {
  const html = render(
    <SignatureRequest {...params} />
  );
  
  await resend.emails.send({
    from: 'signatures@yourdomain.com',
    to: params.to,
    subject: `${params.senderName} sent you a document to sign`,
    html,
  });
}
```

Use Resend or similar service for reliable delivery.
```

---

## 14. API Documentation with OpenAPI

```
Generate comprehensive API documentation using OpenAPI/Swagger.

Setup:
- Use swagger-jsdoc
- Generate from JSDoc comments
- Serve via /api/docs

Example Endpoint Documentation:
```typescript
/**
 * @swagger
 * /api/v1/documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid file or request
 *       401:
 *         description: Unauthorized
 */
router.post('/documents', upload.single('file'), createDocument);
```

Schemas:
```yaml
components:
  schemas:
    Document:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        fileHash:
          type: string
        status:
          type: string
          enum: [DRAFT, PENDING, SIGNED, EXPIRED]
        createdAt:
          type: string
          format: date-time
```

Generate interactive docs with Swagger UI.
```

---

## 15. Testing Suite

```
Create comprehensive testing infrastructure.

Unit Tests (Jest):
```typescript
// __tests__/services/crypto.test.ts
import { hashDocument, verifyHash } from '@/services/crypto';

describe('Cryptographic Functions', () => {
  it('should generate consistent SHA-256 hash', () => {
    const buffer = Buffer.from('test document');
    const hash1 = hashDocument(buffer);
    const hash2 = hashDocument(buffer);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
  
  it('should verify correct hash', () => {
    const buffer = Buffer.from('test document');
    const hash = hashDocument(buffer);
    
    expect(verifyHash(buffer, hash)).toBe(true);
  });
});
```

Integration Tests (Supertest):
```typescript
// __tests__/api/documents.test.ts
import request from 'supertest';
import app from '@/server';

describe('POST /api/v1/documents', () => {
  it('should upload document with auth', async () => {
    const response = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${testToken}`)
      .attach('file', './test-files/sample.pdf')
      .field('title', 'Test Document')
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body.fileHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
```

E2E Tests (Playwright):
```typescript
// e2e/signing-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete signing flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  // Upload document
  await page.goto('/documents/new');
  await page.setInputFiles('[type=file]', './test-files/contract.pdf');
  await page.fill('[name=title]', 'Test Contract');
  await page.click('button:has-text("Upload")');
  
  // Send for signing
  await page.fill('[name=signerEmail]', 'signer@example.com');
  await page.click('button:has-text("Send")');
  
  expect(await page.textContent('.success')).toContain('sent successfully');
});
```

Test Coverage:
- Unit: 80%+ for business logic
- Integration: All API endpoints
- E2E: Critical user journeys
```

---

## 16. Security Hardening

```
Implement comprehensive security measures.

Security Headers (Helmet):
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

Input Validation:
```typescript
import { z } from 'zod';

const documentSchema = z.object({
  title: z.string().min(1).max(200),
  file: z.instanceof(Buffer).refine(
    (buffer) => buffer.length <= 25 * 1024 * 1024,
    'File too large'
  )
});
```

SQL Injection Prevention:
- Use Prisma (parameterized queries)
- Never concatenate user input
- Validate all database inputs

XSS Prevention:
- Sanitize HTML outputs
- Use React (auto-escaping)
- Set proper Content-Type headers

CSRF Protection:
- CSRF tokens for state-changing operations
- SameSite cookies
- Verify origin headers

Rate Limiting:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

Secret Management:
- Use environment variables
- Never commit secrets
- Rotate keys regularly
- Use AWS Secrets Manager or similar

Implement security audit logging for:
- Failed login attempts
- API key usage
- Document access
- Permission changes
```

---

## 17. Monitoring & Logging

```
Setup comprehensive monitoring and logging.

Error Tracking (Sentry):
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

Application Logging (Winston):
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log important events
logger.info('Document uploaded', {
  userId: user.id,
  documentId: doc.id,
  fileHash: doc.fileHash
});
```

Performance Monitoring:
```typescript
import { performance } from 'perf_hooks';

function measurePerformance(fn: Function, label: string) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  logger.info(`${label} took ${end - start}ms`);
  return result;
}
```

Health Checks:
```typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    storage: await checkS3(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  const healthy = checks.database && checks.storage;
  res.status(healthy ? 200 : 503).json(checks);
});
```

Setup alerts for:
- API error rate > 1%
- Response time > 500ms (p95)
- Database connection failures
- Storage failures
```

---

## 18. Deployment Configuration

```
Setup production deployment configuration.

Docker Setup:
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm build

# Run
EXPOSE 3000
CMD ["pnpm", "start"]
```

Docker Compose (for local dev):
```yaml
version: '3.8'

services:
  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

Vercel Configuration (frontend):
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

Railway/Render Configuration (backend):
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/health",
    "numReplicas": 2
  }
}
```

Environment Variables (.env.example):
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/esign

# Redis
REDIS_URL=redis://localhost:6379

# Storage
S3_BUCKET=esign-documents
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Blockchain
POLYGON_RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# Email
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
```
```

---

## 19. Brand Assets & Landing Page

```
Create the marketing landing page with neo-brutalist design.

Landing Page Sections:

Hero:
```tsx
<section className="min-h-screen flex items-center justify-center border-b-4 border-black">
  <div className="max-w-4xl mx-auto px-6 text-center">
    <h1 className="text-6xl font-bold mb-6 tracking-tight">
      Contracts, signed with proof.
    </h1>
    <p className="text-2xl mb-8 text-stone-700">
      A modern e-signature platform with cryptographic verification, 
      audit-grade security, and pricing that makes sense.
    </p>
    <div className="flex gap-4 justify-center">
      <button className="btn">Start Free</button>
      <button className="btn bg-white text-black border-black hover:bg-stone-100">
        View API
      </button>
    </div>
  </div>
</section>
```

Features Section:
- Cryptographic verification
- API-first design
- Transparent pricing
- Developer experience
- Immutable vault

Pricing Table:
- Clean, minimal cards
- Bold borders
- Clear feature comparison

CTA Section:
- "Start free. Upgrade when it matters."

Footer:
- Minimal
- Links to docs, API, terms
- No clutter

Design System Export:
- Figma file with components
- Brand colors, typography
- Component library
- Logo variations (SVG)
```

---

## 20. Final Integration & Polish

```
Final integration tasks and polish.

Integration Checklist:
□ Connect all frontend pages to API
□ Setup proper error boundaries
□ Add loading states everywhere
□ Implement optimistic updates
□ Add toast notifications
□ Setup analytics (PostHog/Plausible)

Polish:
□ Smooth page transitions
□ Skeleton loaders
□ Empty states with CTAs
□ Helpful error messages
□ Onboarding flow for new users
□ Tooltips and help text
□ Keyboard shortcuts
□ Dark mode (optional)

Performance:
□ Image optimization
□ Code splitting
□ Lazy loading
□ CDN for static assets
□ Compression (gzip/brotli)
□ Database query optimization
□ Redis caching layer

Accessibility:
□ ARIA labels
□ Keyboard navigation
□ Screen reader support
□ Color contrast (WCAG AA)
□ Focus indicators

Pre-Launch:
□ Security audit
□ Performance testing
□ Load testing
□ Cross-browser testing
□ Mobile testing
□ Documentation review
□ Legal pages (Terms, Privacy)
□ Support email setup
```

---

## Usage Instructions

1. **Sequential Build**: Use prompts 1-20 in order for complete platform
2. **Modular Development**: Pick specific prompts for individual features
3. **Customization**: Adjust prompts based on your specific requirements
4. **Testing**: Each prompt includes testing guidance - don't skip it

## Additional Resources

- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs
- Polygon Docs: https://docs.polygon.technology
- Web3.js: https://web3js.org

---

**Ready to build.** 🔨
