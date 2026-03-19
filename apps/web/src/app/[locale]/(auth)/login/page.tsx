"use client";

import { useState, FormEvent, Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const t = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err: unknown) {
      // Check if 2FA is required (auth context throws with tempToken attached)
      if (err instanceof Error && (err as Error & { tempToken?: string }).tempToken) {
        setRequires2FA(true);
        setTempToken((err as Error & { tempToken?: string }).tempToken || "");
        return;
      }
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const { setAccessToken, setRefreshToken } = await import("@/lib/api");
      const data = await apiPost<{
        accessToken?: string;
        refreshToken?: string;
        user: { id: string; email: string; name: string; platformRole: "USER" | "SUPER_ADMIN" };
      }>("/api/v1/auth/2fa/login-verify", { tempToken, code: totpCode });

      if (data.accessToken) setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);

      const next = searchParams.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">TWO-FACTOR AUTHENTICATION</p>
        </div>

        {error && (
          <div className="mb-6 p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleTotpSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input w-full text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              maxLength={6}
              autoFocus
              required
            />
            <p className="text-xs text-stone-500 mt-2 font-mono">Enter the 6-digit code from your authenticator app</p>
          </div>

          <button type="submit" disabled={loading || totpCode.length !== 6} className="btn w-full">
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setRequires2FA(false); setTotpCode(""); setError(""); }}
            className="text-sm font-semibold text-black underline underline-offset-4 hover:no-underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">{t("title")}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            placeholder={t("emailPlaceholder")}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full"
            placeholder={t("passwordPlaceholder")}
            required
          />
          <div className="mt-1 text-right">
            <Link href="/forgot-password" className="text-xs text-stone-500 hover:text-black underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn w-full"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-stone-500">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-black underline underline-offset-4 hover:no-underline">
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card"><div className="h-8 w-full bg-stone-200 animate-pulse" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
