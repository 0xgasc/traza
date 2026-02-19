"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const SIGNER_TOKEN_KEY = "traza_signer_token";

export default function SignerAuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const t = useTranslations("signerAuth");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("No token provided in this link.");
      setStatus("error");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(API_BASE + "/api/v1/signer-auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          const code = d?.error?.code || "";
          if (code === "TOKEN_USED") throw new Error("TOKEN_USED");
          if (code === "TOKEN_EXPIRED") throw new Error("TOKEN_EXPIRED");
          throw new Error(d?.error?.message || "INVALID_LINK");
        }

        const data = await res.json();
        localStorage.setItem(SIGNER_TOKEN_KEY, data.accessToken);
        setStatus("success");

        // Redirect to profile after a brief success flash
        setTimeout(() => router.push("/signer/profile"), 800);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Verification failed.");
        setStatus("error");
      }
    }

    verify();
  }, [token, router]);

  const resolveErrorMsg = () => {
    if (errorMsg === "TOKEN_USED") return t("tokenUsed");
    if (errorMsg === "TOKEN_EXPIRED") return t("tokenExpired");
    if (errorMsg === "INVALID_LINK") return t("invalidLink");
    return errorMsg;
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center shadow-brutal">
        <h1 className="text-2xl font-bold tracking-tighter uppercase mb-6">{t("brand")}</h1>

        {status === "verifying" && (
          <>
            <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm font-mono text-stone-500">{t("verifying")}</p>
          </>
        )}

        {status === "success" && (
          <div className="p-4 border-4 border-green-500 bg-green-50">
            <p className="font-black uppercase text-green-800 mb-1">{t("successTitle")}</p>
            <p className="text-xs text-green-700">{t("successDesc")}</p>
          </div>
        )}

        {status === "error" && (
          <>
            <div className="p-4 border-4 border-black bg-stone-100 mb-4">
              <p className="font-black uppercase text-sm mb-1">{t("errorTitle")}</p>
              <p className="text-xs text-stone-600">{resolveErrorMsg()}</p>
            </div>
            <p className="text-xs text-stone-400 font-mono">
              {t("requestNew")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
