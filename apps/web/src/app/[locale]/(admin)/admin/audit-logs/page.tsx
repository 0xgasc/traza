'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.auditLogs');
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
          {t('heading')}
        </h1>
        <p className="text-zinc-500 text-sm">
          {t('totalEvents', { count: data?.pagination.total.toLocaleString() ?? '0' })}
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
          <option value="">{t('allEventTypes')}</option>
          <optgroup label={t('groupDocuments')}>
            <option value="document.created">{t('eventDocumentCreated')}</option>
            <option value="document.sent">{t('eventDocumentSent')}</option>
            <option value="document.signed">{t('eventDocumentSigned')}</option>
            <option value="document.viewed">{t('eventDocumentViewed')}</option>
            <option value="document.deleted">{t('eventDocumentDeleted')}</option>
          </optgroup>
          <optgroup label={t('groupUsers')}>
            <option value="user.login">{t('eventUserLogin')}</option>
            <option value="user.logout">{t('eventUserLogout')}</option>
            <option value="user.registered">{t('eventUserRegistered')}</option>
          </optgroup>
          <optgroup label={t('groupOrganizations')}>
            <option value="org.created">{t('eventOrgCreated')}</option>
            <option value="org.updated">{t('eventOrgUpdated')}</option>
            <option value="org.member_added">{t('eventMemberAdded')}</option>
            <option value="org.member_removed">{t('eventMemberRemoved')}</option>
          </optgroup>
          <optgroup label={t('groupAdmin')}>
            <option value="impersonation.started">{t('eventImpersonationStarted')}</option>
            <option value="impersonation.ended">{t('eventImpersonationEnded')}</option>
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
          <option value="">{t('allResources')}</option>
          <option value="Document">{t('resourceDocuments')}</option>
          <option value="User">{t('resourceUsers')}</option>
          <option value="Organization">{t('resourceOrganizations')}</option>
          <option value="OrgMembership">{t('resourceMemberships')}</option>
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
            {t('noLogs')}
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
                        <span className="text-zinc-500">{t('by')}</span>{' '}
                        <span className="font-semibold">
                          {log.actor.name || log.actor.email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-400">{t('system')}</span>
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
                          {t('detailLogId')}
                        </p>
                        <p className="font-mono text-xs">{log.id}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                          {t('detailTimestamp')}
                        </p>
                        <p className="font-mono text-xs">
                          {new Date(log.createdAt).toISOString()}
                        </p>
                      </div>
                      {log.actor && (
                        <div>
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            {t('detailActor')}
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
                            {t('detailOrganization')}
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
                            {t('detailUserAgent')}
                          </p>
                          <p className="font-mono text-xs text-zinc-600 break-all">
                            {log.userAgent}
                          </p>
                        </div>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="col-span-2">
                          <p className="font-bold uppercase text-xs text-zinc-500 mb-1">
                            {t('detailMetadata')}
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
              {t('page', { page: data.pagination.page, totalPages: data.pagination.totalPages })}
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
