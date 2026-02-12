# Traza - E-Signature Platform

Neo-brutalist e-signature platform with cryptographic verification and blockchain anchoring.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **API**: Express.js + TypeScript (port 4000)
- **Web**: Next.js 14 App Router + Tailwind CSS (port 3000)
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: S3-compatible (MinIO for local dev)
- **Blockchain**: Polygon via ethers.js
- **Email**: React Email + Resend
- **Auth**: JWT (access + refresh tokens)
- **PDF Rendering**: pdfjs-dist (client-side PDF viewer)
- **Drag & Drop**: react-rnd (draggable/resizable field placement)

## Project Structure

```
firmas/
├── apps/
│   ├── api/              # Express backend
│   │   ├── src/
│   │   │   ├── config/       # env, swagger, logger, sentry
│   │   │   ├── controllers/  # route handlers
│   │   │   ├── emails/       # React Email templates (4)
│   │   │   ├── middleware/    # auth, error, rateLimit, security
│   │   │   ├── routes/       # Express routers
│   │   │   ├── services/     # business logic
│   │   │   ├── utils/        # response helpers, file validation
│   │   │   ├── app.ts        # Express app setup
│   │   │   └── server.ts     # Entry point
│   │   ├── __tests__/        # Jest tests (unit + integration)
│   │   ├── Dockerfile        # Multi-stage production build
│   │   └── .env              # Local env (already created)
│   └── web/              # Next.js frontend
│       ├── src/app/          # App Router pages
│       │   ├── page.tsx          # Landing page
│       │   ├── auth/             # Login + Register
│       │   ├── gerente/          # Dashboard (protected)
│       │   │   ├── dashboard/
│       │   │   ├── documents/
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx      # Document detail
│       │   │   │       └── prepare/
│       │   │   │           └── page.tsx  # Field placement (prepare for signing)
│       │   │   ├── settings/
│       │   │   └── webhooks/
│       │   └── sign/[token]/     # Public signing page (PDF + fields)
│       ├── src/components/
│       │   ├── pdf/              # PDF viewer components
│       │   │   ├── PdfViewer.tsx
│       │   │   ├── PdfPage.tsx
│       │   │   ├── PdfToolbar.tsx
│       │   │   ├── usePdfDocument.ts
│       │   │   └── types.ts
│       │   ├── field-placement/  # Field placement (owner view)
│       │   │   ├── FieldPlacer.tsx
│       │   │   ├── FieldToolbar.tsx
│       │   │   ├── PlacedField.tsx
│       │   │   ├── useFieldPlacement.ts
│       │   │   └── SignerColorMap.ts
│       │   ├── signing/          # Signing experience (signer view)
│       │   │   ├── SigningView.tsx
│       │   │   ├── SignableField.tsx
│       │   │   ├── SignatureFieldInput.tsx
│       │   │   ├── TextFieldInput.tsx
│       │   │   ├── DateFieldInput.tsx
│       │   │   ├── CheckboxFieldInput.tsx
│       │   │   ├── InitialsFieldInput.tsx
│       │   │   └── useSigningState.ts
│       │   └── ...               # Other components
│       ├── src/lib/              # API client, auth helpers
│       ├── playwright.config.ts  # E2E test config
│       ├── e2e/                  # Playwright tests
│       └── .env.local            # NEXT_PUBLIC_API_URL
├── packages/
│   ├── database/         # Prisma schema + client
│   │   └── prisma/
│   │       ├── schema.prisma     # All models
│   │       └── seed.ts           # Seed script
│   ├── crypto/           # Hashing, proof bundles, blockchain client
│   │   └── src/
│   │       ├── hash.ts
│   │       ├── proof.ts
│   │       ├── blockchain.ts
│   │       └── index.ts
│   └── ui/               # Shared UI components (Button, Input, etc.)
├── .github/workflows/ci.yml   # GitHub Actions CI
├── .env.example                # Template for env vars
├── claude_code_prompts.md      # Original 20 build prompts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Models

- **User** - accounts with bcrypt passwords
- **Document** - uploaded files with SHA-256 hash, blockchain tx reference, pdfFileUrl, pageCount
- **Signature** - per-signer records with signing tokens, status tracking
- **DocumentField** - field placements on PDF (signature, date, text, initials, checkbox)
- **FieldValue** - values entered by signers for each field
- **AuditLog** - every action logged (create, sign, anchor, etc.)
- **Webhook** - user-configured webhook endpoints
- **WebhookDelivery** - delivery attempts with retry tracking
- **RefreshToken** - JWT refresh token storage

### Field Types (enum)
- `SIGNATURE` - signature capture field
- `DATE` - date picker field
- `TEXT` - free text input
- `INITIALS` - initials capture (smaller signature)
- `CHECKBOX` - boolean checkbox

## Prerequisites

You need **PostgreSQL** running locally. Install via one of:

### Option A: Homebrew (recommended for macOS)

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Create database and user
createuser -s traza
createdb -O traza traza
psql -d traza -c "ALTER USER traza PASSWORD 'traza';"
```

