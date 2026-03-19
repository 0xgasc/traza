"use client";

import { useState, FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">RESET YOUR PASSWORD</p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="p-4 border-4 border-black bg-stone-50">
            <p className="text-sm font-semibold">
              If an account exists with that email, we sent a password reset link. Check your inbox.
            </p>
          </div>
          <div className="text-center">
            <Link href="/login" className="text-sm font-semibold text-black underline underline-offset-4 hover:no-underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 border-4 border-black bg-stone-100">
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn w-full">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-semibold text-black underline underline-offset-4 hover:no-underline">
              Back to Sign In
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
