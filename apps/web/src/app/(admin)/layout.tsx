'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';
import { getAccessToken, setAccessToken, apiPost } from '@/lib/api';

// Decode JWT to check platformRole and impersonation state
function decodeToken(token: string): {
  platformRole?: string;
  isImpersonating?: boolean;
  email?: string;
  realUserId?: string;
  impersonationSessionId?: string;
} | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      const token = getAccessToken();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded?.platformRole === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
          if (decoded.isImpersonating) {
            setIsImpersonating(true);
            setImpersonatingEmail(decoded.email ?? null);
          }
        } else {
          setIsSuperAdmin(false);
          router.push('/dashboard');
        }
      } else {
        setIsSuperAdmin(false);
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  const handleEndSession = async () => {
    const token = getAccessToken();
    if (!token) return;
    const decoded = decodeToken(token);
    if (!decoded?.realUserId || !decoded?.impersonationSessionId) return;

    setEndingSession(true);
    try {
      const result = await apiPost<{ accessToken: string }>(
        '/api/v1/admin/impersonation/end',
        { sessionId: decoded.impersonationSessionId, realUserId: decoded.realUserId }
      );
      setAccessToken(result.accessToken);
      window.location.href = '/admin';
    } catch (err: any) {
      alert(err.message || 'Failed to end session');
      setEndingSession(false);
    }
  };

  if (isLoading || isSuperAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-white">
            Traza Admin
          </h1>
          <div className="mt-4 w-12 h-1 bg-red-600 animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-zinc-100">
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black py-2 px-4 text-center font-bold uppercase tracking-wide border-b-4 border-black">
          <span className="mr-4">
            Impersonating: {impersonatingEmail}
          </span>
          <button
            onClick={handleEndSession}
            disabled={endingSession}
            className="bg-black text-white px-4 py-1 text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {endingSession ? 'Ending...' : 'End Session'}
          </button>
        </div>
      )}
      <AdminSidebar />
      <main className={`flex-1 overflow-auto ${isImpersonating ? 'pt-12' : ''}`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
