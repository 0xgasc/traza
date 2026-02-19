"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

interface DashboardStats {
  totalDocuments: number;
  pendingSignatures: number;
  completedThisMonth: number;
  totalSignatures: number;
}

interface AuditLogItem {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  document?: { id: string; title: string } | null;
}

interface PendingDoc {
  id: string;
  title: string;
  expiresAt?: string | null;
  _count: { signatures: number };
}

const EVENT_LABELS: Record<string, string> = {
  "document.created": "Document uploaded",
  "document.sent": "Sent for signing",
  "document.viewed": "Signing page viewed",
  "document.signed": "Signed",
  "document.declined": "Declined",
  "document.completed": "All signatures complete",
  "document.downloaded": "Downloaded",
  "document.voided": "Voided",
  "document.expired": "Expired",
  "document.reminded": "Reminder sent",
  "document.anchored": "Anchored to blockchain",
};

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace("document.", "");
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<AuditLogItem[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await apiGet<{
          stats: DashboardStats;
          recentActivity?: AuditLogItem[];
          pendingDocuments?: PendingDoc[];
        }>("/api/v1/dashboard/stats");
        setStats(data.stats);
        setActivity(data.recentActivity ?? []);
        setPendingDocs(data.pendingDocuments ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="card">
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Documents", value: stats?.totalDocuments ?? 0, href: "/documents" },
    { label: "Awaiting Signatures", value: stats?.pendingSignatures ?? 0, href: "/documents?status=PENDING" },
    { label: "Signed This Month", value: stats?.completedThisMonth ?? 0, href: "/documents?status=SIGNED" },
    { label: "Total Signatures", value: stats?.totalSignatures ?? 0, href: null },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Dashboard</h1>
        <p className="text-sm text-stone-500 font-mono mt-1">OVERVIEW OF YOUR ACTIVITY</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card shadow-brutal">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
              {card.label}
            </p>
            {card.href ? (
              <Link href={card.href} className="text-4xl font-bold font-mono hover:underline underline-offset-4">
                {card.value}
              </Link>
            ) : (
              <p className="text-4xl font-bold font-mono">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Needs Attention */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold uppercase tracking-tight">Needs Attention</h2>
            <Link href="/documents?status=PENDING" className="text-xs font-mono uppercase tracking-wide text-stone-500 hover:text-black">
              View all →
            </Link>
          </div>
          {pendingDocs.length === 0 ? (
            <div className="card">
              <p className="text-sm text-stone-500">No pending documents.</p>
            </div>
          ) : (
            <div className="border-4 border-black bg-white">
              {pendingDocs.map((doc, i) => {
                const isLast = i === pendingDocs.length - 1;
                const days = doc.expiresAt ? daysUntil(doc.expiresAt) : null;
                const urgent = days !== null && days <= 2;
                return (
                  <Link
                    key={doc.id}
                    href={"/documents/" + doc.id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors ${isLast ? "" : "border-b-2 border-stone-200"}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{doc.title}</p>
                      <p className="text-xs font-mono text-stone-500">
                        {doc._count.signatures} signer{doc._count.signatures !== 1 ? "s" : ""} pending
                      </p>
                    </div>
                    {days !== null && (
                      <span className={`text-xs font-mono flex-shrink-0 ml-3 px-2 py-0.5 border ${urgent ? "border-red-400 text-red-700 bg-red-50" : "border-stone-300 text-stone-500"}`}>
                        {days <= 0 ? "Overdue" : `${days}d left`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="card">
              <p className="text-sm text-stone-500">No recent activity.</p>
            </div>
          ) : (
            <div className="border-4 border-black bg-white">
              {activity.map((item, i) => {
                const isLast = i === activity.length - 1;
                const meta = item.metadata as Record<string, unknown>;
                const sub = (meta.signerEmail as string) ?? null;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 px-4 py-3 ${isLast ? "" : "border-b-2 border-stone-100"}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-black flex-shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{eventLabel(item.eventType)}</p>
                      {item.document && (
                        <Link href={"/documents/" + item.document.id} className="text-xs font-mono text-stone-500 hover:underline truncate block">
                          {item.document.title}
                        </Link>
                      )}
                      {sub && !item.document && (
                        <p className="text-xs font-mono text-stone-500 truncate">{sub}</p>
                      )}
                    </div>
                    <p className="text-xs font-mono text-stone-400 flex-shrink-0">
                      {new Date(item.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 bg-stone-200 animate-pulse" />
        <div className="h-4 w-64 bg-stone-100 animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <div className="h-3 w-24 bg-stone-200 animate-pulse mb-3" />
            <div className="h-10 w-16 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="h-6 w-40 bg-stone-200 animate-pulse mb-4" />
          <div className="border-4 border-black bg-white">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 border-b-2 border-stone-100">
                <div className="h-4 w-3/4 bg-stone-200 animate-pulse mb-1" />
                <div className="h-3 w-1/2 bg-stone-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="h-6 w-40 bg-stone-200 animate-pulse mb-4" />
          <div className="border-4 border-black bg-white">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 border-b-2 border-stone-100">
                <div className="h-4 w-3/4 bg-stone-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
