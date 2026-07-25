"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type CheckState = "loading" | "up" | "down";

interface ServiceCheck {
  key: string;
  label: string;
  url: string;
  state: CheckState;
  latencyMs: number | null;
}

const COPY = {
  en: {
    title: "System status",
    subtitle: "Live checks against production, straight from your browser.",
    up: "Operational",
    down: "Unreachable",
    loading: "Checking…",
    lastChecked: "Last checked",
    refresh: "Re-check now",
    services: {
      api: "API",
      ready: "API readiness (DB)",
      web: "Web app",
    },
  },
  es: {
    title: "Estado del sistema",
    subtitle: "Chequeos en vivo contra producción, directo desde tu navegador.",
    up: "Operativo",
    down: "Inaccesible",
    loading: "Verificando…",
    lastChecked: "Última verificación",
    refresh: "Verificar de nuevo",
    services: {
      api: "API",
      ready: "Disponibilidad de la API (BD)",
      web: "Aplicación web",
    },
  },
} as const;

export default function StatusPage() {
  const locale = useLocale();
  const t = COPY[locale === "es" ? "es" : "en"];

  const [checks, setChecks] = useState<ServiceCheck[]>([
    { key: "api", label: t.services.api, url: `${API_BASE}/health`, state: "loading", latencyMs: null },
    { key: "ready", label: t.services.ready, url: `${API_BASE}/ready`, state: "loading", latencyMs: null },
    { key: "web", label: t.services.web, url: "/", state: "loading", latencyMs: null },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = useCallback(() => {
    setChecks((prev) => prev.map((c) => ({ ...c, state: "loading" as CheckState })));
    const started = Date.now();
    Promise.all(
      [
        { key: "api", url: `${API_BASE}/health` },
        { key: "ready", url: `${API_BASE}/ready` },
        { key: "web", url: "/" },
      ].map(async ({ key, url }) => {
        const t0 = Date.now();
        try {
          const res = await fetch(url, { cache: "no-store" });
          return { key, up: res.ok, latencyMs: Date.now() - t0 };
        } catch {
          return { key, up: false, latencyMs: null };
        }
      })
    ).then((results) => {
      setChecks((prev) =>
        prev.map((c) => {
          const r = results.find((x) => x.key === c.key);
          return r
            ? { ...c, state: r.up ? "up" : "down", latencyMs: r.latencyMs }
            : c;
        })
      );
      setLastChecked(new Date(started));
    });
  }, []);

  useEffect(() => {
    runChecks();
    const interval = setInterval(runChecks, 60_000);
    return () => clearInterval(interval);
  }, [runChecks]);

  return (
    <article>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-3">
          {t.title}
        </h1>
        <p className="text-lg text-stone-600">{t.subtitle}</p>
      </header>

      <div className="space-y-4 mb-8">
        {checks.map((c) => (
          <div
            key={c.key}
            className="border-4 border-black p-5 flex items-center justify-between gap-4 flex-wrap bg-white"
          >
            <div>
              <h2 className="font-bold text-lg">{c.label}</h2>
              <p className="font-mono text-xs text-stone-400 break-all">{c.url}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 border-4 font-bold uppercase text-xs tracking-wide ${
                  c.state === "up"
                    ? "border-green-600 bg-green-100 text-green-800"
                    : c.state === "down"
                      ? "border-red-600 bg-red-100 text-red-800"
                      : "border-stone-400 bg-stone-100 text-stone-500"
                }`}
              >
                {c.state === "up" ? t.up : c.state === "down" ? t.down : t.loading}
              </span>
              {c.latencyMs !== null && (
                <p className="font-mono text-xs text-stone-400 mt-1">{c.latencyMs} ms</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={runChecks} className="btn text-sm" type="button">
          {t.refresh}
        </button>
        {lastChecked && (
          <span className="text-sm text-stone-500">
            {t.lastChecked}: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
    </article>
  );
}
