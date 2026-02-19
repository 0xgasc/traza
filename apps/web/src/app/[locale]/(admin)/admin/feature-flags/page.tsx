'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  enabledForAll: boolean;
  enabledPlanTiers: string[];
  enabledOrgIds: string[];
  createdAt: string;
  updatedAt: string;
}

const planTiers = ['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'];

export default function FeatureFlagsPage() {
  const t = useTranslations('admin.featureFlags');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formEnabledForAll, setFormEnabledForAll] = useState(false);
  const [formEnabledPlanTiers, setFormEnabledPlanTiers] = useState<string[]>([]);

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      const data = await apiGet<FeatureFlag[]>('/api/v1/admin/feature-flags');
      setFlags(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingFlag(null);
    setFormKey('');
    setFormName('');
    setFormDescription('');
    setFormEnabled(true);
    setFormEnabledForAll(false);
    setFormEnabledPlanTiers([]);
    setShowModal(true);
  }

  function openEditModal(flag: FeatureFlag) {
    setEditingFlag(flag);
    setFormKey(flag.key);
    setFormName(flag.name);
    setFormDescription(flag.description || '');
    setFormEnabled(flag.enabled);
    setFormEnabledForAll(flag.enabledForAll);
    setFormEnabledPlanTiers(flag.enabledPlanTiers);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingFlag(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        key: formKey,
        name: formName,
        description: formDescription || null,
        enabled: formEnabled,
        enabledForAll: formEnabledForAll,
        enabledPlanTiers: formEnabledPlanTiers,
      };

      if (editingFlag) {
        const updated = await apiPatch<FeatureFlag>(
          `/api/v1/admin/feature-flags/${editingFlag.id}`,
          payload
        );
        setFlags((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
      } else {
        const created = await apiPost<FeatureFlag>(
          '/api/v1/admin/feature-flags',
          payload
        );
        setFlags((prev) => [...prev, created]);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save feature flag');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(flag: FeatureFlag) {
    if (!confirm(t('confirmDelete', { name: flag.name }))) {
      return;
    }

    try {
      await apiDelete(`/api/v1/admin/feature-flags/${flag.id}`);
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete feature flag');
    }
  }

  async function handleToggle(flag: FeatureFlag) {
    try {
      const updated = await apiPatch<FeatureFlag>(
        `/api/v1/admin/feature-flags/${flag.id}`,
        { enabled: !flag.enabled }
      );
      setFlags((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to toggle feature flag');
    }
  }

  function togglePlanTier(tier: string) {
    setFormEnabledPlanTiers((prev) =>
      prev.includes(tier)
        ? prev.filter((t) => t !== tier)
        : [...prev, tier]
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 w-48 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-200 border-4 border-black" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">
          {t('heading')}
        </h1>
        <button onClick={openCreateModal} className="btn">
          {t('newFlag')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-600 p-4 mb-6">
          <p className="text-red-800 font-bold">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm underline mt-2"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Flags List */}
      <div className="space-y-4">
        {flags.length === 0 ? (
          <div className="bg-white border-4 border-black p-8 text-center">
            <p className="text-zinc-500 mb-4">{t('noFlags')}</p>
            <button onClick={openCreateModal} className="btn">
              {t('createFirstFlag')}
            </button>
          </div>
        ) : (
          flags.map((flag) => (
            <div
              key={flag.id}
              className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{flag.name}</h3>
                    <span className="font-mono text-sm text-zinc-500 bg-zinc-100 px-2 py-1">
                      {flag.key}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="text-zinc-600 mb-3">{flag.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {flag.enabledForAll ? (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-green-500 text-white">
                        {t('allUsers')}
                      </span>
                    ) : flag.enabledPlanTiers.length > 0 ? (
                      flag.enabledPlanTiers.map((tier) => (
                        <span
                          key={tier}
                          className="px-2 py-1 text-xs font-bold uppercase bg-blue-500 text-white"
                        >
                          {tier}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 text-xs font-bold uppercase bg-zinc-300 text-zinc-600">
                        {t('noTargets')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(flag)}
                    className={`relative w-14 h-8 rounded-none border-4 border-black transition-colors ${
                      flag.enabled ? 'bg-green-500' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0 w-5 h-5 bg-white border-2 border-black transition-transform ${
                        flag.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => openEditModal(flag)}
                    className="text-sm font-bold uppercase hover:underline"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(flag)}
                    className="text-sm font-bold uppercase text-red-600 hover:underline"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black p-8 w-full max-w-lg shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">
              {editingFlag ? t('editFlag') : t('createFlag')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  {t('fieldKey')}
                </label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder={t('keyPlaceholder')}
                  className="input w-full font-mono"
                  required
                  disabled={!!editingFlag}
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  {t('fieldDisplayName')}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('displayNamePlaceholder')}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase mb-2">
                  {t('fieldDescription')}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  className="input w-full h-20 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="w-5 h-5 border-2 border-black"
                />
                <label htmlFor="enabled" className="text-sm font-bold uppercase">
                  {t('fieldEnabled')}
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabledForAll"
                  checked={formEnabledForAll}
                  onChange={(e) => setFormEnabledForAll(e.target.checked)}
                  className="w-5 h-5 border-2 border-black"
                />
                <label htmlFor="enabledForAll" className="text-sm font-bold uppercase">
                  {t('fieldEnabledForAll')}
                </label>
              </div>

              {!formEnabledForAll && (
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">
                    {t('fieldEnableForPlanTiers')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {planTiers.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => togglePlanTier(tier)}
                        className={`px-3 py-2 text-sm font-bold uppercase border-4 transition-colors ${
                          formEnabledPlanTiers.includes(tier)
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-zinc-100'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn flex-1"
                >
                  {isSaving ? t('saving') : editingFlag ? t('saveChanges') : t('createFlag')}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
