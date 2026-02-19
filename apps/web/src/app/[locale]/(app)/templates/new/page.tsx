"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiPost } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function NewTemplatePage() {
  const t = useTranslations("templateNew");
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError(t("errorNoFile")); return; }
    if (!name.trim()) { setError(t("errorNoName")); return; }

    setUploading(true);
    setError("");

    try {
      // Upload file as document first to get fileUrl/fileHash
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", name.trim());

      const token = localStorage.getItem("accessToken");
      const uploadRes = await fetch(API_BASE + "/api/v1/documents", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || t("errorUploadFailed"));
      }

      const doc = await uploadRes.json();
      const docData = doc.data || doc;

      // Create template from the uploaded file
      const template = await apiPost<{ id: string }>("/api/v1/templates", {
        name: name.trim(),
        description: description.trim() || undefined,
        fileUrl: docData.fileUrl,
        fileHash: docData.fileHash,
        pageCount: docData.pageCount,
      });

      router.push("/templates/" + template.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorCreateFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">{t("title")}</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-lg">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("labelName")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder={t("placeholderName")}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("labelDescription")}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full"
            placeholder={t("placeholderDescription")}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("labelPdf")}</label>
          <div className="border-4 border-dashed border-stone-300 hover:border-black transition-colors p-8 text-center">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              {file ? (
                <div>
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-xs text-stone-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-stone-500">{t("fileSelectPrompt")}</p>
                  <p className="text-xs text-stone-400 mt-1">{t("fileDropHint")}</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <button type="submit" disabled={uploading} className="btn w-full">
          {uploading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
