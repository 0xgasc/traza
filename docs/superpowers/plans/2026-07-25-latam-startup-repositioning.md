# Traza LATAM Startup Repositioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Traza from generic e-sign SaaS into an API-first signing + document-verification platform for LATAM startups (Sign + Verify product split), with the developer surface area and LATAM-specific proof points to back it.

**Architecture:** Marketing/positioning changes live in `apps/web` (Next.js 14 App Router, next-intl en/es). New public verification-by-hash endpoint and WhatsApp/OTP signer verification live in `apps/api` (Express + Prisma). New SDK lives in `packages/sdk`. All schema changes are additive/nullable; migrations auto-run on Railway deploy (Dockerfile CMD runs `prisma migrate deploy`).

**Tech Stack:** Next.js 14, next-intl, Tailwind, Express, Prisma/PostgreSQL, Jest, pnpm workspaces, Railway (GitHub auto-deploy assumed via origin push).

**Constraints:**
- All copy ships in BOTH `apps/web/messages/en.json` and `es.json`.
- Legal pages must be honest: Traza provides *simple/ordinary* electronic signatures with strong evidence (hash, audit trail, optional anchoring) — NOT certified "firma electrónica avanzada" (requires accredited PSC/GFACE-style providers). No PSC/NOM-151 certification claims.
- WhatsApp + OTP ship behind provider adapters with STUB mode (FEL adapter pattern) — env-gated, no external credentials required to deploy.
- Do not break the existing signer flow; all new verification is opt-in per document/signer.

---

### Task 0: Commit in-flight legal/cookie work
Uncommitted work exists (terms/privacy pages, CookieConsent, legal+cookieConsent message namespaces, footer links). It is coherent and complementary.
- [ ] `pnpm --filter web build` (or at minimum `tsc --noEmit` for web) to confirm tree builds
- [ ] Commit as `feat(web): terms, privacy pages + cookie consent`

### Task 1: README hygiene
**Files:** Modify `README.md`
- [ ] Remove seeded test credentials table (replace with "see seed script" note)
- [ ] Update first paragraph to Sign + Verify positioning
- [ ] Commit `docs: remove seeded credentials from README, update positioning`

### Task 2: Landing rewrite — code-first, Sign/Verify split (en + es)
**Files:** Modify `apps/web/src/app/[locale]/page.tsx`, `apps/web/messages/en.json`, `apps/web/messages/es.json`
- [ ] New hero: positioning line ("Signing & document-verification infrastructure for LATAM"), CTA pair (Start free / Docs), code block showing `curl -X POST .../api/v1/documents` + webhook payload sample (hardcoded in component, not translated)
- [ ] Two-product section: **Traza Sign** (embedded signing API + dashboard) and **Traza Verify** (hash verification, public verify page, QR proof, anchored timestamps)
- [ ] Use-case section: fintech (contratos de crédito), proptech (arrendamientos + pago al firmar), HR (cartas de oferta), marketplaces (onboarding vendedores)
- [ ] Pricing: keep dashboard tiers; add API/usage tier card ("per completed envelope" + free sandbox) presented as "API" plan
- [ ] Footer: links to /legalidad, /security, /status, /developers
- [ ] Verify both locales render (`pnpm --filter web build`)
- [ ] Commit `feat(web): landing repositioned — code-first hero, Sign/Verify split, use cases, API pricing`

### Task 3: Legal validity pages
**Files:** Create `apps/web/src/app/[locale]/(legal)/legalidad/page.tsx` (index) + `[country]/page.tsx` (guatemala | mexico | colombia), messages in both locales under `legalidad` namespace
- [ ] Index page: table of countries + what Traza provides (evidence stack)
- [ ] Guatemala: Decreto-Ley 47-2008 (comunicaciones y firmas electrónicas) — simple vs avanzada, admissibility of electronic signatures, Traza evidence mapping
- [ ] Mexico: Código de Comercio arts. 89+ (mensajes de datos), firma electrónica simple vs avanzada (FIEL/e.firma), NOM-151 constancias — position anchoring as complementary timestamp evidence, explicitly NOT a NOM-151 constancia
- [ ] Colombia: Ley 527/1999 + Decreto 2364/2012 (firma electrónica confiable), evidence mapping
- [ ] Each page: disclaimer "no es asesoría legal"
- [ ] generateStaticParams for the 3 countries; 404 otherwise
- [ ] Commit `feat(web): country legal-validity pages (GT, MX, CO)`

### Task 4: Security + Status pages
**Files:** Create `apps/web/src/app/[locale]/security/page.tsx`, `apps/web/src/app/[locale]/status/page.tsx`; messages both locales
- [ ] Security: evidence stack (SHA-256 at upload, audit trail w/ IP+UA, JWT auth, rate limiting, input sanitization, Sentry, S3 encrypted storage, GDPR endpoints, webhook HMAC signatures)
- [ ] Status: client component polling `GET /health` + `GET /ready` of API, green/red cards, last-checked timestamp
- [ ] Wire footer "Estado" link to /status
- [ ] Commit `feat(web): security and live status pages`

