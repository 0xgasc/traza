"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  description?: string;
}

export default function SendFromTemplatePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [signerRoles, setSignerRoles] = useState<string[]>([]);
  const [roleEmails, setRoleEmails] = useState<Record<string, string>>({});
  const [roleNames, setRoleNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [tmpl, roles] = await Promise.all([
          apiGet<Template>("/api/v1/templates/" + id),
          apiGet<string[]>("/api/v1/templates/" + id + "/signer-roles"),
        ]);
        setTemplate(tmpl);
        setSignerRoles(roles);
        const emailMap: Record<string, string> = {};
        const nameMap: Record<string, string> = {};
        roles.forEach((r) => { emailMap[r] = ""; nameMap[r] = ""; });
        setRoleEmails(emailMap);
        setRoleNames(nameMap);
      } catch {
        setError("Failed to load template.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      // Step 1: Create document from template
      const signerRoleMap: Record<string, string> = {};
      signerRoles.forEach((r) => { signerRoleMap[r] = roleEmails[r] ?? ""; });

      const doc = await apiPost<{ id: string }>("/api/v1/templates/" + id + "/use", { signerRoleMap });

      // Step 2: Send the created document for signing
      const signers = signerRoles.map((role) => ({
        email: (roleEmails[role] ?? "").trim(),
        name: (roleNames[role] ?? "").trim() || role,
        order: 1,
      }));

      await apiPost("/api/v1/documents/" + doc.id + "/send", {
        signers,
        message: message.trim() || undefined,
        expiresInDays: parseInt(expiresInDays, 10),
      });

      router.push("/documents/" + doc.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-64 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Send from Template</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">{template?.name?.toUpperCase()}</p>
        </div>
        <Link href="/templates" className="btn-secondary">Cancel</Link>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-2xl">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {signerRoles.length === 0 ? (
          <div className="p-4 border-4 border-yellow-400 bg-yellow-50">
            <p className="text-sm font-semibold mb-1">No signer roles in this template</p>
            <p className="text-sm text-stone-600 mb-3">
              Add signature fields with signer roles before sending.
            </p>
            <Link href={"/templates/" + id} className="text-sm font-bold underline">
              Edit Template →
            </Link>
          </div>
        ) : (
          <div>
            <label className="text-sm font-semibold uppercase tracking-wide mb-3 block">
              Assign Signers
            </label>
            <div className="space-y-4">
              {signerRoles.map((role) => (
                <div key={role} className="p-4 border-2 border-stone-200 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{role}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={roleNames[role] ?? ""}
                      onChange={(e) => setRoleNames({ ...roleNames, [role]: e.target.value })}
                      placeholder="Full name"
                      className="input"
                      required
                    />
                    <input
                      type="email"
                      value={roleEmails[role] ?? ""}
                      onChange={(e) => setRoleEmails({ ...roleEmails, [role]: e.target.value })}
                      placeholder="Email address"
                      className="input"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Message (Optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input w-full h-24 resize-none"
            placeholder="Add a message for the signers..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Expiration</label>
          <select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className="input">
            <option value="3">3 Days</option>
            <option value="7">7 Days (default)</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={sending || signerRoles.length === 0}
          className="btn w-full"
        >
          {sending ? "Sending..." : "Send for Signing"}
        </button>
      </form>
    </div>
  );
}
