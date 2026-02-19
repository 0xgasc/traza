"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Document {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  _count?: { signatures: number };
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { documents: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-stone-200 text-stone-700",
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-400",
  SIGNED: "bg-green-100 text-green-800 border-green-400",
  EXPIRED: "bg-stone-300 text-stone-600",
  VOID: "bg-red-100 text-red-700 border-red-400",
};

function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] || "bg-stone-100 text-stone-600";
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [savingTag, setSavingTag] = useState(false);

  // Tag assignment (per-document)
  const [tagDocId, setTagDocId] = useState<string | null>(null);

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

  // Load tags on mount
  useEffect(() => {
    apiGet<Tag[]>("/api/v1/tags").then(setTags).catch(() => {});
  }, []);

  const fetchDocuments = useCallback(
    async (searchVal: string, statusVal: string, pageVal: number, tagId: string | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pageVal), limit: "20" });
        if (searchVal) params.set("search", searchVal);
        if (statusVal !== "all") params.set("status", statusVal);
        if (tagId) params.set("tagId", tagId);

        const data = await apiGet<{
          data: Document[];
          pagination: { total: number; page: number; limit: number; totalPages: number };
        }>("/api/v1/documents?" + params.toString());

        setDocuments(Array.isArray(data) ? data : (data.data ?? []));
        if (!Array.isArray(data) && data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load documents";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Re-fetch when page, status, or tag changes immediately
  useEffect(() => {
    fetchDocuments(search, statusFilter, page, tagFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, tagFilter]);

  // Debounce search input
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchDocuments(val, statusFilter, 1, tagFilter);
    }, 350);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleTagFilter = (tagId: string | null) => {
    setTagFilter(tagId);
    setPage(1);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);
    try {
      const tag = await apiPost<Tag>("/api/v1/tags", { name: newTagName.trim(), color: newTagColor });
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTagName("");
    } catch {
      // ignore
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    await apiDelete("/api/v1/tags/" + tagId).catch(() => {});
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    if (tagFilter === tagId) setTagFilter(null);
  };

  const handleAddTagToDoc = async (docId: string, tagId: string) => {
    await apiPost("/api/v1/tags/documents/" + docId, { tagId }).catch(() => {});
    // Refresh documents to show updated tags
    fetchDocuments(search, statusFilter, page, tagFilter);
    setTagDocId(null);
    setActionOpenId(null);
  };

  const handleRemoveTagFromDoc = async (docId: string, tagId: string) => {
    await apiDelete("/api/v1/tags/documents/" + docId + "/" + tagId).catch(() => {});
    fetchDocuments(search, statusFilter, page, tagFilter);
  };

  const totalPages = pagination?.totalPages ?? 1;

  if (loading && documents.length === 0) {
    return <DocumentsSkeleton />;
  }

  const TAG_PRESETS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Documents</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {pagination ? `${pagination.total} TOTAL` : "MANAGE YOUR DOCUMENTS"}
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
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search documents..."
          className="input flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="input"
        >
          <option value="all">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="SIGNED">Signed</option>
          <option value="EXPIRED">Expired</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Filter by tag:</span>
          <button
            onClick={() => handleTagFilter(null)}
            className={`px-3 py-1 text-xs font-bold uppercase border-2 transition-colors ${
              tagFilter === null
                ? "border-black bg-black text-white"
                : "border-stone-300 hover:border-black"
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagFilter(tagFilter === tag.id ? null : tag.id)}
              className={`px-3 py-1 text-xs font-bold uppercase border-2 transition-colors ${
                tagFilter === tag.id
                  ? "text-white border-transparent"
                  : "border-stone-300 hover:border-stone-500"
              }`}
              style={tagFilter === tag.id ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              {tag._count ? ` (${tag._count.documents})` : ""}
            </button>
          ))}
          <button
            onClick={() => setShowTagManager(!showTagManager)}
            className="px-3 py-1 text-xs font-bold uppercase border-2 border-dashed border-stone-300 hover:border-black transition-colors text-stone-400 hover:text-black"
          >
            + Manage Tags
          </button>
        </div>
      )}

      {tags.length === 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowTagManager(!showTagManager)}
            className="text-xs font-semibold uppercase tracking-wide text-stone-400 hover:text-black transition-colors"
          >
            + Add tags to organize documents
          </button>
        </div>
      )}

      {/* Tag manager panel */}
      {showTagManager && (
        <div className="mb-6 p-4 border-4 border-black bg-white space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Manage Tags</h3>
          {/* Existing tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5 px-3 py-1 border-2 border-stone-200"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-xs font-bold uppercase">{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="ml-1 text-stone-300 hover:text-red-500 transition-colors text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Create new tag */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="input text-sm flex-1 max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
            <div className="flex gap-1">
              {TAG_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: newTagColor === c ? "#000" : "transparent",
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleCreateTag}
              disabled={savingTag || !newTagName.trim()}
              className="btn text-sm"
            >
              {savingTag ? "..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {documents.length === 0 && !loading ? (
        <div className="card text-center py-12">
          <p className="text-stone-500 font-semibold">No documents found.</p>
          <Link href="/documents/new" className="inline-block mt-4 btn-secondary">
            Upload Your First Document
          </Link>
        </div>
      ) : (
        <>
          <div className={`border-4 border-black bg-white ${loading ? "opacity-60" : ""} transition-opacity`}>
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
                    Tags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Signers
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => {
                  const isLast = index === documents.length - 1;
                  const rowBorder = isLast ? "" : "border-b-2 border-stone-200";
                  const viewHref = "/documents/" + doc.id;
                  const prepareHref = "/documents/" + doc.id + "/prepare";
                  const sendHref = "/documents/" + doc.id + "/send";
                  const docTags = doc.tags?.map((dt) => dt.tag) ?? [];
                  const assignableTags = tags.filter((t) => !docTags.some((dt) => dt.id === t.id));
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
                        {doc.status === "PENDING" && doc.expiresAt && (
                          <p className="text-xs font-mono text-stone-400 mt-0.5">
                            Expires {new Date(doc.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide border-2 " +
                            getStatusStyle(doc.status)
                          }
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {docTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase border border-stone-200 group cursor-pointer"
                              onClick={() => handleRemoveTagFromDoc(doc.id, tag.id)}
                              title="Click to remove tag"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                              <span className="opacity-0 group-hover:opacity-100 text-red-400 ml-0.5">×</span>
                            </span>
                          ))}
                          {/* Add tag button */}
                          {tags.length > 0 && assignableTags.length > 0 && (
                            <div className="relative">
                              <button
                                onClick={() => setTagDocId(tagDocId === doc.id ? null : doc.id)}
                                className="px-1.5 py-0.5 text-xs border border-dashed border-stone-300 text-stone-400 hover:border-stone-500 hover:text-stone-600 transition-colors"
                              >
                                +
                              </button>
                              {tagDocId === doc.id && (
                                <div className="absolute left-0 top-full mt-1 z-20 bg-white border-4 border-black shadow-brutal min-w-[160px]">
                                  {assignableTags.map((tag) => (
                                    <button
                                      key={tag.id}
                                      onClick={() => handleAddTagToDoc(doc.id, tag.id)}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold uppercase hover:bg-stone-100 text-left"
                                    >
                                      <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: tag.color }}
                                      />
                                      {tag.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-stone-500">
                        {new Date(doc.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {doc._count?.signatures ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <div ref={actionOpenId === doc.id ? dropdownRef : null}>
                          <button
                            onClick={() =>
                              setActionOpenId(actionOpenId === doc.id ? null : doc.id)
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
                              {doc.status === "DRAFT" && (
                                <>
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
                                </>
                              )}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs font-mono text-stone-500 uppercase tracking-wide">
                Page {page} of {totalPages} &mdash; {pagination?.total ?? 0} documents
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
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
          <div key={i} className="px-4 py-4 border-b-2 border-stone-200 flex gap-4">
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
