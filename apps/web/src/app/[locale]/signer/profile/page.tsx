"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const SignatureCapture = dynamic(() => import("@/components/SignatureCapture"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SIGNER_TOKEN_KEY = "traza_signer_token";

interface SignerProfile {
  id: string;
  email: string;
  name: string;
  savedSignatureData: string | null;
  savedSignatureUpdatedAt: string | null;
  createdAt: string;
}

interface SigningHistoryItem {
  id: string;
  signerEmail: string;
  signerName: string;
  status: string;
  signedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    status: string;
    owner: { name: string } | null;
  };
}

export default function SignerProfilePage() {
  const router = useRouter();
  const t = useTranslations("signerProfile");
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<SignerProfile | null>(null);
  const [history, setHistory] = useState<SigningHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingSig, setEditingSig] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const [sigSaved, setSigSaved] = useState(false);
  const [deletingSig, setDeletingSig] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(SIGNER_TOKEN_KEY);
    if (!t) {
      router.push("/");
      return;
    }
    setToken(t);

    async function load() {
      try {
        const [meRes, histRes] = await Promise.all([
          fetch(API_BASE + "/api/v1/signer-auth/me", { headers: { Authorization: `Bearer ${t}` } }),
          fetch(API_BASE + "/api/v1/signer-auth/history", { headers: { Authorization: `Bearer ${t}` } }),
        ]);

        if (!meRes.ok) {
          if (meRes.status === 401) {
            localStorage.removeItem(SIGNER_TOKEN_KEY);
            router.push("/");
            return;
          }
          throw new Error("Failed to load profile");
        }

        const me = await meRes.json();
        setProfile(me);

        if (histRes.ok) {
          setHistory(await histRes.json());
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const handleSaveSignature = async (signatureData: string) => {
    if (!token) return;
    setSavingSig(true);
    setSigSaved(false);
    try {
      const res = await fetch(API_BASE + "/api/v1/signer-auth/signature", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureData }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setProfile((p) => p ? { ...p, savedSignatureData: signatureData, savedSignatureUpdatedAt: new Date().toISOString() } : p);
      setEditingSig(false);
      setSigSaved(true);
      setTimeout(() => setSigSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingSig(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!token || !profile?.savedSignatureData) return;
    setDeletingSig(true);
    try {
      const res = await fetch(API_BASE + "/api/v1/signer-auth/signature", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setProfile((p) => p ? { ...p, savedSignatureData: null, savedSignatureUpdatedAt: null } : p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingSig(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(SIGNER_TOKEN_KEY);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-mono text-stone-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center shadow-brutal">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-4">{t("brand")}</h1>
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <div className="bg-white border-b-4 border-black">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">{t("brand")}</h1>
            <p className="text-xs text-stone-500 font-mono">{t("subtitle")}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs font-bold uppercase tracking-wide text-stone-400 hover:text-black transition-colors underline"
          >
            {t("signOut")}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile info */}
        <div className="card shadow-brutal">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">{t("account")}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase text-stone-400">{t("name")}</span>
              <span className="font-semibold text-sm">{profile?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase text-stone-400">{t("email")}</span>
              <span className="font-mono text-sm">{profile?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase text-stone-400">{t("memberSince")}</span>
              <span className="font-mono text-xs text-stone-500">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Saved signature */}
        <div className="card shadow-brutal">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t("savedSignature")}</p>
            {profile?.savedSignatureData && !editingSig && (
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingSig(true)}
                  className="text-xs font-bold uppercase tracking-wide text-stone-500 hover:text-black transition-colors underline"
                >
                  {t("update")}
                </button>
                <button
                  onClick={handleDeleteSignature}
                  disabled={deletingSig}
                  className="text-xs font-bold uppercase tracking-wide text-red-400 hover:text-red-700 transition-colors underline disabled:opacity-50"
                >
                  {deletingSig ? t("deleting") : t("delete")}
                </button>
              </div>
            )}
          </div>

          {sigSaved && (
            <div className="mb-3 p-2 border-2 border-green-500 bg-green-50">
              <p className="text-xs font-semibold text-green-700 uppercase">{t("signatureSaved")}</p>
            </div>
          )}

          {profile?.savedSignatureData && !editingSig ? (
            <div className="border-4 border-stone-200 bg-stone-50 p-4 flex items-center justify-center min-h-[100px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.savedSignatureData}
                alt="Saved signature"
                className="max-h-24 object-contain"
              />
            </div>
          ) : editingSig ? (
            <div>
              <p className="text-xs text-stone-500 mb-3">{t("drawNew")}</p>
              <SignatureCapture onComplete={handleSaveSignature} />
              {savingSig && <p className="mt-2 text-xs font-mono text-stone-500 text-center">{t("saving")}</p>}
              <button
                onClick={() => setEditingSig(false)}
                className="mt-3 text-xs text-stone-400 hover:text-stone-700 underline"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                {t("noSignature")}
              </p>
              <SignatureCapture onComplete={handleSaveSignature} />
              {savingSig && <p className="mt-2 text-xs font-mono text-stone-500 text-center">{t("saving")}</p>}
            </div>
          )}

          {profile?.savedSignatureUpdatedAt && !editingSig && (
            <p className="mt-2 text-xs text-stone-400 font-mono">
              {t("lastUpdated", { date: new Date(profile.savedSignatureUpdatedAt).toLocaleDateString("en-US", { dateStyle: "medium" }) })}
            </p>
          )}
        </div>

        {/* Signing history */}
        <div className="card shadow-brutal">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">
            {t("signingHistory")}
          </p>

          {history.length === 0 ? (
            <p className="text-sm text-stone-500">{t("noHistory")}</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-start justify-between py-3 border-b-2 border-stone-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{item.document.title}</p>
                    <p className="text-xs text-stone-400 font-mono mt-0.5">
                      {t("from")} {item.document.owner?.name ?? "Unknown"} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {item.status === "SIGNED" && (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase border-2 border-green-500 text-green-700 bg-green-50">
                        {t("statusSigned")}
                      </span>
                    )}
                    {item.status === "PENDING" && (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase border-2 border-yellow-400 text-yellow-700 bg-yellow-50">
                        {t("statusPending")}
                      </span>
                    )}
                    {item.status === "DECLINED" && (
                      <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase border-2 border-stone-400 text-stone-600 bg-stone-50">
                        {t("statusDeclined")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
