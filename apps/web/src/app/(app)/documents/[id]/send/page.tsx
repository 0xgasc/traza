"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface Signer {
  email: string;
  name: string;
  fieldCount?: number;
}

interface FieldData {
  id: string;
  signerEmail: string;
  fieldType: string;
}

export default function SendForSigningPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [signers, setSigners] = useState<Signer[]>([]);
  const [message, setMessage] = useState("");
  const [expirationDays, setExpirationDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Fetch fields and derive signers on mount
  useEffect(() => {
    async function fetchSigners() {
      try {
        const fields = await apiGet<FieldData[]>('/api/v1/documents/' + id + '/fields');

        // Extract unique signers from fields
        const signerMap = new Map<string, { email: string; count: number }>();
        for (const field of fields) {
          if (field.signerEmail) {
            const existing = signerMap.get(field.signerEmail);
            if (existing) {
              existing.count++;
            } else {
              signerMap.set(field.signerEmail, { email: field.signerEmail, count: 1 });
            }
          }
        }

        // Convert to array with default names from email
        const signerList: Signer[] = Array.from(signerMap.values()).map(s => ({
          email: s.email,
          name: s.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          fieldCount: s.count,
        }));

        setSigners(signerList.length > 0 ? signerList : [{ email: "", name: "" }]);
      } catch (err) {
        // If fields fetch fails, start with empty signer
        setSigners([{ email: "", name: "" }]);
      } finally {
        setLoading(false);
      }
    }

    fetchSigners();
  }, [id]);

  const addSigner = () => {
    setSigners([...signers, { email: "", name: "" }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length === 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    const validSigners = signers.filter(
      (s) => s.email.trim() && s.name.trim()
    );

    if (validSigners.length === 0) {
      setError("At least one signer with name and email is required.");
      setSending(false);
      return;
    }

    try {
      await apiPost("/api/v1/documents/" + id + "/send", {
        signers: validSigners.map(s => ({ email: s.email, name: s.name })),
        message: message.trim() || undefined,
        expirationDays: parseInt(expirationDays, 10),
      });
      router.push("/documents/" + id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const cancelHref = "/documents/" + id;
  const prepareHref = "/documents/" + id + "/prepare";
  const hasFieldSigners = signers.some(s => s.fieldCount && s.fieldCount > 0);

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-4 w-48 bg-stone-100 animate-pulse mb-8" />
        <div className="h-64 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            Send for Signing
          </h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {hasFieldSigners ? "SIGNERS FROM PREPARED FIELDS" : "ADD SIGNERS AND SEND"}
          </p>
        </div>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>

      {!hasFieldSigners && (
        <div className="mb-6 p-4 border-4 border-yellow-400 bg-yellow-50 max-w-2xl">
          <p className="text-sm font-semibold mb-2">No fields placed yet</p>
          <p className="text-sm text-stone-600 mb-3">
            For the best experience, place signature fields on the document first.
            This lets signers know exactly where to sign.
          </p>
          <Link href={prepareHref} className="text-sm font-bold underline">
            Go to Prepare Document →
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-2xl">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-3">
            Signers
          </label>
          <div className="space-y-3">
            {signers.map((signer, index) => (
              <div key={index} className="flex gap-3 items-start">
                <input
                  type="text"
                  value={signer.name}
                  onChange={(e) => updateSigner(index, "name", e.target.value)}
                  placeholder="Name"
                  className="input flex-1"
                  required
                />
                <input
                  type="email"
                  value={signer.email}
                  onChange={(e) => updateSigner(index, "email", e.target.value)}
                  placeholder="Email"
                  className="input flex-1"
                  required
                  disabled={!!signer.fieldCount} // Can't change email if fields exist
                />
                {signer.fieldCount ? (
                  <span className="px-3 py-3 text-xs font-bold text-stone-400 uppercase">
                    {signer.fieldCount} field{signer.fieldCount !== 1 ? 's' : ''}
                  </span>
                ) : signers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSigner(index)}
                    className="px-3 py-3 border-3 border-black font-bold hover:bg-black hover:text-white transition-colors"
                  >
                    X
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {!hasFieldSigners && (
            <button
              type="button"
              onClick={addSigner}
              className="mt-3 px-4 py-2 border-3 border-black text-sm font-semibold uppercase hover:bg-black hover:text-white transition-colors"
            >
              + Add Signer
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input w-full h-32 resize-none"
            placeholder="Add a message for the signers..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Expiration
          </label>
          <select
            value={expirationDays}
            onChange={(e) => setExpirationDays(e.target.value)}
            className="input"
          >
            <option value="3">3 Days</option>
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>

        <button type="submit" disabled={sending} className="btn w-full">
          {sending ? "Sending..." : "Send for Signing"}
        </button>
      </form>
    </div>
  );
}
