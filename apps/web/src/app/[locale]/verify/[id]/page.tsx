"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface VerifyResponse {
  documentId: string;
  title: string;
  status: string;
  documentHash: string;
  hashAlgorithm: string;
  createdAt: string;
  completedAt: string | null;
  signers: Array<{
    signerName: string;
    signerEmail: string;
    signedAt: string | null;
    signatureType: string | null;
    order: number;
  }>;
  blockchain: {
    network: string;
    txHash: string;
    url: string | null;
  } | null;
  audit: Array<{ eventType: string; timestamp: string }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const STATUS_COPY: Record<string, { label: string; bg: string }> = {
  SIGNED: { label: "Fully signed", bg: "bg-green-100 border-green-400 text-green-800" },
  PENDING: { label: "Awaiting signatures", bg: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  DRAFT: { label: "Draft", bg: "bg-stone-100 border-stone-400 text-stone-700" },
  VOID: { label: "Voided", bg: "bg-red-100 border-red-400 text-red-800" },
  EXPIRED: { label: "Expired", bg: "bg-red-100 border-red-400 text-red-800" },
  DECLINED: { label: "Declined", bg: "bg-red-100 border-red-400 text-red-800" },
};

const AUDIT_LABELS: Record<string, string> = {
  "document.sent": "Sent for signing",
  "document.signed": "Signature captured",
  "document.completed": "All signatures complete",
  "document.anchored": "Anchored to blockchain",
};

function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default function VerifyPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/verify/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This document does not exist or has been deleted.");
          } else {
            setError(`Unable to verify (${res.status}).`);
          }
          return;
        }
        const json = await res.json();
        setData((json.data ?? json) as VerifyResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    load();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full">
          <h1 className="font-bold uppercase text-lg tracking-tight mb-2">Verification failed</h1>
          <p className="text-sm text-stone-700">{error}</p>
          <p className="text-xs font-mono text-stone-500 mt-4">Document ID: {id}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  const statusInfo = STATUS_COPY[data.status] ?? { label: data.status, bg: "bg-stone-100 border-stone-400 text-stone-700" };

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-bold uppercase text-2xl tracking-tighter">TRAZA</span>
          <span className="text-xs font-mono text-stone-500">Verification</span>
        </div>

        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <h1 className="font-bold uppercase text-xl tracking-tight mb-1">{data.title}</h1>
          <p className="text-xs font-mono text-stone-500 break-all">{data.documentId}</p>
          <div className={`inline-block mt-3 px-3 py-1 border-2 text-xs font-bold uppercase tracking-wide ${statusInfo.bg}`}>
            {statusInfo.label}
          </div>
        </div>

        <Section title="Document integrity">
          <Row label="Hash algorithm" value={data.hashAlgorithm} />
          <Row label="SHA-256 hash" value={data.documentHash} mono break />
          <Row label="Created" value={fmt(data.createdAt)} />
          {data.completedAt && <Row label="Completed" value={fmt(data.completedAt)} />}
        </Section>

        <Section title={`Signers (${data.signers.length})`}>
          {data.signers.length === 0 ? (
            <p className="text-sm text-stone-500">No signatures yet.</p>
          ) : (
            <div className="space-y-3">
              {data.signers.map((s, i) => (
                <div key={i} className="border-l-4 border-black pl-3 py-1">
                  <p className="font-bold text-sm">{s.signerName}</p>
                  <p className="text-xs font-mono text-stone-600">{s.signerEmail}</p>
                  <p className="text-xs text-stone-500 mt-1">Signed {fmt(s.signedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {data.blockchain && (
          <Section title="Blockchain anchor">
            <Row label="Network" value={data.blockchain.network} />
            <Row label="Tx hash" value={data.blockchain.txHash} mono break />
            {data.blockchain.url && (
              <a
                href={data.blockchain.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs font-bold uppercase tracking-wide text-blue-600 underline hover:text-blue-800"
              >
                View on chain ↗
              </a>
            )}
          </Section>
        )}

        {data.audit.length > 0 && (
          <Section title="Audit trail">
            <div className="space-y-1">
              {data.audit.map((e, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="font-semibold">{AUDIT_LABELS[e.eventType] ?? e.eventType}</span>
                  <span className="font-mono text-stone-500">{fmt(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="text-[10px] text-stone-400 text-center mt-8 font-mono">
          This page is publicly viewable. The document content itself is not exposed here.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
      <h2 className="font-bold uppercase text-sm tracking-wide mb-3 border-b-2 border-black pb-1">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, mono, break: breakAll }: { label: string; value: string; mono?: boolean; break?: boolean }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} ${breakAll ? "break-all" : ""}`}>{value}</p>
    </div>
  );
}
