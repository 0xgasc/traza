"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  description?: string;
  pageCount?: number;
  useCount: number;
  createdAt: string;
  _count?: { fields: number };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const data = await apiGet<Template[]>("/api/v1/templates");
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await apiDelete("/api/v1/templates/" + id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch {
      alert("Failed to delete template.");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-stone-200 animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-stone-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Templates</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {templates.length > 0 ? `${templates.length} SAVED TEMPLATES` : "REUSABLE DOCUMENT TEMPLATES"}
          </p>
        </div>
        <Link href="/templates/new" className="btn">
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-stone-500 font-semibold mb-2">No templates yet.</p>
          <p className="text-sm text-stone-400 mb-6">
            Templates let you reuse a document with pre-placed fields — no re-uploading needed.
          </p>
          <Link href="/templates/new" className="btn-secondary">
            Create Your First Template
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>
                )}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs font-mono text-stone-400">
                    {t._count?.fields ?? 0} fields
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    Used {t.useCount}×
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={"/templates/" + t.id + "/send"}
                  className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-stone-800 transition-colors"
                >
                  Use
                </Link>
                <Link
                  href={"/templates/" + t.id}
                  className="px-3 py-1.5 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="px-3 py-1.5 border-2 border-stone-300 text-xs font-bold uppercase hover:border-black transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
