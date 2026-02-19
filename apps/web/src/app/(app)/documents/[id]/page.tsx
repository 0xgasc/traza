"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, getAccessToken } from "@/lib/api";

interface Signature {
  id: string;
  signerEmail: string;
  signerName: string;
  status: string;
  signedAt?: string | null;
  order: number;
  declineReason?: string | null;
}

interface AuditEvent {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  actorId?: string | null;
}

interface DocumentDetail {
  id: string;
  title: string;
  status: string;
  fileHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  voidReason?: string | null;
  blockchainTxHash?: string | null;
  blockchainNetwork?: string | null;
  signatures: Signature[];
  auditLogs?: AuditEvent[];
}

const STATUS_MAP: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-400",
  SIGNED: "bg-green-100 text-green-800 border-green-400",
  DECLINED: "bg-red-100 text-red-800 border-red-400",
  EXPIRED: "bg-stone-300 text-stone-600",
  VOID: "bg-red-100 text-red-700 border-red-400",
};

function statusClass(status: string): string {
  return STATUS_MAP[status] || "bg-stone-100 text-stone-600";
}

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok = true) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function fetchDocument() {
      try {
        const data = await apiGet<DocumentDetail>("/api/v1/documents/" + id);
        setDoc(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load document";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === "download") {
        // Stream through the API to avoid direct S3/MinIO URL (which may not be browser-accessible)
        const token = getAccessToken();
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${base}/api/v1/documents/${id}/pdf`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to download document");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc?.title || "document"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Download started");
      } else if (action === "certificate") {
        // Fetch HTML with auth headers, then open as blob
        const token = getAccessToken();
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${base}/api/v1/documents/${id}/certificate`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to generate certificate");
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else if (action === "proof") {
        // Download proof bundle as JSON file
        const bundle = await apiPost<Record<string, unknown>>("/api/v1/documents/" + id + "/proof", {});
        const json = JSON.stringify(bundle, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proof-bundle-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Proof bundle downloaded");
      } else if (action === "verify") {
        const result = await apiGet<{ verified: boolean; documentHash: string; hashAlgorithm: string }>("/api/v1/documents/" + id + "/verify");
        if (result.verified) {
          showToast(`Integrity verified — ${result.hashAlgorithm}: ${result.documentHash.slice(0, 16)}…`, true);
        } else {
          showToast("Integrity check FAILED — document may have been tampered with", false);
        }
      } else if (action === "void") {
        const reason = prompt("Optional: enter a reason for voiding this document:");
        if (reason === null) return; // user cancelled
        await apiPost("/api/v1/documents/" + id + "/void", { reason: reason || undefined });
        const data = await apiGet<DocumentDetail>("/api/v1/documents/" + id);
        setDoc(data);
      } else {
        await apiPost("/api/v1/documents/" + id + "/" + action);
        const data = await apiGet<DocumentDetail>("/api/v1/documents/" + id);
        setDoc(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      showToast(message, false);
    } finally {
      setActionLoading("");
    }
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt("Template name:", doc?.title);
    if (!templateName) return;
    try {
      const result = await apiPost<{ id: string }>("/api/v1/templates", {
        name: templateName.trim(),
        fileUrl: (doc as unknown as Record<string, unknown>).fileUrl,
        fileHash: doc?.fileHash,
        pageCount: (doc as unknown as Record<string, unknown>).pageCount,
      });
      router.push("/templates/" + result.id);
    } catch {
      showToast("Failed to save as template", false);
    }
  };

  const handleRemind = async (signatureId: string) => {
    setRemindingId(signatureId);
    try {
      await apiPost(`/api/v1/documents/${id}/signatures/${signatureId}/remind`);
      showToast("Reminder sent!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reminder";
      showToast(message, false);
    } finally {
      setRemindingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-4 w-48 bg-stone-100 animate-pulse mb-8" />
        <div className="card">
          <div className="h-6 w-full bg-stone-200 animate-pulse mb-4" />
          <div className="h-6 w-3/4 bg-stone-200 animate-pulse mb-4" />
          <div className="h-6 w-1/2 bg-stone-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="card">
        <p className="text-sm font-semibold">{error || "Document not found"}</p>
        <Link href="/documents" className="btn-secondary inline-block mt-4">
          Back to Documents
        </Link>
      </div>
    );
  }

  const documentHash = doc.fileHash || "N/A";
  const sendHref = "/documents/" + doc.id + "/send";
  const prepareHref = "/documents/" + doc.id + "/prepare";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 border-4 font-semibold text-sm uppercase tracking-wide shadow-brutal ${toast.ok ? "bg-black text-white border-black" : "bg-red-600 text-white border-red-600"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            {doc.title}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span
              className={"inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide border-2 " + statusClass(doc.status)}
            >
              {doc.status}
            </span>
            <span className="text-sm font-mono text-stone-500">
              {new Date(doc.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {doc.expiresAt && doc.status === "PENDING" && (
              <span className="text-xs font-mono text-yellow-700 bg-yellow-50 border border-yellow-300 px-2 py-0.5">
                Expires {new Date(doc.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            {doc.voidReason && (
              <span className="text-xs font-mono text-red-700">
                Reason: {doc.voidReason}
              </span>
            )}
          </div>
        </div>
        <Link href="/documents" className="btn-secondary">
          Back
        </Link>
      </div>

      {/* Document Hash */}
      <div className="card shadow-brutal mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 mb-3">
          Document Hash
        </h2>
        <p className="font-mono text-sm bg-stone-100 p-3 border-2 border-stone-200 break-all">
          {documentHash}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => handleAction("download")}
          disabled={actionLoading !== ""}
          className="btn-secondary"
        >
          {actionLoading === "download" ? "..." : "Download"}
        </button>

        {doc.status === "DRAFT" && (
          <>
            <Link href={prepareHref} className="btn">
              Prepare for Signing
            </Link>
            <button
              onClick={handleSaveAsTemplate}
              className="px-4 py-2 border-2 border-stone-300 text-sm font-semibold uppercase hover:border-black transition-colors"
            >
              Save as Template
            </button>
            <Link href={sendHref} className="btn">
              Send for Signing
            </Link>
          </>
        )}

        {doc.status === "SIGNED" && (
          <>
            <button
              onClick={() => handleAction("certificate")}
              disabled={actionLoading !== ""}
              className="btn"
            >
              {actionLoading === "certificate" ? "..." : "Certificate of Completion"}
            </button>
            <button
              onClick={() => handleAction("proof")}
              disabled={actionLoading !== ""}
              className="btn-secondary"
            >
              {actionLoading === "proof" ? "..." : "Download Proof Bundle"}
            </button>
          </>
        )}

        {doc.status === "PENDING" && (
          <button
            onClick={() => handleAction("void")}
            disabled={actionLoading !== ""}
            className="bg-red-600 text-white font-bold uppercase tracking-wide px-4 py-2 border-4 border-red-600 hover:bg-red-700 transition-colors text-sm disabled:opacity-40"
          >
            {actionLoading === "void" ? "Voiding..." : "Void Document"}
          </button>
        )}

        {["PENDING", "SIGNED", "EXPIRED", "VOID"].includes(doc.status) && (
          <button
            onClick={async () => {
              if (!confirm("Create a fresh copy of this document for resending?")) return;
              setActionLoading("resend");
              try {
                const result = await apiPost<{ newDocumentId: string }>("/api/v1/documents/" + id + "/resend", {});
                router.push("/documents/" + result.newDocumentId + "/send");
              } catch (err: unknown) {
                showToast(err instanceof Error ? err.message : "Resend failed", false);
              } finally {
                setActionLoading("");
              }
            }}
            disabled={actionLoading !== ""}
            className="px-4 py-2 border-4 border-black bg-white font-bold text-sm uppercase tracking-wide hover:bg-stone-100 transition-colors disabled:opacity-40"
          >
            {actionLoading === "resend" ? "Creating..." : "Resend / Copy"}
          </button>
        )}

        <button
          onClick={() => handleAction("verify")}
          disabled={actionLoading !== ""}
          className="btn-secondary"
        >
          {actionLoading === "verify" ? "..." : "Verify Integrity"}
        </button>

        {!doc.blockchainTxHash && (doc.status === "SIGNED" || doc.status === "PENDING") && (
          <button
            onClick={() => handleAction("anchor")}
            disabled={actionLoading !== ""}
            className="btn-secondary"
          >
            {actionLoading === "anchor" ? "..." : "Anchor to Blockchain"}
          </button>
        )}
      </div>

      {/* Signers Table */}
      {doc.signatures && doc.signatures.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-tight mb-4">
            Signers
          </h2>
          <div className="border-4 border-black bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b-4 border-black bg-black text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Signed At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.signatures.map((sig) => (
                  <tr
                    key={sig.id}
                    className="border-b-2 border-stone-200 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-stone-400">
                      {sig.order}
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm">
                      {sig.signerName}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-500">
                      {sig.signerEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={"inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide border-2 " + statusClass(sig.status)}
                      >
                        {sig.status}
                      </span>
                      {sig.status === "DECLINED" && sig.declineReason && (
                        <p className="text-xs text-stone-500 mt-1 font-mono max-w-xs truncate" title={sig.declineReason}>
                          {sig.declineReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-500">
                      {sig.signedAt
                        ? new Date(sig.signedAt).toLocaleString()
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      {sig.status === "PENDING" && doc.status === "PENDING" && (
                        <button
                          onClick={() => handleRemind(sig.id)}
                          disabled={remindingId === sig.id}
                          className="text-xs font-bold uppercase tracking-wide px-3 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                        >
                          {remindingId === sig.id ? "..." : "Remind"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blockchain Info */}
      {doc.blockchainTxHash && (
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-tight mb-4">
            Blockchain Anchor
          </h2>
          <div className="card shadow-brutal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  Transaction Hash
                </p>
                <p className="font-mono text-sm break-all">
                  {doc.blockchainTxHash}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
                  Network
                </p>
                <p className="font-mono text-sm">{doc.blockchainNetwork || "polygon"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {doc.auditLogs && doc.auditLogs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase tracking-tight mb-4">
            Audit Trail
          </h2>
          <div className="border-4 border-black bg-white">
            {doc.auditLogs.map((event, i) => {
              const isLast = i === doc.auditLogs!.length - 1;
              const label = AUDIT_LABELS[event.eventType] ?? event.eventType;
              const meta = event.metadata as Record<string, unknown>;
              const detail =
                (meta.signerEmail as string) ??
                (meta.reason as string) ??
                (meta.expiredAt ? "expired" : null) ??
                null;
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-4 px-4 py-3 ${isLast ? "" : "border-b-2 border-stone-100"}`}
                >
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-black flex-shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    {detail && (
                      <p className="text-xs font-mono text-stone-500 truncate">{detail}</p>
                    )}
                  </div>
                  <p className="text-xs font-mono text-stone-400 flex-shrink-0">
                    {new Date(event.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const AUDIT_LABELS: Record<string, string> = {
  "document.created": "Document uploaded",
  "document.sent": "Sent for signing",
  "document.viewed": "Signing page viewed",
  "document.signed": "Signed",
  "document.declined": "Declined",
  "document.completed": "All signatures complete",
  "document.downloaded": "Document downloaded",
  "document.voided": "Document voided",
  "document.expired": "Document expired",
  "document.reminded": "Reminder sent",
  "document.anchored": "Anchored to blockchain",
};
