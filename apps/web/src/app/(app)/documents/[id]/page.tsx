"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface Signature {
  id: string;
  signerEmail: string;
  signerName: string;
  status: string;
  signedAt?: string | null;
  order: number;
}

interface DocumentDetail {
  id: string;
  title: string;
  status: string;
  fileHash: string;
  createdAt: string;
  updatedAt: string;
  blockchainTxHash?: string | null;
  blockchainNetwork?: string | null;
  signatures: Signature[];
}

const STATUS_MAP: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-400",
  SIGNED: "bg-green-100 text-green-800 border-green-400",
  DECLINED: "bg-red-100 text-red-800 border-red-400",
  EXPIRED: "bg-stone-300 text-stone-600",
};

function statusClass(status: string): string {
  return STATUS_MAP[status] || "bg-stone-100 text-stone-600";
}

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

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
        // Download uses GET and returns a presigned URL
        const result = await apiGet<{ downloadUrl: string }>("/api/v1/documents/" + id + "/download");
        window.open(result.downloadUrl, "_blank");
      } else {
        await apiPost("/api/v1/documents/" + id + "/" + action);
        const data = await apiGet<DocumentDetail>("/api/v1/documents/" + id);
        setDoc(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      alert(message);
    } finally {
      setActionLoading("");
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
        <Link href={prepareHref} className="btn">
          Prepare for Signing
        </Link>
        <Link href={sendHref} className="btn">
          Send for Signing
        </Link>
        <button
          onClick={() => handleAction("verify")}
          disabled={actionLoading !== ""}
          className="btn-secondary"
        >
          {actionLoading === "verify" ? "..." : "Verify"}
        </button>
        <button
          onClick={() => handleAction("anchor")}
          disabled={actionLoading !== ""}
          className="btn-secondary"
        >
          {actionLoading === "anchor" ? "..." : "Anchor"}
        </button>
        <button
          onClick={() => handleAction("proof")}
          disabled={actionLoading !== ""}
          className="btn-secondary"
        >
          {actionLoading === "proof" ? "..." : "Generate Proof"}
        </button>
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
                </tr>
              </thead>
              <tbody>
                {doc.signatures.map((sig) => (
                  <tr
                    key={sig.id}
                    className="border-b-2 border-stone-200 hover:bg-stone-50"
                  >
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
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-500">
                      {sig.signedAt
                        ? new Date(sig.signedAt).toLocaleString()
                        : "\u2014"}
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
    </div>
  );
}
