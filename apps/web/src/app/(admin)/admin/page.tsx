'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface PlatformAnalytics {
  overview: {
    totalOrganizations: number;
    totalUsers: number;
    totalDocuments: number;
    recentSignups: number;
  };
  organizations: {
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
  };
  documents: {
    byStatus: Record<string, number>;
  };
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await apiGet<PlatformAnalytics>('/api/v1/admin/analytics');
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 w-48 mb-8" />
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-200 border-4 border-black" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-4 border-red-600 p-6">
        <h2 className="text-lg font-bold text-red-800 uppercase">Error</h2>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Organizations',
      value: analytics?.overview.totalOrganizations || 0,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Users',
      value: analytics?.overview.totalUsers || 0,
      color: 'bg-green-500',
    },
    {
      label: 'Documents',
      value: analytics?.overview.totalDocuments || 0,
      color: 'bg-purple-500',
    },
    {
      label: 'New Users (30d)',
      value: analytics?.overview.recentSignups || 0,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">
        Platform Overview
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
          >
            <div className={`w-12 h-1 ${stat.color} mb-4`} />
            <p className="text-4xl font-black">{stat.value.toLocaleString()}</p>
            <p className="text-sm font-bold uppercase tracking-wide text-zinc-500 mt-2">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Organizations by Plan */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
            Organizations by Plan
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics?.organizations.byPlan || {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="font-bold uppercase text-sm">{plan}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-zinc-200 h-4">
                    <div
                      className="bg-black h-full"
                      style={{
                        width: `${Math.min(
                          (count / (analytics?.overview.totalOrganizations || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-sm w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
            Documents by Status
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics?.documents.byStatus || {}).map(([status, count]) => {
              const colors: Record<string, string> = {
                DRAFT: 'bg-zinc-400',
                PENDING: 'bg-amber-500',
                SIGNED: 'bg-green-500',
                EXPIRED: 'bg-red-500',
              };
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="font-bold uppercase text-sm">{status}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-zinc-200 h-4">
                      <div
                        className={`${colors[status] || 'bg-black'} h-full`}
                        style={{
                          width: `${Math.min(
                            (count / (analytics?.overview.totalDocuments || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm w-12 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
          Quick Actions
        </h2>
        <div className="flex gap-4">
          <a
            href="/admin/organizations/new"
            className="btn"
          >
            + Create Organization
          </a>
          <a
            href="/admin/feature-flags"
            className="btn-secondary"
          >
            Manage Feature Flags
          </a>
          <a
            href="/admin/audit-logs"
            className="btn-secondary"
          >
            View Audit Logs
          </a>
        </div>
      </div>
    </div>
  );
}
