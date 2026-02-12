"use client";

import { useState, useRef, FormEvent, DragEvent } from "react";
import Link from "next/link";
import { apiUpload } from "@/lib/api";

interface UploadResult {
  id: string;
  title: string;
  hash: string;
  fileHash?: string;
}

export default function NewDocumentPage() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());

      const data = await apiUpload<UploadResult>("/api/v1/documents", formData);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const viewHref = "/documents/" + result.id;
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            Document Uploaded
          </h1>
        </div>

        <div className="card shadow-brutal max-w-lg">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Title
            </p>
            <p className="font-semibold text-lg">{result.title}</p>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Document Hash
            </p>
            <p className="font-mono text-sm bg-stone-100 p-3 border-2 border-stone-200 break-all">
              {result.hash || result.fileHash}
            </p>
          </div>

          <div className="flex gap-4">
            <Link href={viewHref} className="btn">
              View Document
            </Link>
            <Link href="/documents" className="btn-secondary">
              Back to Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dragClass = dragOver
    ? "border-black bg-stone-100"
    : "border-stone-400 hover:border-black";
  const submitDisabled = loading || !file || !title.trim();
  const submitClass = submitDisabled
    ? "btn w-full opacity-50 cursor-not-allowed"
    : "btn w-full";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">
          Upload Document
        </h1>
        <p className="text-sm text-stone-500 font-mono mt-1">
          UPLOAD A DOCUMENT FOR SIGNING
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-lg">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            placeholder="Enter document title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            File
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={"border-4 border-dashed p-12 text-center cursor-pointer transition-colors " + dragClass}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            {file ? (
              <div>
                <p className="font-semibold">{file.name}</p>
                <p className="text-xs text-stone-500 font-mono mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold uppercase">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-stone-500 font-mono mt-2">
                  PDF, DOC, DOCX, TXT
                </p>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={submitDisabled} className={submitClass}>
          {loading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </div>
  );
}
