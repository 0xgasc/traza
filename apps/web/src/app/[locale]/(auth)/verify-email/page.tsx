"use client";

import { useState, useEffect, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    apiPost("/api/v1/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="card">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Traza</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">EMAIL VERIFICATION</p>
      </div>

      {status === "loading" && (
        <div className="p-4 border-4 border-black bg-stone-50">
          <p className="text-sm font-semibold animate-pulse">Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="p-4 border-4 border-black bg-stone-50">
            <p className="text-sm font-semibold">Email verified successfully!</p>
          </div>
          <Link href="/login" className="btn w-full block text-center">
            Sign In
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <Link href="/login" className="text-sm font-semibold text-black underline underline-offset-4 hover:no-underline">
            Back to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="card"><div className="h-8 w-full bg-stone-200 animate-pulse" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
