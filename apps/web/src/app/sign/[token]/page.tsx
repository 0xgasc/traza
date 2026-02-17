"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import SignatureCapture from "@/components/SignatureCapture";

// Dynamically import SigningView with SSR disabled to avoid pdfjs-dist issues
const SigningView = dynamic(
  () => import("@/components/signing/SigningView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="font-bold uppercase text-sm tracking-wide text-stone-700">
            Loading Document...
          </p>
        </div>
      </div>
    ),
  }
);

interface SigningContext {
  documentTitle: string;
  signerName: string;
  signerEmail: string;
  message?: string;
  status: string;
  waitingForPreviousSigners?: boolean;
}

interface ApiFieldPosition {
  id: string;
  fieldType: string;
  label?: string;
  page: number | string;
  xPercent: number | string | { toNumber?: () => number };
  yPercent: number | string | { toNumber?: () => number };
  widthPercent: number | string | { toNumber?: () => number };
  heightPercent: number | string | { toNumber?: () => number };
  required?: boolean;
  signerEmail?: string;
  [key: string]: unknown;
}

interface FieldPosition {
  id: string;
  fieldType: string;
  label?: string;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  required?: boolean;
  signerEmail?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function toNumber(val: number | string | { toNumber?: () => number }): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val);
  if (val && typeof val === "object" && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  return 0;
}

function mapApiFieldToPosition(apiField: ApiFieldPosition): FieldPosition {
  return {
    id: apiField.id,
    fieldType: apiField.fieldType,
    label: apiField.label,
    page: toNumber(apiField.page),
    xPercent: toNumber(apiField.xPercent),
    yPercent: toNumber(apiField.yPercent),
    widthPercent: toNumber(apiField.widthPercent),
    heightPercent: toNumber(apiField.heightPercent),
    required: apiField.required !== false,
    signerEmail: apiField.signerEmail,
  };
}

