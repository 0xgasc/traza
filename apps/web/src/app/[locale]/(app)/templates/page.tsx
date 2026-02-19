"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("templates");
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
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await apiDelete("/api/v1/templates/" + id);
      setTemplates(templates.filter((tmpl) => tmpl.id !== id));
    } catch {
      alert(t("deleteFailed"));
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

  const count = templates.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{t("title")}</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {count > 0 ? t("subtitleWithCount", { count }) : t("subtitleEmpty")}
          </p>
        </div>
        <Link href="/templates/new" className="btn">
          {t("new")}
        </Link>
      </div>

      {count === 0 ? (
        <div className="card text-center py-12">
          <p className="text-stone-500 font-semibold mb-2">{t("noTemplates")}</p>
          <p className="text-sm text-stone-400 mb-6">
            {t("noTemplatesDesc")}
          </p>
          <Link href="/templates/new" className="btn-secondary">
            {t("createFirst")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{tmpl.name}</p>
                {tmpl.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{tmpl.description}</p>
                )}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs font-mono text-stone-400">
                    {t("fields", { count: tmpl._count?.fields ?? 0 })}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    {t("usedCount", { count: tmpl.useCount })}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    {new Date(tmpl.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={"/templates/" + tmpl.id + "/send"}
                  className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-stone-800 transition-colors"
                >
                  {t("use")}
                </Link>
                <Link
                  href={"/templates/" + tmpl.id}
                  className="px-3 py-1.5 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                >
                  {t("edit")}
                </Link>
                <button
                  onClick={() => deleteTemplate(tmpl.id)}
                  className="px-3 py-1.5 border-2 border-stone-300 text-xs font-bold uppercase hover:border-black transition-colors"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
