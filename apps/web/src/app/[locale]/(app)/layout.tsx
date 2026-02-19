"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import { getAccessToken, setAccessToken, apiPost } from "@/lib/api";

function decodeToken(token: string): {
  isImpersonating?: boolean;
  email?: string;
  realUserId?: string;
  impersonationSessionId?: string;
} | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("appLayout");
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [impersonating, setImpersonating] = useState<{ email: string; sessionId: string; realUserId: string } | null>(null);
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const decoded = decodeToken(token);
    if (decoded?.isImpersonating && decoded.email && decoded.realUserId && decoded.impersonationSessionId) {
      setImpersonating({
        email: decoded.email,
        sessionId: decoded.impersonationSessionId,
        realUserId: decoded.realUserId,
      });
    } else {
      setImpersonating(null);
    }
  }, [isAuthenticated]);

  const handleEndSession = async () => {
    if (!impersonating) return;
    setEndingSession(true);
    try {
      const result = await apiPost<{ accessToken: string }>(
        "/api/v1/admin/impersonation/end",
        { sessionId: impersonating.sessionId, realUserId: impersonating.realUserId }
      );
      setAccessToken(result.accessToken);
      window.location.href = "/admin";
    } catch (err: any) {
      alert(err.message || "Failed to end session");
      setEndingSession(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase tracking-tighter">{t("brand")}</h1>
          <div className="mt-4 w-12 h-1 bg-black animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black py-2 px-4 text-center font-bold uppercase tracking-wide border-b-4 border-black text-sm">
          <span className="mr-4">{t("impersonating", { email: impersonating.email })}</span>
          <button
            onClick={handleEndSession}
            disabled={endingSession}
            className="bg-black text-white px-4 py-1 text-xs hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {endingSession ? t("ending") : t("endSession")}
          </button>
        </div>
      )}
      <div className={`flex flex-1 ${impersonating ? "pt-10" : ""}`}>
        <Sidebar />
        <main className="flex-1 bg-stone-50 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
