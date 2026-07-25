# traza-sdk

Official TypeScript SDK for [Traza](https://traza-web-production.up.railway.app) — e-signature and document verification infrastructure for LATAM.

```bash
npm install traza-sdk
```

Node 18+ (uses global `fetch`). Zero dependencies.

## Quickstart

```ts
import { readFile } from "node:fs/promises";
import { TrazaClient } from "traza-sdk";

const traza = new TrazaClient({ apiKey: process.env.TRAZA_API_KEY! });

// 1. Upload — hashed with SHA-256 on arrival
const doc = await traza.documents.create({
  file: await readFile("contrato.pdf"),
  fileName: "contrato.pdf",
  title: "Contrato de arrendamiento",
});

// 2. Send for signature — signers need no account
await traza.documents.send(doc.id, {
  signers: [{ email: "maria@ejemplo.com", name: "María Pérez" }],
  emailLocale: "es",
  expiresInDays: 7,
});
```

## Webhooks

Traza signs every delivery with HMAC-SHA256 (`X-Traza-Signature: sha256=<hex>`). Verify against the **raw** body:

```ts
import express from "express";
import { verifyWebhookSignature } from "traza-sdk";

app.post("/webhooks/traza", express.raw({ type: "application/json" }), (req, res) => {
  const ok = verifyWebhookSignature(
    req.body,
    req.header("X-Traza-Signature"),
    process.env.TRAZA_WEBHOOK_SECRET!,
  );
  if (!ok) return res.status(401).end();

  const event = JSON.parse(req.body.toString());
  if (event.event === "document.completed") {
    // e.g. mark the contract as executed in your system
  }
  res.status(200).end();
});
```

## Verification (public, no API key needed)

```ts
import { readFile } from "node:fs/promises";
import { TrazaClient, hashDocument } from "traza-sdk";

const traza = new TrazaClient({ apiKey: "not-needed-for-verify" });

// Verify any PDF by fingerprint — no PII in the response
const hash = hashDocument(await readFile("contrato-firmado.pdf"));
const result = await traza.verify.byHash(hash);
// { found: true, status: "SIGNED", signerCount: 2, anchored: true, ... }

// Or the full public record for a document ID you were given
const record = await traza.verify.byId("d290f1ee-6c54-4b01-90e6-d701748f0851");
```

## Error handling

All non-2xx responses throw `TrazaApiError` with `status`, `code`, and `body`.

```ts
import { TrazaApiError } from "traza-sdk";

try {
  await traza.documents.get("nope");
} catch (err) {
  if (err instanceof TrazaApiError && err.status === 404) {
    // handle missing document
  }
}
```

## API reference

Full OpenAPI docs: https://traza-api-production.up.railway.app/api/docs
