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
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