### Option B: Postgres.app

Download from https://postgresapp.com/ — drag to Applications, open, click Initialize. Then:

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/createuser -s traza
/Applications/Postgres.app/Contents/Versions/latest/bin/createdb -O traza traza
/Applications/Postgres.app/Contents/Versions/latest/bin/psql -d traza -c "ALTER USER traza PASSWORD 'traza';"
```

### Option C: Cloud Postgres (no install)

Use [Neon](https://neon.tech) (free tier) or [Supabase](https://supabase.com). Update `DATABASE_URL` in `apps/api/.env` with the connection string they provide.

## Setup & Run

```bash
# 1. Install dependencies (from project root)
pnpm install

# 2. Generate Prisma client
pnpm --filter @traza/database db:generate

# 3. Run database migrations (PostgreSQL must be running)
cd packages/database
npx prisma migrate dev --name init
cd ../..

# 4. (Optional) Seed the database
pnpm --filter @traza/database db:seed

# 5. Start API server (port 4000)
pnpm --filter api dev

# 6. In another terminal — start web server (port 3000)
pnpm --filter web dev
```

## Verify It Works

- **Landing page**: http://localhost:3000
- **API health**: http://localhost:4000/health
- **API docs (Swagger)**: http://localhost:4000/api/docs
- **API spec (JSON)**: http://localhost:4000/api/docs.json

## Environment Variables

Already configured in `apps/api/.env`. Key ones:

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://traza:traza@localhost:5432/traza` | Must match your Postgres setup |
| `JWT_SECRET` | `dev-jwt-secret-change-in-production` | Change in production |
| `PORT` | `4000` | API server port |
| `APP_URL` | `http://localhost:3000` | Frontend URL |
| `RESEND_API_KEY` | (empty) | Optional — emails log to console without it |
| `SENTRY_DSN` | (empty) | Optional — Sentry disabled without it |
| `POLYGON_RPC_URL` | Polygon Amoy testnet | For blockchain anchoring |
| `POLYGON_PRIVATE_KEY` | (empty) | Optional — blockchain features disabled without it |

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke refresh token

### Documents
- `POST /api/documents` - Upload document (multipart, PDF/DOCX/TXT)
- `GET /api/documents` - List user's documents (paginated)
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download file
- `POST /api/documents/:id/verify` - Verify document integrity
- `POST /api/documents/:id/anchor` - Anchor to blockchain
- `GET /api/documents/:id/proof` - Generate proof bundle

### Document Fields (PDF field placement)
- `GET /api/v1/documents/:id/fields` - Get fields for document
- `PUT /api/v1/documents/:id/fields` - Save/update all fields (full replace)
- `GET /api/v1/documents/:id/pdf` - Stream PDF to owner (authenticated)

### Signatures
- `POST /api/v1/documents/:id/send` - Send for signing (links fields to signers)
- `GET /api/v1/documents/:id/signatures` - List signatures for document
- `GET /api/v1/sign/:token` - Get signing context (public)
- `GET /api/v1/sign/:token/pdf` - Stream PDF to signer (token-based)
- `GET /api/v1/sign/:token/fields` - Get signer's assigned fields
- `POST /api/v1/sign/:token` - Submit signature + field values (public)
- `POST /api/v1/sign/:token/decline` - Decline to sign (public)

### Webhooks
- `POST /api/webhooks` - Create webhook
- `GET /api/webhooks` - List webhooks
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `GET /api/webhooks/:id/deliveries` - View delivery history

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

## Testing

```bash
# Unit tests
pnpm --filter api test:unit

# Integration tests (needs running Postgres)
pnpm --filter api test:integration

# All tests with coverage
pnpm --filter api test:coverage

# E2E tests (needs both servers running)
cd apps/web && npx playwright test
```

## Key Features Built

1. JWT auth with refresh tokens and bcrypt
2. Document upload with SHA-256 hashing and magic byte validation
3. S3-compatible file storage
4. Signature workflow (send, sign, decline, expire)
5. Blockchain anchoring on Polygon
6. Cryptographic proof bundle generation (HMAC-signed)
7. Webhook system with HMAC signatures and retry
8. React Email templates (signature request, completed, reminder, expiration)
9. OpenAPI/Swagger documentation
10. Rate limiting and security headers (Helmet CSP/HSTS)
11. Security audit logging
12. Winston file logging + Sentry error tracking
13. Neo-brutalist landing page with pricing
14. Dashboard, document management, and settings pages
15. GitHub Actions CI pipeline
16. Docker production build
17. **PDF Viewer** - client-side PDF rendering with pdfjs-dist
18. **Drag-and-drop field placement** - owner places signature/date/text/initials/checkbox fields on PDF pages
19. **Percentage-based coordinates** - fields stored as % of page dimensions (zoom-independent)
20. **Field-based signing experience** - signers fill their assigned fields on the actual PDF
21. **Auto-save** - debounced 3-second auto-save while placing fields
22. **Next-field navigation** - "Next Field" button guides signers through unfilled fields
23. **Signer color-coding** - fields for different signers shown in different colors (amber, sky, emerald, rose, violet)

