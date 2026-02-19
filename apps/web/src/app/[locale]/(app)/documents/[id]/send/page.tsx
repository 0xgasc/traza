"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { apiGet, apiPost } from "@/lib/api";

interface Signer {
  email: string;
  name: string;
  order: number;
  fieldCount?: number;
  accessCode?: string;
}

interface FieldData {
  id: string;
  signerEmail: string;
  fieldType: string;
}

export default function SendForSigningPage() {
  const t = useTranslations("send");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [signers, setSigners] = useState<Signer[]>([]);
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [sequential, setSequential] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ccRecipients, setCcRecipients] = useState<Array<{email: string; name: string}>>([]);

  useEffect(() => {
    async function fetchSigners() {
      try {
        const fields = await apiGet<FieldData[]>("/api/v1/documents/" + id + "/fields");

        const signerMap = new Map<string, { email: string; count: number }>();
        for (const field of fields) {
          if (field.signerEmail) {
            const existing = signerMap.get(field.signerEmail);
            if (existing) existing.count++;
            else signerMap.set(field.signerEmail, { email: field.signerEmail, count: 1 });
          }
        }

        const signerList: Signer[] = Array.from(signerMap.values()).map((s, i) => ({
          email: s.email,
          name:
            s.email.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
            s.email,
          order: i + 1,
          fieldCount: s.count,
        }));

        setSigners(signerList.length > 0 ? signerList : [{ email: "", name: "", order: 1 }]);
      } catch {
        setSigners([{ email: "", name: "", order: 1 }]);
      } finally {
        setLoading(false);
      }
    }

    fetchSigners();
  }, [id]);

  const addSigner = () => {
    setSigners([...signers, { email: "", name: "", order: signers.length + 1 }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length === 1) return;
    setSigners(
      signers
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 })),
    );
  };

  const updateSigner = (index: number, field: keyof Signer, value: string | number) => {
    const updated = [...signers];
    updated[index] = { ...updated[index]!, [field]: value };
    setSigners(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...signers];
    const a = updated[index - 1]!.order;
    const b = updated[index]!.order;
    updated[index - 1] = { ...updated[index - 1]!, order: b };
    updated[index] = { ...updated[index]!, order: a };
    setSigners(updated);
  };

  const moveDown = (index: number) => {
    if (index === signers.length - 1) return;
    const updated = [...signers];
    const a = updated[index]!.order;
    const b = updated[index + 1]!.order;
    updated[index] = { ...updated[index]!, order: b };
    updated[index + 1] = { ...updated[index + 1]!, order: a };
    setSigners(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    const validSigners = signers.filter((s) => s.email.trim() && s.name.trim());

    if (validSigners.length === 0) {
      setError(t("signerRequired"));
      setSending(false);
      return;
    }

    try {
      await apiPost("/api/v1/documents/" + id + "/send", {
        signers: validSigners.map((s) => ({
          email: s.email.trim(),
          name: s.name.trim(),
          order: sequential ? s.order : 1,
          accessCode: s.accessCode?.trim() || undefined,
        })),
        message: message.trim() || undefined,
        expiresInDays: parseInt(expiresInDays, 10),
      });
      const validCc = ccRecipients.filter((cc) => cc.email.trim() && cc.name.trim());
      if (validCc.length > 0) {
        await apiPost("/api/v1/documents/" + id + "/recipients", { recipients: validCc });
      }
      router.push("/documents/" + id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const hasFieldSigners = signers.some((s) => s.fieldCount && s.fieldCount > 0);
  const validCount = signers.filter((s) => s.email && s.name).length;
  const displaySigners = sequential ? [...signers].sort((a, b) => a.order - b.order) : signers;

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
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{t("title")}</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">
            {hasFieldSigners ? t("subtitleFromFields") : t("subtitleAddSigners")}
          </p>
        </div>
        <Link href={"/documents/" + id} className="btn-secondary">
          {t("cancel")}
        </Link>
      </div>

      {!hasFieldSigners && (
        <div className="mb-6 p-4 border-4 border-yellow-400 bg-yellow-50 max-w-2xl">
          <p className="text-sm font-semibold mb-1">{t("noFieldsTitle")}</p>
          <p className="text-sm text-stone-600 mb-3">
            {t("noFieldsBody")}
          </p>
          <Link href={"/documents/" + id + "/prepare"} className="text-sm font-bold underline">
            {t("goToPrepare")}
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100 max-w-2xl">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Signers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold uppercase tracking-wide">{t("signers")}</label>
            {signers.length > 1 && (
              <button
                type="button"
                onClick={() => setSequential(!sequential)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 transition-colors ${
                  sequential ? "bg-black text-white border-black" : "bg-white text-black border-stone-300 hover:border-black"
                }`}
              >
                {sequential ? t("sequentialOn") : t("sequential")}
              </button>
            )}
          </div>

          {sequential && (
            <p className="mb-3 text-xs font-mono text-stone-500 bg-stone-50 border-2 border-stone-200 px-3 py-2">
              {t("sequentialHint")}
            </p>
          )}

          <div className="space-y-2">
            {displaySigners.map((signer, displayIndex) => {
              const originalIndex = signers.findIndex((s) => s === signer);
              return (
                <div key={originalIndex} className="flex gap-2 items-center">
                  {sequential && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(displayIndex)}
                        disabled={displayIndex === 0}
                        className="w-7 h-5 text-xs border border-stone-300 hover:border-black hover:bg-black hover:text-white transition-colors disabled:opacity-20 flex items-center justify-center"
                      >
                        ▲
                      </button>
                      <div className="w-7 h-7 flex items-center justify-center text-xs font-bold font-mono bg-black text-white">
                        {signer.order}
                      </div>
                      <button
                        type="button"
                        onClick={() => moveDown(displayIndex)}
                        disabled={displayIndex === displaySigners.length - 1}
                        className="w-7 h-5 text-xs border border-stone-300 hover:border-black hover:bg-black hover:text-white transition-colors disabled:opacity-20 flex items-center justify-center"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={signer.name}
                    onChange={(e) => updateSigner(originalIndex, "name", e.target.value)}
                    placeholder={t("fullNamePlaceholder")}
                    className="input flex-1"
                    required
                  />
                  <input
                    type="email"
                    value={signer.email}
                    onChange={(e) => updateSigner(originalIndex, "email", e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="input flex-1"
                    required
                    disabled={!!signer.fieldCount}
                  />
                  <input
                    type="text"
                    value={signer.accessCode ?? ""}
                    onChange={(e) => updateSigner(originalIndex, "accessCode", e.target.value)}
                    placeholder={t("pinPlaceholder")}
                    className="input w-24 flex-shrink-0"
                    maxLength={16}
                  />
                  {signer.fieldCount ? (
                    <span className="text-xs font-bold text-stone-400 uppercase w-8 text-center flex-shrink-0">
                      {signer.fieldCount}f
                    </span>
                  ) : signers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSigner(originalIndex)}
                      className="w-8 h-10 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors flex-shrink-0 flex items-center justify-center"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!hasFieldSigners && (
            <button
              type="button"
              onClick={addSigner}
              className="mt-3 px-4 py-2 border-2 border-black text-sm font-semibold uppercase hover:bg-black hover:text-white transition-colors"
            >
              {t("addSigner")}
            </button>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("messageLabel")}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input w-full h-28 resize-none"
            placeholder={t("messagePlaceholder")}
          />
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("expiration")}
          </label>
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="input"
          >
            <option value="3">{t("days3")}</option>
            <option value="7">{t("days7")}</option>
            <option value="14">{t("days14")}</option>
            <option value="30">{t("days30")}</option>
            <option value="60">{t("days60")}</option>
            <option value="90">{t("days90")}</option>
          </select>
        </div>

        {/* CC Recipients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold uppercase tracking-wide">{t("ccRecipients")}</label>
            <button
              type="button"
              onClick={() => setCcRecipients([...ccRecipients, { email: "", name: "" }])}
              className="text-xs font-bold underline uppercase tracking-wide text-stone-500 hover:text-black"
            >
              {t("addCc")}
            </button>
          </div>
          {ccRecipients.length > 0 && (
            <div className="space-y-2">
              {ccRecipients.map((cc, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={cc.name}
                    onChange={(e) => {
                      const updated = [...ccRecipients];
                      updated[i] = { ...updated[i]!, name: e.target.value };
                      setCcRecipients(updated);
                    }}
                    placeholder={t("fullNamePlaceholder")}
                    className="input flex-1"
                  />
                  <input
                    type="email"
                    value={cc.email}
                    onChange={(e) => {
                      const updated = [...ccRecipients];
                      updated[i] = { ...updated[i]!, email: e.target.value };
                      setCcRecipients(updated);
                    }}
                    placeholder={t("ccEmailPlaceholder")}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setCcRecipients(ccRecipients.filter((_, idx) => idx !== i))}
                    className="w-8 h-10 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors flex-shrink-0 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              <p className="text-xs font-mono text-stone-400 mt-1">{t("ccNote")}</p>
            </div>
          )}
        </div>

        <button type="submit" disabled={sending} className="btn w-full">
          {sending
            ? t("sending")
            : `${validCount === 1 ? t("sendButton", { count: validCount }) : t("sendButtonPlural", { count: validCount })}${sequential && validCount > 1 ? t("sendButtonSeq") : ""}`}
        </button>
      </form>
    </div>
  );
}
