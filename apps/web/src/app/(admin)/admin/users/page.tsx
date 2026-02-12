'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  platformRole: 'USER' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    memberships: number;
    documents: number;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [impersonateModal, setImpersonateModal] = useState<User | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (search) params.append('search', search);
        if (roleFilter) params.append('platformRole', roleFilter);

        const response = await apiGet<UsersResponse>(
          `/api/v1/admin/users?${params}`
        );
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleImpersonate = async () => {
    if (!impersonateModal || !impersonateReason) return;

    try {
      const result = await apiPost<{ accessToken: string }>(
        `/api/v1/admin/users/${impersonateModal.id}/impersonate`,
        { reason: impersonateReason }
      );

      // Store the impersonation token and redirect
      localStorage.setItem('traza_access_token', result.accessToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || 'Failed to impersonate user');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">
        Users
      </h1>

      {/* Filters */}
      <div className="bg-white border-4 border-black p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Roles</option>
          <option value="USER">User</option>
          <option value="SUPER_ADMIN">Super Admin</option>
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
              <th className="text-left p-4 font-bold uppercase text-sm">User</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Role</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Status</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Orgs</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Docs</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Last Login</th>
              <th className="text-left p-4 font-bold uppercase text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-zinc-200 animate-pulse">
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-40" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-20" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-16" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-8" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-8" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-24" /></td>
                  <td className="p-4"><div className="h-4 bg-zinc-200 w-24" /></td>
                </tr>
              ))
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No users found
                </td>
              </tr>
            ) : (
              data?.users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                  <td className="p-4">
                    <div className="font-bold">{user.name || 'Unnamed'}</div>
                    <div className="text-sm text-zinc-500">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${
                        user.platformRole === 'SUPER_ADMIN' ? 'bg-red-600' : 'bg-zinc-400'
                      }`}
                    >
                      {user.platformRole.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${
                        user.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 font-mono">{user._count.memberships}</td>
                  <td className="p-4 font-mono">{user._count.documents}</td>
                  <td className="p-4 text-sm text-zinc-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setImpersonateModal(user)}
                      disabled={user.platformRole === 'SUPER_ADMIN'}
                      className="text-sm font-bold uppercase hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Impersonate
                    </button>
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
              Showing {(data.pagination.page - 1) * data.pagination.limit + 1} -{' '}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
              {data.pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pagination.totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Impersonation Modal */}
      {impersonateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4">
              Impersonate User
            </h2>
            <p className="text-zinc-600 mb-4">
              You are about to impersonate <strong>{impersonateModal.email}</strong>.
              Please provide a reason for this action.
            </p>
            <textarea
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder="Reason for impersonation (required)..."
              className="input w-full h-24 mb-4"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setImpersonateModal(null);
                  setImpersonateReason('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={impersonateReason.length < 5}
                className="btn flex-1 bg-amber-500 disabled:opacity-50"
              >
                Impersonate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
