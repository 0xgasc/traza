'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { apiGet } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';
  planTier: string;
  billingEmail: string | null;
  createdAt: string;
  _count: {
    members: number;
    documents: number;
  };
}

interface OrganizationsResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-red-500',
  PENDING_SETUP: 'bg-amber-500',
};

const planColors: Record<string, string> = {
  FREE: 'bg-zinc-400',
  STARTER: 'bg-blue-400',
  PRO: 'bg-purple-500',
  PROOF: 'bg-indigo-600',
  ENTERPRISE: 'bg-black',
};

export default function OrganizationsPage() {
  const t = useTranslations('admin.organizations');
  const [data, setData] = useState<OrganizationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchOrganizations() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (search) params.append('search', search);
        if (statusFilter) params.append('status', statusFilter);
        if (planFilter) params.append('planTier', planFilter);

        const response = await apiGet<OrganizationsResponse>(
          `/api/v1/admin/organizations?${params}`
        );
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrganizations();
  }, [page, search, statusFilter, planFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">
          {t('heading')}
        </h1>
        <Link href="/admin/organizations/new" className="btn">
          {t('newOrg')}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border-4 border-black p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="ACTIVE">{t('statusActive')}</option>
          <option value="SUSPENDED">{t('statusSuspended')}</option>
          <option value="PENDING_SETUP">{t('statusPendingSetup')}</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">{t('allPlans')}</option>
          <option value="FREE">{t('planFree')}</option>
          <option value="STARTER">{t('planStarter')}</option>
          <option value="PRO">{t('planPro')}</option>
          <option value="PROOF">{t('planProof')}</option>
          <option value="ENTERPRISE">{t('planEnterprise')}</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-600 p-4 mb-6">
          <p className="text-red-800 font-bold">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <table className="w-full">
          <thead>
            <tr className="border-b-4 border-black bg-zinc-100">
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colOrganization')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colStatus')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colPlan')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colMembers')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colDocuments')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colCreated')}</th>
              <th className="text-left p-4 font-bold uppercase text-sm">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-zinc-200 animate-pulse">
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-32" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-20" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-8" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-8" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-24" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-16" /></td>
                </tr>
              ))
            ) : data?.organizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  {t('noOrganizations')}
                </td>
              </tr>
            ) : (
              data?.organizations.map((org) => (
                <tr key={org.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                  <td className="p-4">
                    <div className="font-bold">{org.name}</div>
                    <div className="text-sm text-zinc-500 font-mono">{org.slug}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${
                        statusColors[org.status]
                      }`}
                    >
                      {org.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${
                        planColors[org.planTier]
                      }`}
                    >
                      {org.planTier}
                    </span>
                  </td>
                  <td className="p-4 font-mono">{org._count.members}</td>
                  <td className="p-4 font-mono">{org._count.documents}</td>
                  <td className="p-4 text-sm text-zinc-500">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="text-sm font-bold uppercase hover:underline"
                    >
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t-4 border-black flex items-center justify-between bg-zinc-50">
            <p className="text-sm text-zinc-600">
              {t('showing', {
                from: (data.pagination.page - 1) * data.pagination.limit + 1,
                to: Math.min(data.pagination.page * data.pagination.limit, data.pagination.total),
                total: data.pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {t('prev')}
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pagination.totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
