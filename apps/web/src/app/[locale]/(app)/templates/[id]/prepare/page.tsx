'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { apiGet, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSignerColor } from '@/components/field-placement/SignerColorMap';
import type { FieldPlacerHandle } from '@/components/field-placement/FieldPlacer';

// Dynamically import FieldPlacer with SSR disabled
const FieldPlacer = dynamic(
  () => import('@/components/field-placement/FieldPlacer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 border-4 border-black bg-stone-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="font-bold uppercase text-sm tracking-wide text-stone-700">Loading PDF Viewer...</p>
        </div>
      </div>
    ),
  }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Template {
  id: string;
  name: string;
  fileUrl: string;
}

interface SignerRole {
  role: string; // e.g. "Signer 1", "Customer"
}

export default function TemplatePrepare() {
  const t = useTranslations('templatePrepare');
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Signer roles (instead of emails)
  const [signerRoles, setSignerRoles] = useState<SignerRole[]>([
    { role: 'Signer 1' },
  ]);
  const [newRole, setNewRole] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const fieldPlacerHandle = useRef<FieldPlacerHandle | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<Template & { fields: any[] }>('/api/v1/templates/' + id);
        setTemplate(data);

        // Extract unique signer roles from existing fields
        const roles = [...new Set((data.fields || []).map((f: any) => f.signerRole as string))].filter(Boolean);
        if (roles.length > 0) {
          setSignerRoles(roles.map((r) => ({ role: r })));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('errorLoad'));
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) load();
  }, [id, isAuthenticated]);

  const handleAddRole = () => {
    const role = newRole.trim();
    if (!role) return;
    if (signerRoles.some((s) => s.role.toLowerCase() === role.toLowerCase())) return;
    setSignerRoles((prev) => [...prev, { role }]);
    setNewRole('');
  };

  const handleRemoveRole = (role: string) => {
    if (signerRoles.length === 1) return;
    setSignerRoles((prev) => prev.filter((s) => s.role !== role));
  };

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await fieldPlacerHandle.current?.save();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  const handleSaveAndContinue = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await fieldPlacerHandle.current?.save();
      router.push('/templates/' + id + '/send');
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [router, id]);

  if (authLoading || loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-96 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="border-4 border-black bg-white p-6">
        <p className="text-sm font-semibold">{error || t('notFound')}</p>
        <Link href="/templates" className="btn-secondary inline-block mt-4">{t('backToTemplates')}</Link>
      </div>
    );
  }

  // Convert signer roles to the format FieldPlacer expects (email=role, name=role)
  const signersForPlacer = signerRoles.map((s) => ({ email: s.role, name: s.role }));

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{t('title')}</h1>
          <p className="text-sm font-mono text-stone-500 mt-1">{template.name}</p>
        </div>
        <Link href={'/templates/' + id} className="btn-secondary">{t('back')}</Link>
      </div>

      {/* Signer Roles */}
      <div className="border-4 border-black bg-white p-6 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          {t('signerRoles')}
        </h2>
        <p className="text-xs text-stone-500 font-mono mb-4">
          {t('signerRolesDesc')}
        </p>

        {signerRoles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {signerRoles.map((s, idx) => {
              const color = getSignerColor(idx);
              return (
                <div key={s.role} className={`inline-flex items-center gap-2 px-3 py-2 border-2 font-bold text-xs uppercase tracking-wide ${color.bg} ${color.border} ${color.text}`}>
                  <span>{s.role}</span>
                  {signerRoles.length > 1 && (
                    <button
                      onClick={() => handleRemoveRole(s.role)}
                      className="ml-1 w-5 h-5 flex items-center justify-center bg-black text-white text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      X
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">{t('roleName')}</label>
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
              placeholder={t('roleNamePlaceholder')}
              className="w-full px-3 py-2 border-4 border-black bg-white font-semibold text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={handleAddRole}
            disabled={!newRole.trim()}
            className="px-6 py-2 border-4 border-black font-bold text-sm uppercase tracking-widest bg-black text-white hover:bg-stone-800 transition-colors disabled:opacity-40"
          >
            {t('addRole')}
          </button>
        </div>
      </div>

      {/* Use FieldPlacer with roles as signers */}
      <FieldPlacer
        documentId={id}
        pdfUrl={`${API_URL}/api/v1/templates/${id}/pdf`}
        fieldsEndpoint={`/api/v1/templates/${id}/fields`}
        signers={signersForPlacer}
        authToken={getAccessToken() || undefined}
        onReady={(handle) => {
          fieldPlacerHandle.current = handle;
        }}
      />

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-6 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest bg-white text-black hover:bg-stone-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            {saveStatus === 'saving' ? t('saving') : t('save')}
          </button>
          {saveStatus === 'saved' && <span className="text-sm font-semibold text-green-600 uppercase">{t('saved')}</span>}
          {saveStatus === 'error' && <span className="text-sm font-semibold text-red-600 uppercase">{t('saveFailed')}</span>}
        </div>
        <button
          onClick={handleSaveAndContinue}
          disabled={saveStatus === 'saving'}
          className="px-8 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest bg-black text-white hover:bg-stone-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
        >
          {saveStatus === 'saving' ? t('saving') : t('saveAndSend')}
        </button>
      </div>
    </div>
  );
}
