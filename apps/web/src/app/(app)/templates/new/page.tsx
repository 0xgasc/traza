"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a PDF file."); return; }
    if (!name.trim()) { setError("Please enter a template name."); return; }

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
        throw new Error(errData?.error?.message || "Upload failed");
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
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">New Template</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">UPLOAD A PDF TO CREATE A REUSABLE TEMPLATE</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-lg">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder="e.g., NDA Agreement, Offer Letter..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full"
            placeholder="Brief description of when to use this template"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">PDF Document</label>
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
                  <p className="font-semibold text-stone-500">Click to select PDF</p>
                  <p className="text-xs text-stone-400 mt-1">or drag and drop</p>
                </div>
              )}
            </label>
          </div>
        </div>

        <button type="submit" disabled={uploading} className="btn w-full">
          {uploading ? "Creating Template..." : "Create Template"}
        </button>
      </form>
    </div>
  );
}
