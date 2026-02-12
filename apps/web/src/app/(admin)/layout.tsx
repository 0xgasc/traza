'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';
import { getAccessToken } from '@/lib/api';

// Decode JWT to check platformRole
function decodeToken(token: string): { platformRole?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check if user is super admin from JWT
      const token = getAccessToken();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded?.platformRole === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
          // Check for impersonation
          if ((decoded as any).isImpersonating) {
            setIsImpersonating(true);
            setImpersonatingEmail((decoded as any).email);
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
            onClick={() => {
              // TODO: Implement end impersonation
              alert('End impersonation coming soon');
            }}
            className="bg-black text-white px-4 py-1 text-sm hover:bg-zinc-800 transition-colors"
          >
            End Session
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
