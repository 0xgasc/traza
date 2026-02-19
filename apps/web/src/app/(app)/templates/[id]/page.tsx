"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  description?: string;
  pageCount?: number;
  useCount: number;
  createdAt: string;
  _count?: { fields: number };
  fields?: Array<{ id: string; signerRole: string; fieldType: string }>;
}

export default function TemplatePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Template>("/api/v1/templates/" + id)
      .then((data) => {
        setTemplate(data);
        setName(data.name);
        setDescription(data.description || "");
      })
      .catch(() => setError("Template not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiPatch<Template>("/api/v1/templates/" + id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setTemplate(updated);
      setEditing(false);
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this template permanently?")) return;
    try {
      await apiDelete("/api/v1/templates/" + id);
      router.push("/templates");
    } catch {
      setError("Failed to delete.");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-32 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="card">
        <p className="text-sm font-semibold">{error}</p>
        <Link href="/templates" className="btn-secondary inline-block mt-4">Back to Templates</Link>
      </div>
    );
  }

  const signerRoles = [...new Set((template?.fields || []).map((f) => f.signerRole))];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{template?.name}</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {template?._count?.fields ?? template?.fields?.length ?? 0} FIELDS · USED {template?.useCount}×
          </p>
        </div>
        <Link href="/templates" className="btn-secondary">All Templates</Link>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={"/templates/" + id + "/send"} className="btn">
          Use Template
        </Link>
        <Link
          href={"/templates/" + id + "/bulk-send"}
          className="px-4 py-2 border-4 border-black text-sm font-semibold uppercase hover:bg-black hover:text-white transition-colors"
        >
          Bulk Send
        </Link>
        <Link
          href={"/templates/" + id + "/prepare"}
          className="px-4 py-2 border-4 border-black text-sm font-semibold uppercase hover:bg-black hover:text-white transition-colors"
        >
          Edit Fields
        </Link>
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 border-2 border-stone-300 text-sm font-semibold uppercase hover:border-black transition-colors"
        >
          {editing ? "Cancel" : "Edit Info"}
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 border-2 border-red-200 text-sm font-semibold uppercase text-red-600 hover:border-red-600 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} className="max-w-lg space-y-4 mb-8 p-6 border-4 border-black bg-white">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Edit Template Info</h2>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn">
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template info */}
      <div className="max-w-lg space-y-4">
        {template?.description && (
          <div className="card">
            <p className="text-xs text-stone-500 font-mono uppercase mb-1">Description</p>
            <p className="text-sm">{template.description}</p>
          </div>
        )}

        {signerRoles.length > 0 && (
          <div className="card">
            <p className="text-xs text-stone-500 font-mono uppercase mb-3">Signer Roles</p>
            <div className="flex flex-wrap gap-2">
              {signerRoles.map((role) => (
                <span key={role} className="px-3 py-1 bg-stone-100 border-2 border-stone-300 text-xs font-bold uppercase">
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <p className="text-xs text-stone-500 font-mono uppercase mb-3">Stats</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black">{template?._count?.fields ?? template?.fields?.length ?? 0}</p>
              <p className="text-xs font-mono text-stone-500">FIELDS</p>
            </div>
            <div>
              <p className="text-2xl font-black">{signerRoles.length}</p>
              <p className="text-xs font-mono text-stone-500">ROLES</p>
            </div>
            <div>
              <p className="text-2xl font-black">{template?.useCount}</p>
              <p className="text-xs font-mono text-stone-500">USES</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
