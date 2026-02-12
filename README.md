# Traza - E-Signature Platform

Neo-brutalist e-signature platform with cryptographic verification, multi-tenancy, and blockchain anchoring.

## Live Deployment

| Service | URL |
|---------|-----|
| **API** | https://traza-api-production.up.railway.app |
| **Web** | https://traza-web-production.up.railway.app |
| **API Docs** | https://traza-api-production.up.railway.app/api/docs |
| **Health** | https://traza-api-production.up.railway.app/health |
| **Readiness** | https://traza-api-production.up.railway.app/ready |

Hosted on [Railway](https://railway.com) with PostgreSQL.

### Seeded Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@traza.dev` | `SuperAdmin2024!` |
| Admin | `admin@traza.dev` | `Traza2024!` |
| Signer | `signer@traza.dev` | `Traza2024!` |

## Tech Stack

- **Monorepo**: pnpm workspaces
- **API**: Express.js + TypeScript (port 4000)
- **Web**: Next.js 14 App Router + Tailwind CSS (port 3000)
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: S3-compatible (MinIO for local dev)
- **Blockchain**: Polygon via ethers.js
- **Email**: React Email + Resend
- **Auth**: JWT (access + refresh tokens)
- **PDF Rendering**: pdfjs-dist (client-side)
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
│   │   │   ├── middleware/    # auth, error, rateLimit, security, sanitize
│   │   │   ├── routes/       # Express routers (7 route files)
│   │   │   ├── services/     # business logic
│   │   │   ├── utils/        # response helpers, file validation
│   │   │   ├── app.ts        # Express app setup
│   │   │   └── server.ts     # Entry point
│   │   ├── __tests__/        # Jest tests
│   │   └── Dockerfile        # Multi-stage production build
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
│       │   │   │           └── page.tsx  # Field placement
│       │   │   ├── settings/
│       │   │   └── webhooks/
│       │   └── sign/[token]/     # Public signing page
│       ├── src/components/
│       │   ├── pdf/              # PDF viewer
│       │   ├── field-placement/  # Owner field placement
│       │   ├── signing/          # Signer experience
│       │   └── ...
│       ├── src/lib/              # API client, auth helpers
│       └── Dockerfile            # Multi-stage production build
├── packages/
│   ├── database/         # Prisma schema + client
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── crypto/           # Hashing, proof bundles, blockchain client
│   └── ui/               # Shared UI components
├── .github/workflows/ci.yml
├── .env.production.example
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Models

- **User** - accounts with bcrypt passwords, `platformRole` (USER / SUPER_ADMIN)
- **Organization** - multi-tenant companies with plan tiers, branding, status
- **OrgMembership** - user-to-org relationship with roles (OWNER / ADMIN / MEMBER / VIEWER)
- **OrgInvitation** - pending member invitations with token-based acceptance
- **Document** - uploaded files with SHA-256 hash, blockchain tx, scoped to organization
- **Signature** - per-signer records with signing tokens, status tracking
- **DocumentField** - field placements on PDF (signature, date, text, initials, checkbox)
- **FieldValue** - values entered by signers for each field
- **AuditLog** - every action logged (create, sign, anchor, impersonate, etc.)
- **Webhook** / **WebhookDelivery** - user-configured endpoints with retry tracking
- **RefreshToken** - JWT refresh token storage
- **FeatureFlag** - platform feature toggles per plan tier
- **ImpersonationSession** - admin impersonation audit trail

## Setup & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm --filter @traza/database db:generate

# 3. Run database migrations
cd packages/database && npx prisma migrate dev --name init && cd ../..

# 4. (Optional) Seed test data
pnpm --filter @traza/database db:seed

# 5. Start API (port 4000)
pnpm --filter api dev

# 6. Start Web (port 3000) — separate terminal
pnpm --filter web dev
```

### Verify

- Landing page: http://localhost:3000
- API health: http://localhost:4000/health
- API docs (Swagger): http://localhost:4000/api/docs

## API Endpoints

### Auth (`/api/v1/auth`)
- `POST /register` - Create account
- `POST /login` - Login (returns JWT)
- `POST /refresh` - Refresh access token
- `POST /logout` - Revoke refresh token

### Documents (`/api/v1/documents`)
- `POST /` - Upload document (multipart, PDF/DOCX/TXT)
- `GET /` - List documents (paginated)
- `GET /:id` - Get document details
- `DELETE /:id` - Delete document
- `GET /:id/download` - Download file
- `GET /:id/verify` - Verify integrity (SHA-256 + blockchain)
- `POST /:id/anchor` - Anchor to Polygon blockchain
- `POST /:id/proof` - Generate cryptographic proof bundle
- `GET /:id/fields` - Get placed fields
- `PUT /:id/fields` - Save/update all fields
- `GET /:id/pdf` - Stream PDF (authenticated)

### Signing (`/api/v1`)
- `POST /documents/:id/send` - Send for signing
- `GET /documents/:id/signatures` - List signatures
- `GET /sign/:token` - Get signing context (public)
- `GET /sign/:token/pdf` - Stream PDF to signer (public)
- `GET /sign/:token/fields` - Get signer's assigned fields (public)
- `POST /sign/:token` - Submit signature + field values (public)
- `POST /sign/:token/decline` - Decline to sign (public)

### Organizations (`/api/v1/organizations`)
- `GET /` - List user's organizations
- `POST /` - Create organization
- `GET /:orgId` - Get org details
- `PATCH /:orgId` - Update org (ADMIN/OWNER)
- `DELETE /:orgId` - Delete org (OWNER)
- `POST /:orgId/leave` - Leave organization
- `GET /:orgId/members` - List members
- `PATCH /:orgId/members/:memberId` - Update member role
- `DELETE /:orgId/members/:memberId` - Remove member
- `GET /:orgId/invitations` - List pending invitations
- `POST /:orgId/invitations` - Invite member
- `DELETE /:orgId/invitations/:invitationId` - Revoke invitation
- `POST /invitations/accept` - Accept invitation (token)
- `POST /switch` - Switch active organization

### Admin (`/api/v1/admin`) — Super Admin only
- `GET /organizations` - List all orgs
- `POST /organizations` - Create org with plan
- `GET /organizations/:orgId` - Get org details
- `PATCH /organizations/:orgId` - Update org
- `POST /organizations/:orgId/suspend` - Suspend org
- `DELETE /organizations/:orgId` - Delete org
- `GET /users` - List all users
- `GET /users/:userId` - Get user
- `PATCH /users/:userId` - Update user / promote to admin
- `POST /users/:userId/impersonate` - Start impersonation (requires reason)
- `POST /impersonation/end` - End impersonation
- `GET /feature-flags` - List flags
- `POST /feature-flags` - Create flag
- `PATCH /feature-flags/:flagId` - Update flag
- `DELETE /feature-flags/:flagId` - Delete flag
- `GET /audit-logs` - View audit logs
- `GET /analytics` - Platform analytics

### GDPR (`/api/v1/account`)
- `GET /export` - Export all user data (JSON download)
- `POST /delete` - Delete account and all associated data

### Webhooks (`/api/v1/webhooks`)
- `POST /` - Create webhook
- `GET /` - List webhooks
- `PUT /:id` - Update webhook
- `DELETE /:id` - Delete webhook
- `GET /:id/deliveries` - View delivery history

### Dashboard
- `GET /api/v1/dashboard/stats` - Dashboard statistics

## User Flow

```
1. UPLOAD     → Owner uploads PDF document
2. PREPARE    → Owner places fields on PDF pages (/documents/:id/prepare)
               - Select signer, add fields (signature, date, text, initials, checkbox)
               - Drag to reposition, resize handles to adjust
               - Auto-saves every 3 seconds
3. SEND       → Owner sends for signing
               - Signers receive email with unique signing link
4. SIGN       → Signer opens link (/sign/:token)
               - PDF renders with assigned fields highlighted
               - "Next Field" button guides through unfilled fields
               - Progress bar shows completion
5. COMPLETE   → All signers done → document SIGNED
               - Optional: anchor to blockchain for tamper-proof record
```

## Docker

```bash
# Build API
docker build -f apps/api/Dockerfile -t traza-api .

# Build Web (pass API URL as build arg for Next.js)
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://traza-api-production.up.railway.app \
  -t traza-web .
```

### Docker notes
- API Dockerfile installs `openssl` on Alpine for Prisma compatibility
- Uses `pnpm prune --prod` to minimize image size
- Prisma binary target: `linux-musl-openssl-3.0.x` (Alpine)
- Web uses Next.js `standalone` output mode

## Railway Deployment

```bash
# Deploy services
railway up --service traza-api --detach
railway up --service traza-web --detach

# View logs
railway logs --service traza-api
railway logs --service traza-web

# Run migrations (use public DB URL from Railway dashboard)
DATABASE_URL="postgresql://..." npx prisma@5.22.0 migrate deploy \
  --schema packages/database/prisma/schema.prisma

# Seed production database
DATABASE_URL="postgresql://..." npx tsx packages/database/prisma/seed.ts
```

### Railway env vars

**API:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SIGNING_TOKEN_SECRET`, `PLATFORM_SECRET_KEY`, `APP_URL`, `NODE_ENV=production`

**Web:** `NEXT_PUBLIC_API_URL` (set as both env var and build arg)

## Environment Variables

See `.env.production.example` for the full list.

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://traza:traza@localhost:5432/traza` | PostgreSQL connection |
| `JWT_SECRET` | dev placeholder | Change in production |
| `PORT` | `4000` | API server port |
| `APP_URL` | `http://localhost:3000` | Frontend URL (CORS) |
| `RESEND_API_KEY` | (empty) | Optional — emails log to console |
| `SENTRY_DSN` | (empty) | Optional — error tracking |
| `POLYGON_RPC_URL` | Polygon Amoy testnet | Blockchain anchoring |
| `POLYGON_PRIVATE_KEY` | (empty) | Optional — blockchain disabled |

## Testing

```bash
pnpm --filter api test:unit          # Unit tests
pnpm --filter api test:integration   # Integration tests (needs Postgres)
pnpm --filter api test:coverage      # All tests with coverage
cd apps/web && npx playwright test   # E2E tests (needs both servers)
```

## Key Features

1. JWT auth with refresh tokens and bcrypt
2. Multi-tenancy with organization-scoped data isolation
3. Role-based access control (platform + org level)
4. Super Admin console with user impersonation
5. Feature flags per plan tier (FREE, STARTER, PRO, PROOF, ENTERPRISE)
6. Document upload with SHA-256 hashing and magic byte validation
7. S3-compatible file storage
8. PDF viewer with drag-and-drop field placement
9. Percentage-based field coordinates (zoom-independent)
10. Signature workflow (send, sign, decline, expire)
11. Blockchain anchoring on Polygon
12. Cryptographic proof bundle generation (HMAC-signed)
13. Webhook system with HMAC signatures and retry
14. React Email templates (signature request, completed, reminder, expiration)
15. GDPR data export and account deletion
16. OpenAPI/Swagger documentation
17. Rate limiting, security headers (Helmet CSP/HSTS), input sanitization
18. Audit logging and request tracing (correlation IDs)
19. Docker multi-stage production builds (Alpine + OpenSSL)
20. Railway cloud deployment with PostgreSQL
21. GitHub Actions CI pipeline
