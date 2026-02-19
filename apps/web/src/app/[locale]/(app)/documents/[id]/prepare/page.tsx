'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { apiGet, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSignerColor } from '@/components/field-placement/SignerColorMap';
import type { FieldPlacerHandle } from '@/components/field-placement/FieldPlacer';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// Dynamically import FieldPlacer with SSR disabled to avoid pdfjs-dist issues
const FieldPlacer = dynamic(
  () => import('@/components/field-placement/FieldPlacer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 border-4 border-black bg-stone-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent animate-spin mb-4" />
          <p className="font-bold uppercase text-sm tracking-wide text-stone-700">
            Loading PDF Viewer...
          </p>
        </div>
      </div>
    ),
  }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface DocumentDetail {
  id: string;
  title: string;
  status: string;
}

interface Signer {
  email: string;
  name: string;
}

export default function PreparePage() {
  const t = useTranslations('prepare');
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Signer management
  const [signers, setSigners] = useState<Signer[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Handle from FieldPlacer for triggering saves
  const fieldPlacerHandle = useRef<FieldPlacerHandle | null>(null);

  const handleFieldPlacerReady = useCallback((handle: FieldPlacerHandle) => {
    fieldPlacerHandle.current = handle;
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchDocumentAndSigners() {
      try {
        // Fetch document details
        const data = await apiGet<DocumentDetail>('/api/v1/documents/' + id);
        setDoc(data);

        // Fetch existing fields to restore signers
        interface FieldData {
          id: string;
          signerEmail?: string;
          signerName?: string;
        }
        const fields = await apiGet<FieldData[]>('/api/v1/documents/' + id + '/fields');

        // Extract unique signers from fields
        const signerMap = new Map<string, string>();
        for (const field of fields) {
          if (field.signerEmail && !signerMap.has(field.signerEmail)) {
            // Use stored name or derive from email
            const name = field.signerName ||
              field.signerEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            signerMap.set(field.signerEmail, name);
          }
        }

        // Set signers from saved fields
        if (signerMap.size > 0) {
          const restoredSigners = Array.from(signerMap.entries()).map(([email, name]) => ({
            email,
            name,
          }));
          setSigners(restoredSigners);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load document';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) {
      fetchDocumentAndSigners();
    }
  }, [id, isAuthenticated]);

  const handleAddSigner = () => {
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();

    // Clear previous error
    setEmailError('');

    if (!email) {
      setEmailError(t('emailRequired'));
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError(t('emailInvalid'));
      return;
    }

    if (signers.some((s) => s.email === email)) {
      setEmailError(t('emailDuplicate'));
      return;
    }

    setSigners((prev) => [...prev, { email, name: name || email }]);
    setNewName('');
    setNewEmail('');
  };

  const handleSave = useCallback(async () => {
    if (!fieldPlacerHandle.current) return;

    setSaveStatus('saving');
    try {
      await fieldPlacerHandle.current.save();
      setSaveStatus('saved');
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  const handleSaveAndContinue = useCallback(async () => {
    if (!fieldPlacerHandle.current) {
      router.push('/documents/' + id + '/send');
      return;
    }

    setSaveStatus('saving');
    try {
      await fieldPlacerHandle.current.save();
      router.push('/documents/' + id + '/send');
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [router, id]);

  const handleRemoveSigner = (email: string) => {
    setSigners((prev) => prev.filter((s) => s.email !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSigner();
    }
  };

  if (authLoading || loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-stone-200 animate-pulse mb-4" />
        <div className="h-4 w-48 bg-stone-100 animate-pulse mb-8" />
        <div className="h-96 bg-stone-100 animate-pulse" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-sm font-semibold">{error || t('notFound')}</p>
        <Link href="/documents" className="btn-secondary inline-block mt-4">
          {t('backToDocuments')}
        </Link>
      </div>
    );
  }

  const pdfUrl = `${API_URL}/api/v1/documents/${id}/pdf`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">
            {t('title')}
          </h1>
          <p className="text-sm font-mono text-stone-500 mt-1">{doc.title}</p>
        </div>
        <Link
          href={'/documents/' + id}
          className="px-4 py-2 border-4 border-black bg-white font-bold text-sm uppercase tracking-widest hover:bg-stone-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          {t('back')}
        </Link>
      </div>

      {/* Signer Input Section */}
      <div className="border-4 border-black bg-white p-6 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
          {t('signers')}
        </h2>

        {/* Existing signers */}
        {signers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {signers.map((signer, idx) => {
              const color = getSignerColor(idx);
              return (
                <div
                  key={signer.email}
                  className={[
                    'inline-flex items-center gap-2 px-3 py-2 border-2 font-bold text-xs uppercase tracking-wide',
                    color.bg,
                    color.border,
                    color.text,
                  ].join(' ')}
                >
                  <span>{signer.name}</span>
                  <span className="font-mono text-[10px] opacity-70 normal-case">
                    ({signer.email})
                  </span>
                  <button
                    onClick={() => handleRemoveSigner(signer.email)}
                    className="ml-1 w-5 h-5 flex items-center justify-center bg-black text-white text-xs font-bold hover:bg-red-600 transition-colors"
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add signer form */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">
              {t('signerName')}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="John Doe"
              className="w-full px-3 py-2 border-4 border-black bg-white font-semibold text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">
              {t('signerEmail')}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="john@example.com"
              className={[
                'w-full px-3 py-2 border-4 bg-white font-semibold text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2',
                emailError
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-black focus:ring-stone-400',
              ].join(' ')}
            />
            {emailError && (
              <p className="mt-1 text-xs font-semibold text-red-600">{emailError}</p>
            )}
          </div>
          <button
            onClick={handleAddSigner}
            disabled={!newEmail.trim()}
            className={[
              'px-6 py-2 border-4 border-black font-bold text-sm uppercase tracking-widest transition-all',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'active:shadow-none active:translate-x-1 active:translate-y-1',
              newEmail.trim()
                ? 'bg-black text-white hover:bg-stone-800'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none',
            ].join(' ')}
          >
            {t('addSigner')}
          </button>
        </div>
      </div>

      {/* Field Placer */}
      <FieldPlacer
        documentId={id}
        pdfUrl={pdfUrl}
        signers={signers}
        authToken={getAccessToken() || undefined}
        onReady={handleFieldPlacerReady}
      />

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={[
              'px-6 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest transition-all',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'active:shadow-none active:translate-x-1 active:translate-y-1',
              saveStatus === 'saving'
                ? 'bg-stone-300 text-stone-500 cursor-wait'
                : 'bg-white text-black hover:bg-stone-100',
            ].join(' ')}
          >
            {saveStatus === 'saving' ? t('saving') : t('save')}
          </button>
          {saveStatus === 'saved' && (
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">
              {t('saved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm font-semibold text-red-600 uppercase tracking-wide">
              {t('saveFailed')}
            </span>
          )}
        </div>
        <button
          onClick={handleSaveAndContinue}
          disabled={saveStatus === 'saving'}
          className={[
            'px-8 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest transition-all',
            'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'active:shadow-none active:translate-x-1 active:translate-y-1',
            saveStatus === 'saving'
              ? 'bg-stone-700 text-stone-400 cursor-wait'
              : 'bg-black text-white hover:bg-stone-800',
          ].join(' ')}
        >
          {saveStatus === 'saving' ? t('saving') : t('saveAndContinue')}
        </button>
      </div>
    </div>
  );
}
