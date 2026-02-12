'use client';

import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, setAccessToken, getAccessToken } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  planTier: string;
  role: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface CurrentOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

// Decode JWT to get current org
function decodeToken(token: string): { orgId?: string; orgRole?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function OrgSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<CurrentOrg | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch organizations and determine current org
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const data = await apiGet<{ organizations: Organization[] }>('/api/v1/organizations');
        setOrganizations(data.organizations);

        // Get current org from token
        const token = getAccessToken();
        if (token) {
          const decoded = decodeToken(token);
          if (decoded?.orgId) {
            const current = data.organizations.find(o => o.id === decoded.orgId);
            if (current) {
              setCurrentOrg({
                id: current.id,
                name: current.name,
                slug: current.slug,
                role: current.role,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === currentOrg?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      const result = await apiPost<{ accessToken: string; organization: CurrentOrg }>(
        '/api/v1/organizations/switch',
        { orgId }
      );

      setAccessToken(result.accessToken);
      setCurrentOrg(result.organization);
      setIsOpen(false);

      // Reload the page to refresh data with new org context
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to switch organization');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-10 w-40 bg-zinc-200 animate-pulse" />
    );
  }

  // No organizations - show create button
  if (organizations.length === 0) {
    return (
      <a
        href="/settings/organization/new"
        className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold uppercase text-sm hover:bg-zinc-800 transition-colors"
      >
        + Create Organization
      </a>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-black hover:bg-zinc-50 transition-colors disabled:opacity-50"
      >
        {currentOrg ? (
          <>
            <div
              className="w-8 h-8 flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: '#000' }}
            >
              {currentOrg.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="font-bold text-sm leading-tight">{currentOrg.name}</div>
              <div className="text-xs text-zinc-500 uppercase">{currentOrg.role}</div>
            </div>
            <svg
              className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <span className="font-bold text-sm">Select Organization</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] z-50">
          <div className="max-h-64 overflow-y-auto">
            {organizations.map((org) => {
              const isActive = org.id === currentOrg?.id;
              const statusColor = org.status === 'ACTIVE' ? 'bg-green-500' : 'bg-zinc-400';

              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  disabled={isSwitching || org.status !== 'ACTIVE'}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive ? 'bg-zinc-100' : ''
                  }`}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ backgroundColor: org.primaryColor || '#000' }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{org.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500 uppercase">{org.role}</span>
                      <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t-2 border-black">
            <a
              href="/settings/organization"
              className="block px-4 py-3 text-sm font-bold hover:bg-zinc-50 transition-colors"
            >
              Organization Settings
            </a>
            <a
              href="/settings/organization/new"
              className="block px-4 py-3 text-sm font-bold text-blue-600 hover:bg-zinc-50 transition-colors"
            >
              + Create New Organization
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
