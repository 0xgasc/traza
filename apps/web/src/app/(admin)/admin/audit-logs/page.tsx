'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface AuditLog {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const eventTypeColors: Record<string, string> = {
  'document.created': 'bg-green-500',
  'document.signed': 'bg-blue-500',
  'document.sent': 'bg-purple-500',
  'document.viewed': 'bg-zinc-400',
  'document.deleted': 'bg-red-500',
  'user.login': 'bg-indigo-500',
  'user.logout': 'bg-zinc-500',
  'user.registered': 'bg-green-600',
  'org.created': 'bg-blue-600',
  'org.updated': 'bg-amber-500',
  'org.member_added': 'bg-green-400',
  'org.member_removed': 'bg-red-400',
  'impersonation.started': 'bg-orange-500',
  'impersonation.ended': 'bg-orange-400',
  'migration.user_to_org': 'bg-cyan-500',
};

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
        });
        if (eventTypeFilter) params.append('eventType', eventTypeFilter);
        if (resourceTypeFilter) params.append('resourceType', resourceTypeFilter);

        const response = await apiGet<AuditLogsResponse>(
          `/api/v1/admin/audit-logs?${params}`
        );
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [page, eventTypeFilter, resourceTypeFilter]);

  function formatEventType(eventType: string): string {
    return eventType
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' → ');
  }

  function getEventColor(eventType: string): string {
    return eventTypeColors[eventType] || 'bg-zinc-500';
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">
          Audit Logs
        </h1>
        <p className="text-zinc-500 text-sm">
          {data?.pagination.total.toLocaleString()} total events
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border-4 border-black p-4 mb-6 flex gap-4">
        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="input w-64"
        >
          <option value="">All Event Types</option>
          <optgroup label="Documents">
            <option value="document.created">Document Created</option>
            <option value="document.sent">Document Sent</option>
            <option value="document.signed">Document Signed</option>
            <option value="document.viewed">Document Viewed</option>
            <option value="document.deleted">Document Deleted</option>
          </optgroup>
          <optgroup label="Users">
            <option value="user.login">User Login</option>
            <option value="user.logout">User Logout</option>
            <option value="user.registered">User Registered</option>
          </optgroup>
          <optgroup label="Organizations">
            <option value="org.created">Org Created</option>
            <option value="org.updated">Org Updated</option>
            <option value="org.member_added">Member Added</option>
            <option value="org.member_removed">Member Removed</option>
          </optgroup>
          <optgroup label="Admin">
            <option value="impersonation.started">Impersonation Started</option>
            <option value="impersonation.ended">Impersonation Ended</option>
          </optgroup>
        </select>

        <select
          value={resourceTypeFilter}
          onChange={(e) => {
            setResourceTypeFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Resources</option>
          <option value="Document">Documents</option>
          <option value="User">Users</option>
          <option value="Organization">Organizations</option>
          <option value="OrgMembership">Memberships</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border-4 border-red-600 p-4 mb-6">
          <p className="text-red-800 font-bold">{error}</p>
        </div>
      )}

      {/* Logs List */}
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        {isLoading ? (
          <div className="animate-pulse p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-200" />
            ))}
          </div>
        ) : data?.logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No audit logs found
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {data?.logs.map((log) => (
              <div key={log.id} className="hover:bg-zinc-50">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedLog(expandedLog === log.id ? null : log.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-bold uppercase text-white ${getEventColor(
                          log.eventType
                        )}`}
                      >
                        {formatEventType(log.eventType)}
                      </span>
                      {log.resourceType && (
                        <span className="text-sm text-zinc-500">
                          {log.resourceType}
                          {log.resourceId && (
                            <span className="font-mono text-xs ml-1">
                              #{log.resourceId.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-400 font-mono">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {log.actor ? (
                      <span>
                        <span className="text-zinc-500">by</span>{' '}
                        <span className="font-semibold">
                          {log.actor.name || log.actor.email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-400">System</span>
                    )}
                    {log.organization && (
                      <>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-500">
                          {log.organization.name}
                        </span>
                      </>
                    )}
                    {log.ipAddress && (
                      <>
                        <span className="text-zinc-300">•</span>
                        <span className="text-zinc-400 font-mono text-xs">
                          {log.ipAddress}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-zinc-100 bg-zinc-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                          Log ID
                        </p>
                        <p className="font-mono text-xs">{log.id}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                          Timestamp
                        </p>
                        <p className="font-mono text-xs">
                          {new Date(log.createdAt).toISOString()}
                        </p>
                      </div>
                      {log.actor && (
                        <div>
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            Actor
                          </p>
                          <p className="font-mono text-xs">{log.actor.email}</p>
                          <p className="font-mono text-xs text-zinc-400">
                            {log.actor.id}
                          </p>
                        </div>
                      )}
                      {log.organization && (
                        <div>
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            Organization
                          </p>
                          <p>{log.organization.name}</p>
                          <p className="font-mono text-xs text-zinc-400">
                            {log.organization.slug}
                          </p>
                        </div>
                      )}
                      {log.userAgent && (
                        <div className="col-span-2">
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            User Agent
                          </p>
                          <p className="font-mono text-xs text-zinc-600 break-all">
                            {log.userAgent}
                          </p>
                        </div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="col-span-2">
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            Metadata
                          </p>
                          <pre className="font-mono text-xs bg-zinc-100 p-3 border border-zinc-200 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t-4 border-black flex items-center justify-between bg-zinc-50">
            <p className="text-sm text-zinc-600">
              Page {data.pagination.page} of {data.pagination.totalPages}
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
    </div>
  );
}
