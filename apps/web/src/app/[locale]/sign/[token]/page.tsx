"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import SignatureCapture from "@/components/SignatureCapture";

const SIGNER_TOKEN_KEY = "traza_signer_token";

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
  requiresAccessCode?: boolean;
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
  const t = useTranslations("signing");
  const params = useParams();
  const token = params.token as string;
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  const [context, setContext] = useState<SigningContext | null>(null);
  const [fields, setFields] = useState<FieldPosition[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [documentCompleted, setDocumentCompleted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [accessCodeVerified, setAccessCodeVerified] = useState(false);

  // Branding
  const [branding, setBranding] = useState<{ logoUrl: string | null; primaryColor: string | null }>({ logoUrl: null, primaryColor: null });

  // Signer account
  const [savedSignatureData, setSavedSignatureData] = useState<string | null>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveSending, setSaveSending] = useState(false);
  const [saveSent, setSaveSent] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Delegation
  const [showDelegateForm, setShowDelegateForm] = useState(false);
  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegateName, setDelegateName] = useState("");
  const [delegating, setDelegating] = useState(false);
  const [delegated, setDelegated] = useState(false);

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

        // Check if signer has a saved profile
        const signerToken = typeof window !== "undefined" ? localStorage.getItem(SIGNER_TOKEN_KEY) : null;
        if (signerToken) {
          try {
            const meRes = await fetch(API_BASE + "/api/v1/signer-auth/me", {
              headers: { Authorization: `Bearer ${signerToken}` },
            });
            if (meRes.ok) {
              const me = await meRes.json();
              if (me.email === data.signerEmail && me.savedSignatureData) {
                setSavedSignatureData(me.savedSignatureData);
              }
            }
          } catch {
            // Ignore - signer auth is optional
          }
        }

        // Fetch branding (fire-and-forget)
        fetch(API_BASE + "/api/v1/sign/" + token + "/branding")
          .then((r) => r.ok ? r.json() : null)
          .then((b) => { if (b) setBranding(b); })
          .catch(() => {});

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

  const handleSendMagicLink = useCallback(async () => {
    if (!saveEmail.trim()) return;
    setSaveSending(true);
    setSaveError("");
    try {
      const res = await fetch(API_BASE + "/api/v1/signer-auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saveEmail.trim().toLowerCase(), name: context?.signerName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error?.message || "Failed to send link");
      }
      setSaveSent(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setSaveSending(false);
    }
  }, [saveEmail, context?.signerName]);

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
      const result = await res.json().catch(() => ({}));
      setDocumentCompleted(result.documentCompleted === true);
      setCompleted(true);
      // Show save-profile prompt unless signer already has a saved sig
      if (!savedSignatureData && context?.signerEmail) {
        setSaveEmail(context.signerEmail);
        setShowSavePrompt(true);
      }
      if (isEmbed) {
        window.parent.postMessage({ type: "traza:signed", documentCompleted: result.documentCompleted === true }, "*");
      }
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
          body: JSON.stringify({ reason: declineReason.trim() || undefined }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to decline.");
      }
      setDeclined(true);
      setShowDeclineForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decline failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateEmail.trim() || !delegateName.trim()) return;
    setDelegating(true);
    try {
      const res = await fetch(API_BASE + "/api/v1/sign/" + token + "/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: delegateEmail.trim().toLowerCase(), name: delegateName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error?.message || "Delegation failed");
      }
      setDelegated(true);
      setShowDelegateForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delegation failed");
    } finally {
      setDelegating(false);
    }
  };

  const handleVerifyAccessCode = async () => {
    setAccessCodeError("");
    try {
      await fetch(API_BASE + "/api/v1/sign/" + token + "/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCodeInput }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message || "Incorrect access code.");
        }
      });
      setAccessCodeVerified(true);
    } catch (err: unknown) {
      setAccessCodeError(err instanceof Error ? err.message : "Incorrect access code.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold tracking-tighter uppercase">
            {t("brand")}
          </h1>
          <div className="mt-4 w-12 h-1 bg-black animate-pulse mx-auto" />
          <p className="mt-4 text-sm text-stone-500 font-mono">{t("loadingStatus")}</p>
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
            {t("brand")}
          </h1>
          {isVoided && (
            <>
              <div className="p-4 bg-red-50 border-4 border-red-400 mb-4">
                <p className="font-black uppercase text-red-700">{t("voided.title")}</p>
              </div>
              <p className="text-stone-600 text-sm">
                {t("voided.desc")}
              </p>
            </>
          )}
          {isExpired && (
            <>
              <div className="p-4 bg-stone-100 border-4 border-stone-400 mb-4">
                <p className="font-black uppercase text-stone-700">{t("expired.title")}</p>
              </div>
              <p className="text-stone-600 text-sm">
                {t("expired.desc")}
              </p>
            </>
          )}
          {isAlreadySigned && (
            <>
              <div className="p-4 bg-green-50 border-4 border-green-400 mb-4">
                <p className="font-black uppercase text-green-700">{t("alreadySigned.title")}</p>
              </div>
              <p className="text-stone-600 text-sm">
                {t("alreadySigned.desc")}
              </p>
            </>
          )}
          {isDeclinedError && (
            <>
              <div className="p-4 bg-stone-100 border-4 border-stone-400 mb-4">
                <p className="font-black uppercase text-stone-700">{t("declined.title")}</p>
              </div>
              <p className="text-stone-600 text-sm">
                {t("declined.desc")}
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
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-2">{t("brand")}</h1>
          <h2 className="text-lg font-bold uppercase tracking-tight mb-4">
            {context.documentTitle}
          </h2>
          <div className="p-6 bg-yellow-50 border-4 border-yellow-400 mb-4">
            <p className="font-black uppercase text-yellow-800 text-lg mb-2">
              {t("notYourTurn.title")}
            </p>
            <p className="text-yellow-900 text-sm">
              {t("notYourTurn.desc", { name: context.signerName })}
            </p>
          </div>
          <p className="text-stone-500 text-sm">
            {t("notYourTurn.waiting")}
          </p>
        </div>
      </div>
    );
  }

  // Access code gate
  if (context?.requiresAccessCode && !accessCodeVerified) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full shadow-brutal">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tighter uppercase">{t("brand")}</h1>
            <p className="text-xs text-stone-500 font-mono mt-1">{t("pinRequired.title")}</p>
          </div>
          <div className="mb-6">
            <p className="text-sm font-semibold mb-1">{context.documentTitle}</p>
            <p className="text-sm text-stone-500">
              {t("pinRequired.desc")}
            </p>
          </div>
          {accessCodeError && (
            <div className="mb-4 p-3 border-4 border-black bg-stone-100">
              <p className="text-xs font-semibold">{accessCodeError}</p>
            </div>
          )}
          <div className="space-y-3">
            <input
              type="text"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              placeholder={t("pinRequired.placeholder")}
              className="input w-full text-center font-mono tracking-widest text-lg"
              maxLength={16}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyAccessCode()}
            />
            <button
              onClick={handleVerifyAccessCode}
              disabled={!accessCodeInput.trim()}
              className="btn w-full"
            >
              {t("pinRequired.submit")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (delegated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full shadow-brutal text-center">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-6">{t("delegated.title")}</h1>
          <div className="p-5 border-4 border-blue-400 bg-blue-50 mb-6">
            <p className="font-black uppercase text-blue-800 mb-1">{t("delegated.successTitle")}</p>
            <p className="text-sm text-blue-700">
              {t("delegated.successDesc", { email: delegateEmail })}
            </p>
          </div>
          <p className="text-xs text-stone-400 font-mono">{t("delegated.close")}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full shadow-brutal">
          {!isEmbed && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tighter uppercase">{t("brand")}</h1>
              <p className="text-xs text-stone-500 font-mono mt-1">{t("platform")}</p>
            </div>
          )}

          <div className={`p-5 border-4 mb-6 ${documentCompleted ? "bg-green-50 border-green-500" : "bg-yellow-50 border-yellow-400"}`}>
            <p className={`font-black uppercase text-lg mb-1 ${documentCompleted ? "text-green-800" : "text-yellow-800"}`}>
              {documentCompleted ? t("complete.allDoneTitle") : t("complete.yourSignatureTitle")}
            </p>
            <p className={`text-sm ${documentCompleted ? "text-green-700" : "text-yellow-700"}`}>
              {documentCompleted
                ? t("complete.allDoneDesc")
                : t("complete.yourSignatureDesc")}
            </p>
          </div>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between items-center py-2 border-b-2 border-stone-100">
              <span className="text-stone-500 font-mono uppercase text-xs">{t("complete.document")}</span>
              <span className="font-semibold text-right max-w-[60%]">{context?.documentTitle}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-stone-100">
              <span className="text-stone-500 font-mono uppercase text-xs">{t("complete.signedAs")}</span>
              <span className="font-mono text-xs">{context?.signerName} &lt;{context?.signerEmail}&gt;</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-stone-500 font-mono uppercase text-xs">{t("complete.timestamp")}</span>
              <span className="font-mono text-xs">{new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          </div>

          <p className="text-xs text-stone-400 font-mono text-center">
            {t("complete.cryptoNote")}
            {documentCompleted && " " + t("delegated.close")}
          </p>

          {/* Save signature prompt */}
          {showSavePrompt && !saveSent && (
            <div className="mt-4 p-4 border-4 border-black bg-stone-50">
              <p className="text-sm font-black uppercase tracking-wide mb-1">{t("saveSignature.title")}</p>
              <p className="text-xs text-stone-500 mb-3">
                {t("saveSignature.desc")}
              </p>
              {saveError && (
                <p className="text-xs text-red-600 font-semibold mb-2">{saveError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.value)}
                  className="input flex-1 text-sm"
                  placeholder={t("saveSignature.emailPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMagicLink()}
                />
                <button
                  onClick={handleSendMagicLink}
                  disabled={saveSending || !saveEmail.trim()}
                  className="btn text-sm px-4 whitespace-nowrap disabled:opacity-50"
                >
                  {saveSending ? t("saveSignature.sending") : t("saveSignature.send")}
                </button>
              </div>
              <button
                onClick={() => setShowSavePrompt(false)}
                className="mt-2 text-xs text-stone-400 hover:text-stone-700 underline"
              >
                {t("saveSignature.noThanks")}
              </button>
            </div>
          )}
          {saveSent && (
            <div className="mt-4 p-4 border-4 border-green-500 bg-green-50">
              <p className="text-sm font-black uppercase tracking-wide text-green-800 mb-1">{t("saveSignature.checkEmailTitle")}</p>
              <p className="text-xs text-green-700">
                {t("saveSignature.checkEmailDesc", { email: saveEmail })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-lg w-full shadow-brutal">
          {!isEmbed && (
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tighter uppercase">{t("brand")}</h1>
              <p className="text-xs text-stone-500 font-mono mt-1">{t("platform")}</p>
            </div>
          )}

          <div className="p-5 border-4 border-stone-400 bg-stone-50 mb-6">
            <p className="font-black uppercase text-lg mb-1 text-stone-700">{t("declineView.title")}</p>
            <p className="text-sm text-stone-600">
              {t("declineView.desc", { documentTitle: context?.documentTitle ?? "" })}
            </p>
          </div>

          {declineReason && (
            <div className="mb-6 p-4 bg-stone-100 border-2 border-stone-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">{t("declineView.yourReason")}</p>
              <p className="text-sm text-stone-700 italic">&ldquo;{declineReason}&rdquo;</p>
            </div>
          )}

          <p className="text-xs text-stone-400 font-mono text-center">
            {t("declineView.noReason")}
          </p>
        </div>
      </div>
    );
  }

  // New field-based signing flow
  if (fields && fields.length > 0 && pdfUrl && context) {
    // Show decline/delegate modal overlays
    const DeclineOverlay = showDeclineForm && (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40">
        <div className="bg-white border-4 border-black p-6 w-full max-w-lg space-y-3 shadow-brutal">
          <p className="text-sm font-semibold uppercase tracking-wide">{t("declineModal.reasonPlaceholder")}</p>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="input w-full h-24 resize-none text-sm"
            placeholder={t("declineModal.reasonHint")}
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={handleDecline} disabled={submitting}
              className="px-4 py-2 bg-black text-white text-sm font-bold uppercase hover:bg-stone-800 transition-colors disabled:opacity-50">
              {submitting ? t("declineModal.submitting") : t("declineModal.confirm")}
            </button>
            <button onClick={() => setShowDeclineForm(false)} disabled={submitting}
              className="px-4 py-2 border-2 border-stone-300 text-sm font-bold uppercase hover:border-black transition-colors">
              {t("declineModal.cancel")}
            </button>
          </div>
        </div>
      </div>
    );

    const DelegateOverlay = showDelegateForm && (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40">
        <div className="bg-white border-4 border-black p-6 w-full max-w-lg space-y-3 shadow-brutal">
          <p className="text-sm font-semibold uppercase tracking-wide">{t("actions.delegate")}</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={delegateName}
              onChange={(e) => setDelegateName(e.target.value)}
              placeholder={t("actions.namePlaceholder")}
              className="input text-sm"
              autoFocus
            />
            <input
              type="email"
              value={delegateEmail}
              onChange={(e) => setDelegateEmail(e.target.value)}
              placeholder={t("actions.emailPlaceholder")}
              className="input text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDelegate}
              disabled={delegating || !delegateEmail.trim() || !delegateName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {delegating ? t("actions.delegating") : t("actions.sendToThem")}
            </button>
            <button onClick={() => setShowDelegateForm(false)}
              className="px-4 py-2 border-2 border-stone-300 text-sm font-bold uppercase hover:border-black transition-colors">
              {t("declineModal.cancel")}
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-stone-100">
        {/* Branding header */}
        <div className="bg-white border-b-4" style={{ borderColor: branding.primaryColor ?? "#000" }}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {branding.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="logo" className="h-7 object-contain flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("request.document")}</p>
                <p className="font-semibold text-sm truncate">{context.documentTitle}</p>
              </div>
              <div className="ml-auto text-right hidden sm:block flex-shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("request.signer")}</p>
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
          savedSignatureData={savedSignatureData}
          onDecline={() => setShowDeclineForm(true)}
          onDelegate={() => setShowDelegateForm(true)}
        />

        {DeclineOverlay}
        {DelegateOverlay}
      </div>
    );
  }

  // Legacy flow: simple signature capture (no fields defined)
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header card with branding */}
        <div className="card shadow-brutal" style={{ borderColor: branding.primaryColor ?? undefined }}>
          <div className="text-center mb-6">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-10 object-contain mx-auto mb-3" />
            ) : (
              <h1 className="text-2xl font-bold tracking-tighter uppercase">{t("brand")}</h1>
            )}
            <p className="text-xs text-stone-500 font-mono mt-1">{t("yourSignature")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                {t("request.document")}
              </p>
              <p className="font-semibold text-lg">{context?.documentTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  {t("request.signer")}
                </p>
                <p className="font-semibold text-sm">{context?.signerName}</p>
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
                  {t("request.message")}
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
            {t("signatureLabel")}
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

        {/* Decline form */}
        {showDeclineForm && (
          <div className="card space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide">{t("declineModal.reasonPlaceholder")}</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="input w-full h-20 resize-none text-sm"
              placeholder={t("declineModal.reasonHint")}
            />
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-black text-white text-sm font-bold uppercase hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {submitting ? t("declineModal.submitting") : t("declineModal.confirm")}
              </button>
              <button
                onClick={() => setShowDeclineForm(false)}
                disabled={submitting}
                className="px-4 py-2 border-2 border-stone-300 text-sm font-bold uppercase hover:border-black transition-colors"
              >
                {t("declineModal.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Delegate form */}
        {showDelegateForm && !showDeclineForm && (
          <div className="card space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide">{t("actions.delegate")}</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={delegateName}
                onChange={(e) => setDelegateName(e.target.value)}
                placeholder={t("actions.namePlaceholder")}
                className="input text-sm"
              />
              <input
                type="email"
                value={delegateEmail}
                onChange={(e) => setDelegateEmail(e.target.value)}
                placeholder={t("actions.emailPlaceholder")}
                className="input text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelegate}
                disabled={delegating || !delegateEmail.trim() || !delegateName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold uppercase hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {delegating ? t("actions.delegating") : t("actions.sendToThem")}
              </button>
              <button
                onClick={() => setShowDelegateForm(false)}
                className="px-4 py-2 border-2 border-stone-300 text-sm font-bold uppercase hover:border-black transition-colors"
              >
                {t("declineModal.cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Action links */}
        {!showDeclineForm && !showDelegateForm && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setShowDeclineForm(true)}
              disabled={submitting}
              className="text-xs font-bold uppercase tracking-wide text-stone-500 hover:text-black transition-colors underline"
            >
              {t("actions.declineBtn")}
            </button>
            <span className="text-stone-300">|</span>
            <button
              onClick={() => setShowDelegateForm(true)}
              className="text-xs font-bold uppercase tracking-wide text-blue-500 hover:text-blue-700 transition-colors underline"
            >
              {t("actions.delegateBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
