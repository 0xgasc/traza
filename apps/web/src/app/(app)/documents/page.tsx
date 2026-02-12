"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

interface Document {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  signaturesCount?: number;
  signersCount?: number;
  _count?: { signatures: number };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-400",
  SIGNED: "bg-green-100 text-green-800 border-green-400",
  EXPIRED: "bg-stone-300 text-stone-600",
};

function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] || "bg-stone-100 text-stone-600";
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActionOpenId(null);
      }
    }
    if (actionOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [actionOpenId]);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const data = await apiGet<{ data: Document[]; pagination: unknown }>(
          "/api/v1/documents"
        );
        const docs = Array.isArray(data) ? data : (data.data ?? []);
        setDocuments(docs);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load documents";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const filtered = documents.filter((doc) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <DocumentsSkeleton />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            Documents
          </h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            MANAGE YOUR DOCUMENTS
          </p>
        </div>
        <Link href="/documents/new" className="btn">
          Upload Document
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="input flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="all">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="SIGNED">Signed</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-stone-500 font-semibold">No documents found.</p>
          <Link
            href="/documents/new"
            className="inline-block mt-4 btn-secondary"
          >
            Upload Your First Document
          </Link>
        </div>
      ) : (
        <div className="border-4 border-black bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b-4 border-black bg-black text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Signatures
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, index) => {
                const isLast = index === filtered.length - 1;
                const rowBorder = isLast ? "" : "border-b-2 border-stone-200";
                const viewHref = "/documents/" + doc.id;
                const prepareHref = "/documents/" + doc.id + "/prepare";
                const sendHref = "/documents/" + doc.id + "/send";
                return (
                  <tr
                    key={doc.id}
                    className={rowBorder + " hover:bg-stone-50 transition-colors"}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={viewHref}
                        className="font-semibold text-sm hover:underline underline-offset-4"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={"inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide border-2 " + getStatusStyle(doc.status)}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-500">
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {doc._count?.signatures ?? doc.signaturesCount ?? doc.signersCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <div ref={actionOpenId === doc.id ? dropdownRef : null}>
                        <button
                          onClick={() =>
                            setActionOpenId(
                              actionOpenId === doc.id ? null : doc.id
                            )
                          }
                          className="px-3 py-1 border-2 border-black text-xs font-semibold uppercase hover:bg-black hover:text-white transition-colors"
                        >
                          Actions
                        </button>
                        {actionOpenId === doc.id && (
                          <div className="absolute right-0 top-full mt-1 z-10 bg-white border-4 border-black shadow-brutal min-w-[160px]">
                            <Link
                              href={viewHref}
                              className="block px-4 py-2 text-sm font-semibold hover:bg-stone-100 uppercase text-left"
                              onClick={() => setActionOpenId(null)}
                            >
                              View
                            </Link>
                            <Link
                              href={prepareHref}
                              className="block px-4 py-2 text-sm font-semibold hover:bg-stone-100 uppercase text-left border-t-2 border-stone-200"
                              onClick={() => setActionOpenId(null)}
                            >
                              Prepare
                            </Link>
                            <Link
                              href={sendHref}
                              className="block px-4 py-2 text-sm font-semibold hover:bg-stone-100 uppercase text-left border-t-2 border-stone-200"
                              onClick={() => setActionOpenId(null)}
                            >
                              Send for Signing
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-stone-200 animate-pulse" />
          <div className="h-4 w-64 bg-stone-100 animate-pulse mt-2" />
        </div>
        <div className="h-12 w-40 bg-stone-200 animate-pulse" />
      </div>
      <div className="flex gap-4 mb-6">
        <div className="h-12 flex-1 bg-stone-200 animate-pulse" />
        <div className="h-12 w-40 bg-stone-200 animate-pulse" />
      </div>
      <div className="border-4 border-black bg-white">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="px-4 py-4 border-b-2 border-stone-200 flex gap-4"
          >
            <div className="h-4 w-1/3 bg-stone-200 animate-pulse" />
            <div className="h-4 w-20 bg-stone-200 animate-pulse" />
            <div className="h-4 w-24 bg-stone-200 animate-pulse" />
            <div className="h-4 w-8 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
