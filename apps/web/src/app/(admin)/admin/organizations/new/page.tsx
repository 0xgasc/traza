'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

const PLAN_TIERS = ['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'] as const;

export default function NewOrganizationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    billingEmail: '',
    planTier: 'FREE' as typeof PLAN_TIERS[number],
    slugManuallyEdited: false,
  });

  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm((f) => ({
      ...f,
      name,
      slug: f.slugManuallyEdited ? f.slug : autoSlug,
    }));
  };

  const handleSlugChange = (slug: string) => {
    setForm((f) => ({ ...f, slug, slugManuallyEdited: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: Record<string, string> = {
        name: form.name,
        slug: form.slug,
        ownerEmail: form.ownerEmail,
        planTier: form.planTier,
      };
      if (form.billingEmail) {
        payload.billingEmail = form.billingEmail;
      }

      await apiPost('/api/v1/admin/organizations', payload);
      router.push('/admin/organizations');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/organizations"
          className="text-zinc-500 hover:text-zinc-900 transition-colors text-sm font-bold uppercase tracking-wide"
        >
          ← Organizations
        </Link>
      </div>

      <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">
        New Organization
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-4 border-red-600 p-4 text-red-700 font-bold">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-black uppercase tracking-wide mb-2">
            Organization Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
            required
            minLength={2}
            maxLength={100}
            className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-2"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-black uppercase tracking-wide mb-2">
            Slug *
          </label>
          <div className="flex items-center border-4 border-black">
            <span className="px-4 py-3 bg-zinc-100 border-r-4 border-black font-mono text-sm text-zinc-500 select-none">
              traza.dev/
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-corp"
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers, and hyphens only"
              className="flex-1 px-4 py-3 font-mono font-bold focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        {/* Owner Email */}
        <div>
          <label className="block text-sm font-black uppercase tracking-wide mb-2">
            Owner Email *
          </label>
          <input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
            placeholder="owner@acme.com"
            required
            className="w-full border-4 border-black px-4 py-3 font-bold focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-2"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Must be an existing Traza user. They will become the org owner.
          </p>
        </div>

        {/* Billing Email */}
        <div>
          <label className="block text-sm font-black uppercase tracking-wide mb-2">
            Billing Email
            <span className="ml-2 text-zinc-400 font-normal normal-case">optional</span>
          </label>
          <input
            type="email"
            value={form.billingEmail}
            onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))}
            placeholder="billing@acme.com"
            className="w-full border-4 border-black px-4 py-3 font-bold focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-2"
          />
        </div>

        {/* Plan Tier */}
        <div>
          <label className="block text-sm font-black uppercase tracking-wide mb-2">
            Plan Tier *
          </label>
          <div className="grid grid-cols-5 gap-2">
            {PLAN_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setForm((f) => ({ ...f, planTier: tier }))}
                className={`py-3 text-sm font-black uppercase tracking-wide border-4 transition-colors ${
                  form.planTier === tier
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-zinc-100'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t-4 border-black">
          <button
            type="submit"
            disabled={isLoading || !form.name || !form.slug || !form.ownerEmail}
            className="bg-black text-white px-8 py-3 font-black uppercase tracking-wide border-4 border-black hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
          >
            {isLoading ? 'Creating...' : 'Create Organization'}
          </button>
          <Link
            href="/admin/organizations"
            className="px-8 py-3 font-black uppercase tracking-wide border-4 border-black hover:bg-zinc-100 transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