export default function PublicSigningPage() {
  const params = useParams();
  const token = params.token as string;

  const [context, setContext] = useState<SigningContext | null>(null);
  const [fields, setFields] = useState<FieldPosition[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch signing context
        const res = await fetch(API_BASE + "/api/v1/sign/" + token);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const code = errData?.error?.code || errData?.code || "";
          if (code === "VOIDED") throw new Error("VOIDED");
          if (code === "EXPIRED") throw new Error("EXPIRED");
          if (code === "ALREADY_SIGNED") throw new Error("ALREADY_SIGNED");
          if (code === "DECLINED") throw new Error("DECLINED");
          throw new Error("Invalid or expired signing link.");
        }
        const data = await res.json();
        setContext(data);

        // Fetch fields for the new signing flow
        try {
          const fieldsRes = await fetch(
            API_BASE + "/api/v1/sign/" + token + "/fields"
          );
          if (fieldsRes.ok) {
            const fieldsData: ApiFieldPosition[] = await fieldsRes.json();
            if (Array.isArray(fieldsData) && fieldsData.length > 0) {
              const mapped = fieldsData.map(mapApiFieldToPosition);
              setFields(mapped);
              // Construct PDF URL
              setPdfUrl(API_BASE + "/api/v1/sign/" + token + "/pdf");
            } else {
              // No fields - use legacy flow
              setFields([]);
            }
          } else {
            // Fields endpoint not available - use legacy flow
            setFields([]);
          }
        } catch {
          // Fields fetch failed - use legacy flow
          setFields([]);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load signing context";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const handleSign = async (signatureData: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(API_BASE + "/api/v1/sign/" + token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signatureData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit signature.");
      }
      setCompleted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(
        API_BASE + "/api/v1/sign/" + token + "/decline",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to decline.");
      }
      setDeclined(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decline failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold tracking-tighter uppercase">
            Traza
          </h1>
          <div className="mt-4 w-12 h-1 bg-black animate-pulse mx-auto" />
          <p className="mt-4 text-sm text-stone-500 font-mono">LOADING...</p>
        </div>
      </div>
    );
  }

  if (error && !context) {
    const isVoided = error === "VOIDED";
    const isExpired = error === "EXPIRED";
    const isAlreadySigned = error === "ALREADY_SIGNED";
    const isDeclinedError = error === "DECLINED";

    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center shadow-brutal">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-4">
            Traza
          </h1>
          {isVoided && (
            <>
              <div className="p-4 bg-red-50 border-4 border-red-400 mb-4">
                <p className="font-black uppercase text-red-700">Document Voided</p>
              </div>
              <p className="text-stone-600 text-sm">
                This document was voided by the sender. No further action is required.
              </p>
            </>
          )}
          {isExpired && (
            <>
              <div className="p-4 bg-stone-100 border-4 border-stone-400 mb-4">
                <p className="font-black uppercase text-stone-700">Link Expired</p>
              </div>
              <p className="text-stone-600 text-sm">
                This signing link has expired. Contact the sender to request a new one.
              </p>
            </>
          )}
          {isAlreadySigned && (
            <>
              <div className="p-4 bg-green-50 border-4 border-green-400 mb-4">
                <p className="font-black uppercase text-green-700">Already Signed</p>
              </div>
              <p className="text-stone-600 text-sm">
                You have already signed this document.
              </p>
            </>
          )}
          {isDeclinedError && (
            <>
              <div className="p-4 bg-stone-100 border-4 border-stone-400 mb-4">
                <p className="font-black uppercase text-stone-700">Signature Declined</p>
              </div>
              <p className="text-stone-600 text-sm">
                You previously declined to sign this document.
              </p>
            </>
          )}
          {!isVoided && !isExpired && !isAlreadySigned && !isDeclinedError && (
            <p className="font-semibold text-red-700">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Waiting for previous signers in a sequential workflow
  if (context?.waitingForPreviousSigners) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center shadow-brutal">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-2">Traza</h1>
          <h2 className="text-lg font-bold uppercase tracking-tight mb-4">
            {context.documentTitle}
          </h2>
          <div className="p-6 bg-yellow-50 border-4 border-yellow-400 mb-4">
            <p className="font-black uppercase text-yellow-800 text-lg mb-2">
              Not Your Turn Yet
            </p>
            <p className="text-yellow-900 text-sm">
              Hi {context.signerName}, previous signers must complete their signatures before
              you can sign this document.
            </p>
          </div>
          <p className="text-stone-500 text-sm">
            You will receive an email when it&apos;s your turn to sign.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center shadow-brutal">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-4">
            Signature Complete
          </h1>
          <p className="text-stone-600 mb-2">
            You have successfully signed the document.
          </p>
          <p className="font-semibold text-lg">{context?.documentTitle}</p>
          <div className="mt-6 p-4 bg-green-100 border-4 border-green-400">
            <p className="font-semibold uppercase text-green-800 text-sm">
              Document signed successfully
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center shadow-brutal">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-4">
            Signing Declined
          </h1>
          <p className="text-stone-600">
            You have declined to sign this document.
          </p>
        </div>
      </div>
    );
  }

  // New field-based signing flow
  if (fields && fields.length > 0 && pdfUrl && context) {
    return (
      <div className="min-h-screen bg-stone-100">
        {/* Document info header */}
        <div className="bg-white border-b-4 border-black">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  DOCUMENT
                </p>
                <p className="font-semibold text-sm">
                  {context.documentTitle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  SIGNER
                </p>
                <p className="font-mono text-xs">{context.signerEmail}</p>
              </div>
            </div>
          </div>
        </div>

        <SigningView
          token={token}
          pdfUrl={pdfUrl}
          fields={fields}
          signerEmail={context.signerEmail}
        />

        {/* Decline button */}
        <div className="bg-white border-t-4 border-black">
          <div className="max-w-4xl mx-auto px-4 py-3 text-center">
            <button
              onClick={handleDecline}
              disabled={submitting}
              className="text-xs font-bold uppercase tracking-wide text-stone-500 hover:text-black transition-colors underline"
            >
              {submitting ? "PROCESSING..." : "DECLINE TO SIGN"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Legacy flow: simple signature capture (no fields defined)
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="card shadow-brutal">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tighter uppercase">
              Traza
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-1">
              E-SIGNATURE REQUEST
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                Document
              </p>
              <p className="font-semibold text-lg">
                {context?.documentTitle}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  Signer
                </p>
                <p className="font-semibold text-sm">
                  {context?.signerName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  Email
                </p>
                <p className="font-mono text-sm">{context?.signerEmail}</p>
              </div>
            </div>

            {context?.message && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  Message
                </p>
                <p className="text-sm text-stone-700 bg-stone-50 p-3 border-2 border-stone-200">
                  {context.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signature Capture */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">
            Your Signature
          </p>
          <SignatureCapture onComplete={handleSign} />
          {submitting && (
            <p className="mt-2 text-sm font-mono text-stone-500 text-center">
              SUBMITTING...
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Decline */}
        <button
          onClick={handleDecline}
          disabled={submitting}
          className="btn-secondary w-full"
        >
          {submitting ? "Processing..." : "Decline to Sign"}
        </button>
      </div>
    </div>
  );
}
