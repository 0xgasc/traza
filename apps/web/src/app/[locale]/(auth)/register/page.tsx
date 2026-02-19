"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(email, password, name);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
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
            {t("name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            placeholder={t("namePlaceholder")}
            required
          />
        </div>

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
            minLength={10}
          />
          <p className="mt-1 text-xs text-stone-400 font-mono">
            {t("passwordHint")}
          </p>
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
          {t("alreadyAccount")}{" "}
          <Link href="/login" className="font-semibold text-black underline underline-offset-4 hover:no-underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
