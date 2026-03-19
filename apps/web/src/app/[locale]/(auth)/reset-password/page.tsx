"use client";

import { useState, FormEvent, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/v1/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
          <p className="text-sm text-stone-500 font-mono mt-1">PASSWORD RESET</p>
        </div>
        <div className="p-4 border-4 border-black bg-stone-50 mb-6">
          <p className="text-sm font-semibold">
            Your password has been reset successfully. All existing sessions have been revoked.
          </p>
        </div>
        <Link href="/login" className="btn w-full block text-center">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">SET NEW PASSWORD</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full"
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input w-full"
            placeholder="Repeat password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn w-full">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-semibold text-black underline underline-offset-4 hover:no-underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="card"><div className="h-8 w-full bg-stone-200 animate-pulse" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