### Task 5: Verify-by-hash API + verify-any-file UI
**Files:** Modify `apps/api/src/app.ts` (route), controller/service for extra endpoints; Create `apps/web/src/app/[locale]/verify/page.tsx` (verify landing); Test `apps/api/__tests__/`
- [ ] API: `GET /api/v1/verify/hash/:hash` (public, rate-limited like /verify/:id) → looks up Document by fileHash (indexed), returns same shape as publicVerifyDocument or `{found:false}`; never leaks file contents — metadata only (title can be withheld; return status, timestamps, signer count, anchoring)
- [ ] Jest test: seeds doc with known hash → 200 found; unknown hash → found:false
- [ ] Web: `/verify` page — drag/drop any PDF, hash client-side via WebCrypto `crypto.subtle.digest("SHA-256")`, call endpoint, render result ("Este documento existe en Traza, firmado por N partes el ...") — file never uploaded (say so prominently)
- [ ] Link from landing Verify product card
- [ ] Commit `feat: public verify-by-hash endpoint + client-side file verification page`

### Task 6: Developers quickstart page
**Files:** Create `apps/web/src/app/[locale]/developers/page.tsx`
- [ ] 5-minute quickstart: create API key → upload doc (curl) → add signer → webhook `document.completed` sample + HMAC verification snippet (node) → link to Swagger `/api/docs`
- [ ] Code samples hardcoded (not translated); prose via messages
- [ ] Commit `feat(web): developers quickstart page`

### Task 7: SDK package `@traza/sdk`
**Files:** Create `packages/sdk/package.json`, `src/index.ts`, `src/client.ts`, `src/webhooks.ts`, `README.md`, `tsconfig.json`, tests
- [ ] TrazaClient: constructor({apiKey, baseUrl}), documents.create/get/list/send, verify.byId/byHash — thin fetch wrapper, zero deps
- [ ] `verifyWebhookSignature(payload, signature, secret)` matching API's HMAC scheme (read `webhook.service.ts` / `webhookDispatcher.ts` for exact scheme first)
- [ ] Unit tests for webhook signature verify (Jest, matching repo pattern)
- [ ] README with quickstart; version 0.1.0; publish to npm ONLY if `npm whoami` succeeds (name fallback: `traza-sdk` if `@traza` scope unavailable); otherwise leave ready with note
- [ ] Commit `feat(sdk): @traza/sdk TypeScript client + webhook signature helper`

### Task 8: WhatsApp delivery adapter (STUB mode)
**Files:** Create `apps/api/src/services/whatsapp.service.ts`; Modify `packages/database/prisma/schema.prisma` (Signature.signerPhone String?, Signature.deliveryChannel enum EMAIL|WHATSAPP|BOTH default EMAIL), signature create/send flow, migration; Tests
- [ ] Adapter interface `sendSigningLink({phone, name, docTitle, url, locale})`; providers: `stub` (logs + records), `meta` (WhatsApp Cloud API via fetch, env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID); provider chosen by env WHATSAPP_PROVIDER (default stub)
- [ ] Send flow: when signer has phone and channel includes WHATSAPP, dispatch WhatsApp message alongside/instead of email; failures logged, never block email path
- [ ] Prisma migration (additive, nullable) via `prisma migrate dev --name whatsapp_delivery`
- [ ] API accepts `phone` + `deliveryChannel` on signer creation (validate E.164-ish)
- [ ] Jest test: stub provider called when channel=WHATSAPP
- [ ] Commit `feat(api): WhatsApp signing-link delivery (stub + Meta Cloud API adapters)`

### Task 9: OTP signer-verification tier
**Files:** Modify schema (Signature: verificationLevel enum NONE|EMAIL_OTP|WHATSAPP_OTP default NONE, otpHash String?, otpExpiresAt DateTime?, otpVerifiedAt DateTime?, otpAttempts Int default 0), `signature.controller.ts`, `signature.routes.ts`, signing submit gate; Tests
- [ ] `POST /sign/:token/otp/request` → 6-digit code, bcrypt-hash stored, 10-min expiry, sent via email or WhatsApp adapter per level; rate-limited
- [ ] `POST /sign/:token/otp/verify` → checks hash + expiry, max 5 attempts, sets otpVerifiedAt
- [ ] Signature submission rejects when verificationLevel != NONE and otpVerifiedAt is null (mirror existing accessCode gate)
- [ ] Owner sets verificationLevel per signer at send time; audit-log OTP events; certificate/proof includes verification level
- [ ] Signing UI: OTP step before signing when required (`apps/web` sign/[token] flow)
- [ ] Jest tests: request/verify happy path, expiry, attempt cap, submit gate
- [ ] Commit `feat: OTP identity-verification tier at signature (email/WhatsApp)`

### Task 10: Ship
- [ ] `pnpm -r build` + API test suite green
- [ ] Push to origin main (Railway/web auto-deploy)
- [ ] Smoke: hit prod /health, landing, /verify, /legalidad/guatemala
- [ ] Update memory: project_traza.md (Sign/Verify positioning, new surfaces), note npm publish status

**Explicitly deferred (not in this plan):** metered billing infra (pricing is presentation-only), Aval ID+selfie integration (documented as roadmap tier on landing/legal pages), Zapier/integrations, template gallery seeding, PSC/NOM-151 partnerships.
