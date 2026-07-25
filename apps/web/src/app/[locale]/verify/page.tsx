"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const COPY = {
  en: {
    title: "Verify any document",
    subtitle:
      "Drop a PDF and we'll check whether it exists in Traza — unaltered. The file is hashed in your browser with SHA-256 and never uploaded.",
    drop: "Drop a PDF here, or click to choose a file",
    hashing: "Hashing locally…",
    checking: "Checking hash…",
    privacyNote: "Your file never leaves this device. Only its SHA-256 fingerprint is sent.",
    hashLabel: "SHA-256 fingerprint",
    foundTitle: "Document found in Traza",
    foundDesc:
      "A document with this exact fingerprint exists. Any modification — even one character — would produce a different fingerprint.",
    notFoundTitle: "No match",
    notFoundDesc:
      "No document with this fingerprint exists in Traza. The file was either never processed by Traza, or it was modified after signing.",
    errorTitle: "Verification failed",
    errorDesc: "Could not reach the verification service. Try again in a moment.",
    status: "Status",
    createdAt: "Registered",
    completedAt: "Completed",
    signerCount: "Signatures",
    anchored: "Blockchain anchored",
    yes: "Yes",
    no: "No",
    statusLabels: {
      SIGNED: "Fully signed",
      PENDING: "Awaiting signatures",
      DRAFT: "Draft",
      VOID: "Voided",
      EXPIRED: "Expired",
      DECLINED: "Declined",
    } as Record<string, string>,
    again: "Verify another file",
    haveId: "Have a verification link or document ID instead?",
  },
  es: {
    title: "Verifica cualquier documento",
    subtitle:
      "Arrastra un PDF y comprobamos si existe en Traza — sin alteraciones. El archivo se hashea en tu navegador con SHA-256 y nunca se sube.",
    drop: "Arrastra un PDF aquí, o haz clic para elegir un archivo",
    hashing: "Hasheando localmente…",
    checking: "Comprobando hash…",
    privacyNote: "Tu archivo nunca sale de este dispositivo. Solo se envía su huella SHA-256.",
    hashLabel: "Huella SHA-256",
    foundTitle: "Documento encontrado en Traza",
    foundDesc:
      "Existe un documento con esta huella exacta. Cualquier modificación — incluso un carácter — produciría una huella diferente.",
    notFoundTitle: "Sin coincidencia",
    notFoundDesc:
      "No existe ningún documento con esta huella en Traza. O el archivo nunca pasó por Traza, o fue modificado después de firmarse.",
    errorTitle: "Verificación fallida",
    errorDesc: "No se pudo contactar el servicio de verificación. Intenta de nuevo en un momento.",
    status: "Estado",
    createdAt: "Registrado",
    completedAt: "Completado",
    signerCount: "Firmas",
    anchored: "Anclado en blockchain",
    yes: "Sí",
    no: "No",
    statusLabels: {
      SIGNED: "Completamente firmado",
      PENDING: "Esperando firmas",
      DRAFT: "Borrador",
      VOID: "Anulado",
      EXPIRED: "Expirado",
      DECLINED: "Rechazado",
    } as Record<string, string>,
    again: "Verificar otro archivo",
    haveId: "¿Tienes un enlace de verificación o ID de documento?",
  },
} as const;

interface HashResult {
  found: boolean;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
  signerCount?: number;
  anchored?: boolean;
}

type Phase = "idle" | "hashing" | "checking" | "done" | "error";

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function VerifyByFilePage() {
  const locale = useLocale();
  const t = COPY[locale === "es" ? "es" : "en"];

  const [phase, setPhase] = useState<Phase>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<HashResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setPhase("hashing");
    try {
      const hex = await sha256Hex(file);
      setHash(hex);
      setPhase("checking");
      const res = await fetch(`${API_BASE}/api/v1/verify/hash/${hex}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setResult((body.data ?? body) as HashResult);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }, []);

  const reset = () => {
    setPhase("idle");
    setHash(null);
    setFileName(null);
    setResult(null);
  };

  const fmt = (ts?: string | null) =>
    ts ? new Date(ts).toLocaleString(locale === "es" ? "es-GT" : "en-US") : "—";

  return (
    <div className="min-h-screen">
      <nav className="border-b-4 border-black px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="text-2xl font-extrabold uppercase tracking-tighter hover:underline"
          >
            traza
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
            {t.title}
          </h1>
          <p className="text-lg text-stone-600">{t.subtitle}</p>
        </header>

        {(phase === "idle" || phase === "hashing" || phase === "checking") && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className={`w-full border-4 border-dashed border-black p-14 md:p-20 text-center font-semibold transition-colors ${
              dragging ? "bg-black text-white" : "bg-stone-50 hover:bg-stone-100"
            }`}
            disabled={phase !== "idle"}
          >
            {phase === "idle" && t.drop}
            {phase === "hashing" && t.hashing}
            {phase === "checking" && t.checking}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </button>
        )}

        <p className="mt-4 text-sm text-stone-400">{t.privacyNote}</p>

        {phase === "done" && result && (
          <div className="mt-8 space-y-6">
            <div
              className={`border-4 p-6 ${
                result.found
                  ? "border-green-600 bg-green-50"
                  : "border-stone-400 bg-stone-50"
              }`}
            >
              <h2 className="text-2xl font-bold mb-2">
                {result.found ? t.foundTitle : t.notFoundTitle}
              </h2>
              <p className="text-stone-600 mb-4">
                {result.found ? t.foundDesc : t.notFoundDesc}
              </p>
              {fileName && hash && (
                <div className="font-mono text-xs text-stone-500 break-all">
                  <p className="mb-1">{fileName}</p>
                  <p>
                    {t.hashLabel}: sha256:{hash}
                  </p>
                </div>
              )}
            </div>

            {result.found && (
              <div className="border-4 border-black divide-y-4 divide-black">
                <div className="flex justify-between p-4">
                  <span className="font-bold">{t.status}</span>
                  <span>{t.statusLabels[result.status ?? ""] ?? result.status}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="font-bold">{t.createdAt}</span>
                  <span>{fmt(result.createdAt)}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="font-bold">{t.completedAt}</span>
                  <span>{fmt(result.completedAt)}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="font-bold">{t.signerCount}</span>
                  <span>{result.signerCount ?? 0}</span>
                </div>
                <div className="flex justify-between p-4">
                  <span className="font-bold">{t.anchored}</span>
                  <span>{result.anchored ? t.yes : t.no}</span>
                </div>
              </div>
            )}

            <button type="button" onClick={reset} className="btn text-sm">
              {t.again}
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-8 border-4 border-red-600 bg-red-50 p-6">
            <h2 className="text-2xl font-bold mb-2">{t.errorTitle}</h2>
            <p className="text-stone-600 mb-4">{t.errorDesc}</p>
            <button type="button" onClick={reset} className="btn text-sm">
              {t.again}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