## User Flow (PDF + Field Placement)

```
1. UPLOAD     → Owner uploads PDF document
2. PREPARE    → Owner places fields on PDF pages (/documents/:id/prepare)
               - Select signer from list
               - Click to add fields (signature, date, text, initials, checkbox)
               - Drag to reposition, resize handles to adjust
               - Auto-saves every 3 seconds after changes
3. SEND       → Owner sends for signing
               - Fields are linked to signers by email
               - Signers receive email with unique signing link
4. SIGN       → Signer opens link (/sign/:token)
               - PDF renders with their assigned fields highlighted
               - "Next Field" button guides through unfilled required fields
               - Progress bar shows "X of Y fields completed"
               - Submit button enabled when all required fields filled
5. COMPLETE   → All signers done → document status becomes SIGNED
               - Owner notified via email
               - Optional: anchor to blockchain for tamper-proof proof
```

## Build Status

- API: `tsc --noEmit` passes clean (zero errors)
- Web: `tsc --noEmit` passes clean (zero errors)
- All 20 build phases from `claude_code_prompts.md` are complete
- PDF viewer + field placement feature (Phase 21) complete

## Current Local Setup

PostgreSQL is installed via **Postgres.app** at `/Applications/Postgres.app`. Data directory: `~/Library/Application Support/Postgres/var-17/`.

### Starting PostgreSQL (if it's not running)

```bash
PGBIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
PGDATA="$HOME/Library/Application Support/Postgres/var-17"
"$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" start
```

### Stopping PostgreSQL

```bash
PGBIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
PGDATA="$HOME/Library/Application Support/Postgres/var-17"
"$PGBIN/pg_ctl" -D "$PGDATA" stop
```

Database `traza` with user `traza` (password: `traza`) is already created.
Prisma migrations have been applied.

### Quick Start (everything is set up, just run)

```bash
# Terminal 1: Start Postgres (if not already running)
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl \
  -D "$HOME/Library/Application Support/Postgres/var-17" \
  -l "$HOME/Library/Application Support/Postgres/var-17/server.log" start

# Terminal 2: Start API
cd /Volumes/WORKHORSE\ GS/vibecoding/firmas && pnpm --filter api dev

# Terminal 3: Start Web
cd /Volumes/WORKHORSE\ GS/vibecoding/firmas && pnpm --filter web dev
```

### Test user

- Email: `test@traza.dev`
- Password: `TestPass123`

## What Still Needs Doing

- [x] PostgreSQL installed and running locally
- [x] `prisma migrate dev` to create tables
- [x] Verify API starts and `/health` returns OK
- [x] Test auth flow (register + login + protected endpoints)
- [x] PDF viewer + field placement feature
- [x] Field-based signing experience
- [ ] Initial git commit
- [ ] Test full PDF signing flow:
  - Upload PDF → Prepare (place fields) → Send → Sign → Complete
  - Verify field positions are stable across zoom levels
  - Test with multiple signers
- [ ] Configure Resend API key for real emails (optional)
- [ ] Configure Polygon private key for blockchain (optional)
- [ ] Deploy (Vercel for web, Railway/Render for API, Neon for DB)

## New Files Summary (PDF Feature)

### Database
- `packages/database/prisma/schema.prisma` - Added FieldType enum, DocumentField, FieldValue models

### API (apps/api/src/)
- `services/field.service.ts` - Field CRUD operations
- `controllers/field.controller.ts` - Field endpoints
- Modified: `routes/document.routes.ts` - Added field endpoints
- Modified: `routes/signature.routes.ts` - Added PDF + fields signing endpoints
- Modified: `services/signature.service.ts` - Field linking + field value persistence
- Modified: `validators/signature.validators.ts` - Accept fieldValues in submission

### Web (apps/web/src/)
- `components/pdf/*` - PDF viewer (PdfViewer, PdfPage, PdfToolbar, usePdfDocument, types)
- `components/field-placement/*` - Owner field placement (FieldPlacer, PlacedField, FieldToolbar, useFieldPlacement, SignerColorMap)
- `components/signing/*` - Signer experience (SigningView, SignableField, all input types, useSigningState)
- `app/(app)/documents/[id]/prepare/page.tsx` - Prepare document page
- Modified: `app/sign/[token]/page.tsx` - Dual flow (PDF + fields or legacy)
