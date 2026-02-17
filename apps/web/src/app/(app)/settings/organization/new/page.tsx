"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const autoSlug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(autoSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(autoSlug(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/v1/organizations", { name: name.trim(), slug });
      router.push("/settings/organization");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">
          New Organization
        </h1>
        <p className="text-sm text-stone-500 font-mono mt-1">
          CREATE A WORKSPACE FOR YOUR TEAM
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input w-full"
            placeholder="Acme Corp"
            required
            minLength={2}
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-stone-400">traza.dev/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="input flex-1"
              placeholder="acme-corp"
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers, and hyphens only"
            />
          </div>
          <p className="text-xs text-stone-500 font-mono mt-1">
            LOWERCASE LETTERS, NUMBERS, AND HYPHENS ONLY
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !name || !slug} className="btn">
            {loading ? "Creating..." : "Create Organization"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border-4 border-black font-semibold uppercase text-sm hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
