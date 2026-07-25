export interface SecurityContent {
  title: string;
  intro: string;
  practicesHeading: string;
  practices: { name: string; desc: string }[];
  evidenceHeading: string;
  evidenceDesc: string;
  disclosureHeading: string;
  disclosureDesc: string;
}

const en: SecurityContent = {
  title: "Security at Traza",
  intro:
    "Traza handles contracts — documents you'd rather nobody tampers with, leaks, or forges. This page describes, concretely, how the platform protects them. No compliance theater; just what we actually do.",
  practicesHeading: "How the platform is protected",
  practices: [
    {
      name: "Cryptographic integrity",
      desc: "Every document is hashed with SHA-256 the moment it's uploaded. Any modification afterward is detectable by anyone via our public verification page — including offline, client-side hash comparison.",
    },
    {
      name: "Immutable audit trail",
      desc: "Every view, signature, download and status change is recorded with IP address, timestamp and user agent, and included in the document's proof bundle.",
    },
    {
      name: "Authentication",
      desc: "Short-lived JWT access tokens with rotating refresh tokens, optional TOTP two-factor authentication, and org-scoped API keys sent via X-API-Key.",
    },
    {
      name: "Signed webhooks",
      desc: "Every webhook delivery is signed with HMAC-SHA256 (X-Traza-Signature header) so your backend can verify payloads really came from Traza.",
    },
    {
      name: "Multi-tenant isolation",
      desc: "Documents, templates, webhooks and API keys are scoped to your organization. Access control is enforced server-side on every request.",
    },
    {
      name: "Transport & storage",
      desc: "TLS everywhere. Files stored in S3-compatible object storage; database on managed PostgreSQL (Railway) with encrypted connections.",
    },
    {
      name: "Abuse protection",
      desc: "Per-route rate limiting (login, uploads, signing, verification), input sanitization middleware, and security headers on every response.",
    },
    {
      name: "Monitoring",
      desc: "Errors and anomalies tracked with Sentry; health and readiness endpoints are public at /health and /ready.",
    },
    {
      name: "Privacy & data rights",
      desc: "GDPR-style endpoints for data export and deletion. Signers get access to what they signed, always.",
    },
  ],
  evidenceHeading: "Proof over promises",
  evidenceDesc:
    "You don't have to trust this page: any signed document can be independently verified — its hash, its signers, its timeline, and (if anchored) its on-chain timestamp on Polygon — from our public verify page, without an account.",
  disclosureHeading: "Reporting a vulnerability",
  disclosureDesc:
    "Found something? We want to know. Report it responsibly through the security contact in the repository's SECURITY.md and we'll respond quickly.",
};

const es: SecurityContent = {
  title: "Seguridad en Traza",
  intro:
    "Traza maneja contratos — documentos que no quieres que nadie manipule, filtre o falsifique. Esta página describe, en concreto, cómo la plataforma los protege. Sin teatro de cumplimiento; solo lo que realmente hacemos.",
  practicesHeading: "Cómo se protege la plataforma",
  practices: [
    {
      name: "Integridad criptográfica",
      desc: "Cada documento se hashea con SHA-256 en el momento de subirse. Cualquier modificación posterior es detectable por cualquiera en nuestra página pública de verificación — incluso comparando el hash localmente, sin subir el archivo.",
    },
    {
      name: "Registro de auditoría inmutable",
      desc: "Cada vista, firma, descarga y cambio de estado se registra con dirección IP, fecha/hora y navegador, y se incluye en el paquete de prueba del documento.",
    },
    {
      name: "Autenticación",
      desc: "Tokens JWT de corta duración con refresh tokens rotativos, segundo factor TOTP opcional, y API keys por organización enviadas vía X-API-Key.",
    },
    {
      name: "Webhooks firmados",
      desc: "Cada entrega de webhook va firmada con HMAC-SHA256 (header X-Traza-Signature) para que tu backend verifique que el payload realmente viene de Traza.",
    },
    {
      name: "Aislamiento multi-tenant",
      desc: "Documentos, plantillas, webhooks y API keys están limitados a tu organización. El control de acceso se aplica del lado del servidor en cada petición.",
    },
    {
      name: "Transporte y almacenamiento",
      desc: "TLS en todo. Archivos en almacenamiento de objetos compatible con S3; base de datos PostgreSQL administrada (Railway) con conexiones cifradas.",
    },
    {
      name: "Protección contra abuso",
      desc: "Límites de tasa por ruta (login, subidas, firma, verificación), sanitización de entradas y headers de seguridad en cada respuesta.",
    },
    {
      name: "Monitoreo",
      desc: "Errores y anomalías rastreados con Sentry; los endpoints de salud están públicos en /health y /ready.",
    },
    {
      name: "Privacidad y derechos de datos",
      desc: "Endpoints estilo GDPR para exportación y eliminación de datos. Los firmantes siempre tienen acceso a lo que firmaron.",
    },
  ],
  evidenceHeading: "Prueba, no promesas",
  evidenceDesc:
    "No tienes que confiar en esta página: cualquier documento firmado puede verificarse de forma independiente — su hash, sus firmantes, su línea de tiempo y (si está anclado) su sello de tiempo en Polygon — desde nuestra página pública de verificación, sin cuenta.",
  disclosureHeading: "Reportar una vulnerabilidad",
  disclosureDesc:
    "¿Encontraste algo? Queremos saberlo. Repórtalo responsablemente a través del contacto de seguridad en el SECURITY.md del repositorio y responderemos rápido.",
};

export function getSecurityContent(locale: string): SecurityContent {
  return locale === "es" ? es : en;
}
