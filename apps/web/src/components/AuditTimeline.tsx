'use client';

interface AuditEntry {
  id: string;
  eventType: string;
  timestamp: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .toUpperCase();
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditTimeline({ entries }: AuditTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="card">
        <p className="text-stone-500 text-sm">No audit entries yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-[4px] bg-black" />

      <div className="space-y-0">
        {entries.map((entry, index) => (
          <div key={entry.id || index} className="relative pl-12 pb-6">
            {/* Dot */}
            <div className="absolute left-[6px] top-1 w-5 h-5 bg-black border-4 border-black" />

            <div className="border-4 border-black p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm uppercase tracking-wide">
                  {formatEventType(entry.eventType)}
                </span>
                <span className="text-xs font-mono text-stone-500">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              <p className="text-sm text-stone-700">
                By: <span className="font-semibold">{entry.actor}</span>
              </p>
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-2 p-2 bg-stone-50 border-2 border-stone-200">
                  <pre className="text-xs font-mono text-stone-600 whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
