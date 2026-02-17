'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';
  planTier: string;
  billingEmail: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  createdAt: string;
  updatedAt: string;
  members: Member[];
  _count: {
    members: number;
    documents: number;
  };
}

const planTiers = ['FREE', 'STARTER', 'PRO', 'PROOF', 'ENTERPRISE'];

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

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-600',
  ADMIN: 'bg-blue-500',
  MEMBER: 'bg-green-500',
  VIEWER: 'bg-zinc-400',
};

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editBillingEmail, setEditBillingEmail] = useState('');
  const [editPlanTier, setEditPlanTier] = useState('');
  const [editPrimaryColor, setEditPrimaryColor] = useState('');

  useEffect(() => {
    async function fetchOrg() {
      try {
        const data = await apiGet<Organization>(`/api/v1/admin/organizations/${orgId}`);
        setOrg(data);
        setEditName(data.name);
        setEditBillingEmail(data.billingEmail || '');
        setEditPlanTier(data.planTier);
        setEditPrimaryColor(data.primaryColor || '#000000');
      } catch (err: any) {
        setError(err.message || 'Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrg();
  }, [orgId]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await apiPatch<Organization>(`/api/v1/admin/organizations/${orgId}`, {
        name: editName,
        billingEmail: editBillingEmail || null,
        planTier: editPlanTier,
        primaryColor: editPrimaryColor,
      });
      setOrg(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuspend() {
    if (!confirm('Are you sure you want to suspend this organization? Members will lose access.')) {
      return;
    }

    try {
      await apiPost(`/api/v1/admin/organizations/${orgId}/suspend`, {});
      setOrg((prev) => prev ? { ...prev, status: 'SUSPENDED' } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to suspend organization');
    }
  }

  async function handleReactivate() {
    try {
      await apiPatch<Organization>(`/api/v1/admin/organizations/${orgId}`, {
        status: 'ACTIVE',
      });
      setOrg((prev) => prev ? { ...prev, status: 'ACTIVE' } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate organization');
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-200 w-64 mb-8" />
        <div className="bg-white border-4 border-black p-6">
          <div className="h-6 bg-zinc-200 w-48 mb-4" />
          <div className="h-4 bg-zinc-200 w-32 mb-2" />
          <div className="h-4 bg-zinc-200 w-40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-4 border-red-600 p-6">
        <h2 className="text-lg font-bold text-red-800 uppercase">Error</h2>
        <p className="text-red-600 mt-2">{error}</p>
        <Link href="/admin/organizations" className="btn mt-4 inline-block">
          ← Back to Organizations
        </Link>
      </div>
    );
  }

  if (!org) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/organizations"
            className="text-sm font-bold uppercase text-zinc-500 hover:text-black mb-2 inline-block"
          >
            ← Back to Organizations
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            {org.name}
          </h1>
          <p className="text-zinc-500 font-mono">{org.slug}</p>
        </div>
        <div className="flex gap-3">
          {org.status === 'SUSPENDED' ? (
            <button onClick={handleReactivate} className="btn">
              Reactivate
            </button>
          ) : (
            <button onClick={handleSuspend} className="btn-secondary text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
              Suspend
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="col-span-2 space-y-8">
          {/* Organization Details */}
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
              Organization Details
            </h2>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Billing Email</label>
                  <input
                    type="email"
                    value={editBillingEmail}
                    onChange={(e) => setEditBillingEmail(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Plan Tier</label>
                  <select
                    value={editPlanTier}
                    onChange={(e) => setEditPlanTier(e.target.value)}
                    className="input w-full"
                  >
                    {planTiers.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase mb-2">Brand Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={editPrimaryColor}
                      onChange={(e) => setEditPrimaryColor(e.target.value)}
                      className="w-12 h-12 border-4 border-black cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editPrimaryColor}
                      onChange={(e) => setEditPrimaryColor(e.target.value)}
                      className="input font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn mt-4"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-block px-3 py-1 text-sm font-bold uppercase text-white ${statusColors[org.status]}`}
                  >
                    {org.status.replace('_', ' ')}
                  </span>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-bold uppercase text-white ${planColors[org.planTier]}`}
                  >
                    {org.planTier}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">Billing Email</p>
                    <p className="font-mono">{org.billingEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">Brand Color</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 border-2 border-black"
                        style={{ backgroundColor: org.primaryColor || '#000000' }}
                      />
                      <span className="font-mono">{org.primaryColor || '#000000'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">Created</p>
                    <p>{new Date(org.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-zinc-500">Last Updated</p>
                    <p>{new Date(org.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-6">
              Members ({org._count.members})
            </h2>
            <div className="space-y-3">
              {org.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border-2 border-black"
                >
                  <div>
                    <p className="font-bold">{member.user.name || 'Unnamed'}</p>
                    <p className="text-sm text-zinc-500 font-mono">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${roleColors[member.role]}`}
                    >
                      {member.role}
                    </span>
                    <span className="text-sm text-zinc-400">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-lg font-black uppercase tracking-tighter mb-4">
              Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-zinc-500">Members</span>
                <span className="text-2xl font-black">{org._count.members}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-zinc-500">Documents</span>
                <span className="text-2xl font-black">{org._count.documents}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border-4 border-red-600 p-6">
            <h3 className="text-lg font-black uppercase tracking-tighter text-red-800 mb-4">
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 mb-4">
              Deleting an organization is permanent and cannot be undone.
              All documents and data will be lost.
            </p>
            <button
              onClick={async () => {
                const input = prompt(`Type "${org.slug}" to confirm permanent deletion:`);
                if (input !== org.slug) return;
                try {
                  await apiDelete(`/api/v1/admin/organizations/${org.id}`);
                  router.push('/admin/organizations');
                } catch (err: any) {
                  alert(err.message || 'Failed to delete organization');
                }
              }}
              className="w-full px-4 py-2 bg-red-600 text-white font-bold uppercase text-sm hover:bg-red-700 transition-colors"
            >
              Delete Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
