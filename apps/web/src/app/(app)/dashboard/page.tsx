"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface DashboardStats {
  totalDocuments: number;
  pendingSignatures: number;
  completedThisMonth: number;
  totalSignatures: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await apiGet<{
          stats: DashboardStats;
          recentActivity?: ActivityItem[];
        }>("/api/v1/dashboard/stats");
        setStats(data.stats);
        setActivity(data.recentActivity || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Documents", value: stats?.totalDocuments ?? 0 },
    { label: "Pending Signatures", value: stats?.pendingSignatures ?? 0 },
    { label: "Completed This Month", value: stats?.completedThisMonth ?? 0 },
    { label: "Total Signatures", value: stats?.totalSignatures ?? 0 },
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
            <p className="text-4xl font-bold font-mono">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-bold uppercase tracking-tight mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="card">
            <p className="text-sm text-stone-500">No recent activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <div key={item.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{item.description}</p>
                  <p className="text-xs font-mono text-stone-500 uppercase">{item.type}</p>
                </div>
                <p className="text-xs font-mono text-stone-400">
                  {new Date(item.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
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
      <div className="h-6 w-40 bg-stone-200 animate-pulse mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="h-4 w-3/4 bg-stone-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
