import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const API_URL = "https://traza-api-production.up.railway.app";

const STEP_UPLOAD = `curl -X POST ${API_URL}/api/v1/documents \\
  -H "X-API-Key: $TRAZA_API_KEY" \\
  -F "file=@contrato.pdf" \\
  -F "title=Contrato de arrendamiento"

# → { "data": { "id": "d290f1ee-...", "fileHash": "e3b0c442...", "status": "DRAFT" } }`;

const STEP_SEND = `curl -X POST ${API_URL}/api/v1/documents/$DOC_ID/send \\
  -H "X-API-Key: $TRAZA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "signers": [
      { "email": "maria@ejemplo.com", "name": "María Pérez" }
    ],
    "message": "Por favor firma el contrato",
    "emailLocale": "es",
    "expiresInDays": 7
  }'`;

const STEP_WEBHOOK = `// Every delivery is signed: X-Traza-Signature: sha256=<hex>
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTrazaWebhook(rawBody: string, header: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = header.replace(/^sha256=/, "");
  return received.length === expected.length &&
    timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

// { "event": "document.completed", "data": { "documentId": "...", ... } }`;

const STEP_VERIFY = `# Anyone can verify — no auth. Hash any PDF locally:
HASH=$(shasum -a 256 contrato-firmado.pdf | cut -d' ' -f1)
curl ${API_URL}/api/v1/verify/hash/$HASH

# → { "data": { "found": true, "status": "SIGNED", "signerCount": 2, "anchored": true } }`;

const COPY = {
  en: {
    title: "Quickstart",
    subtitle:
      "Send your first document for signature in 5 minutes. Four steps: get a key, upload, send, listen.",
    steps: [
      {
        num: "01",
        title: "Get an API key",
        desc: "Create a free account, then generate an org-scoped API key from Settings → API Keys. Send it as the X-API-Key header on every request.",
        code: null,
      },
      {
        num: "02",
        title: "Upload a document",
        desc: "One multipart request. The PDF is hashed with SHA-256 the moment it lands.",
        code: STEP_UPLOAD,
      },
      {
        num: "03",
        title: "Send it for signature",
        desc: "Each signer gets a secure link by email — no account needed on their side. Spanish or English notifications per document.",
        code: STEP_SEND,
      },
      {
        num: "04",
        title: "Listen for completion",
        desc: "Register a webhook from Settings → Webhooks (or the API) and verify each delivery's HMAC signature against your endpoint secret:",
        code: STEP_WEBHOOK,
      },
    ],
    verifyTitle: "Bonus: verify any document",
    verifyDesc:
      "Verification is public infrastructure — your users (or a judge) can confirm a signed document is genuine without a Traza account.",
    verifyCode: STEP_VERIFY,
    fullRef: "Full API reference (OpenAPI)",
    dashboard: "Create a free account",
  },
  es: {
    title: "Quickstart",
    subtitle:
      "Envía tu primer documento a firma en 5 minutos. Cuatro pasos: consigue una key, sube, envía, escucha.",
    steps: [
      {
        num: "01",
        title: "Consigue una API key",
        desc: "Crea una cuenta gratis y genera una API key de tu organización en Configuración → API Keys. Envíala como header X-API-Key en cada petición.",
        code: null,
      },
      {
        num: "02",
        title: "Sube un documento",
        desc: "Una sola petición multipart. El PDF se hashea con SHA-256 en cuanto llega.",
        code: STEP_UPLOAD,
      },
      {
        num: "03",
        title: "Envíalo a firma",
        desc: "Cada firmante recibe un enlace seguro por correo — sin necesidad de cuenta. Notificaciones en español o inglés por documento.",
        code: STEP_SEND,
      },
      {
        num: "04",
        title: "Escucha la finalización",
        desc: "Registra un webhook desde Configuración → Webhooks (o por API) y verifica la firma HMAC de cada entrega contra el secreto de tu endpoint:",
        code: STEP_WEBHOOK,
      },
    ],
    verifyTitle: "Bonus: verifica cualquier documento",
    verifyDesc:
      "La verificación es infraestructura pública — tus usuarios (o un juez) pueden confirmar que un documento firmado es genuino sin cuenta de Traza.",
    verifyCode: STEP_VERIFY,
    fullRef: "Referencia completa de la API (OpenAPI)",
    dashboard: "Crear cuenta gratis",
  },
} as const;

export default function DevelopersPage() {
  const locale = useLocale();
  const t = COPY[locale === "es" ? "es" : "en"];

  return (
    <article>
      <header className="mb-12">
        <p className="font-mono text-sm text-stone-400 uppercase tracking-widest mb-2">
          {"// developers"}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
          {t.title}
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl">{t.subtitle}</p>
      </header>

      <div className="space-y-10">
        {t.steps.map((step) => (
          <section key={step.num} className="border-4 border-black bg-white">
            <div className="p-6">
              <span className="font-mono text-sm text-stone-400 block mb-1">
                {step.num}
              </span>
              <h2 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">
                {step.title}
              </h2>
              <p className="text-stone-600">{step.desc}</p>
            </div>
            {step.code && (
              <div className="border-t-4 border-black bg-black text-stone-100 p-4 overflow-x-auto">
                <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre">
                  {step.code}
                </pre>
              </div>
            )}
          </section>
        ))}

        <section className="border-4 border-black bg-stone-50">
          <div className="p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2 tracking-tight">
              {t.verifyTitle}
            </h2>
            <p className="text-stone-600">{t.verifyDesc}</p>
          </div>
          <div className="border-t-4 border-black bg-black text-stone-100 p-4 overflow-x-auto">
            <pre className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre">
              {t.verifyCode}
            </pre>
          </div>
        </section>

        <div className="flex gap-4 flex-wrap">
          <a
            href={`${API_URL}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn text-sm"
          >
            {t.fullRef}
          </a>
          <Link href="/register" className="btn-secondary text-sm">
            {t.dashboard}
          </Link>
        </div>
      </div>
    </article>
  );
}
