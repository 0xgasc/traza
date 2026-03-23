"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Tab = "profile" | "security" | "apikeys" | "webhooks" | "branding";

interface WebhookDelivery {
  id: string;
  event: string;
  responseCode: number | null;
  success: boolean;
  createdAt: string;
  nextRetryAt: string | null;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: t("tabs.profile") },
    { key: "security", label: "Security" },
    { key: "apikeys", label: t("tabs.apiKeys") },
    { key: "webhooks", label: t("tabs.webhooks") },
    { key: "branding", label: t("tabs.branding") },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">
          {t("title")}
        </h1>
        <p className="text-sm text-stone-500 font-mono mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:flex border-4 border-black mb-8 bg-white">
        {tabs.map((tab) => {
          const tabClass = activeTab === tab.key
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-stone-100";
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={"flex-1 px-2 py-2 sm:px-4 sm:py-3 font-semibold uppercase text-xs sm:text-sm tracking-wide transition-colors " + tabClass}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "apikeys" && <ApiKeysTab />}
      {activeTab === "webhooks" && <WebhooksTab />}
      {activeTab === "branding" && <BrandingTab />}
    </div>
  );
}

function ProfileTab() {
  const t = useTranslations("settings");
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await apiPatch("/api/v1/auth/profile", { name });
      setMessage(t("profile.updateSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("profile.updateFailed");
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMessage(t("profile.passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage(t("profile.passwordTooShort"));
      return;
    }
    setPwLoading(true);
    setPwMessage("");
    try {
      await apiPost("/api/v1/auth/change-password", { currentPassword, newPassword });
      setPwMessage(t("profile.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("profile.passwordChangeFailed");
      setPwMessage(msg);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      {/* Profile info */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("profile.sectionTitle")}</h2>
        {message && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("profile.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("profile.email")}
          </label>
          <input
            type="email"
            value={email}
            className="input w-full bg-stone-50"
            disabled
          />
          <p className="text-xs text-stone-500 mt-1 font-mono">
            {t("profile.emailCannotChange")}
          </p>
        </div>
        <button type="submit" disabled={loading} className="btn">
          {loading ? t("profile.saving") : t("profile.saveChanges")}
        </button>
      </form>

      {/* Password change */}
      <form onSubmit={handlePasswordChange} className="space-y-4 pt-6 border-t-4 border-stone-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("profile.changePassword")}</h2>
        {pwMessage && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{pwMessage}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("profile.currentPassword")}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("profile.newPassword")}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input w-full"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("profile.confirmNewPassword")}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input w-full"
            required
          />
        </div>
        <button type="submit" disabled={pwLoading} className="btn">
          {pwLoading ? t("profile.changing") : t("profile.changePasswordButton")}
        </button>
      </form>
    </div>
  );
}

interface Session {
  id: string;
  ipAddress: string | null;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
}

function SecurityTab() {
  // 2FA State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMessage, setTfaMessage] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    // Check 2FA status
    apiGet<{ totpEnabled: boolean }>("/api/v1/auth/me")
      .then((data) => {
        if ('totpEnabled' in data) setTotpEnabled(!!data.totpEnabled);
      })
      .catch(() => {});

    // Load sessions
    loadSessions();
  }, []);

  const loadSessions = () => {
    setSessionsLoading(true);
    apiGet<Session[]>("/api/v1/auth/sessions")
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  };

  const handleSetup2FA = async () => {
    setTfaLoading(true);
    setTfaMessage("");
    try {
      const data = await apiPost<{ qrCode: string; secret: string }>("/api/v1/auth/2fa/setup");
      setSetupData(data);
    } catch (err: unknown) {
      setTfaMessage(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setTfaLoading(false);
    }
  };

  const handleVerify2FA = async (e: FormEvent) => {
    e.preventDefault();
    setTfaLoading(true);
    setTfaMessage("");
    try {
      await apiPost("/api/v1/auth/2fa/verify", { code: verifyCode });
      setTotpEnabled(true);
      setSetupData(null);
      setVerifyCode("");
      setTfaMessage("2FA enabled successfully!");
    } catch (err: unknown) {
      setTfaMessage(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setTfaLoading(false);
    }
  };

  const handleDisable2FA = async (e: FormEvent) => {
    e.preventDefault();
    setTfaLoading(true);
    setTfaMessage("");
    try {
      await apiPost("/api/v1/auth/2fa/disable", { code: disableCode });
      setTotpEnabled(false);
      setShowDisable(false);
      setDisableCode("");
      setTfaMessage("2FA disabled.");
    } catch (err: unknown) {
      setTfaMessage(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setTfaLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await apiDelete("/api/v1/auth/sessions/" + sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch {
      // ignore
    }
  };

  const revokeAllSessions = async () => {
    try {
      await apiDelete("/api/v1/auth/sessions");
      loadSessions();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Two-Factor Authentication */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Two-Factor Authentication
        </h2>

        {tfaMessage && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{tfaMessage}</p>
          </div>
        )}

        {totpEnabled && !showDisable ? (
          <div className="border-4 border-black bg-stone-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm uppercase tracking-wide">2FA is enabled</p>
                <p className="text-xs text-stone-500 font-mono mt-1">Your account is protected with TOTP</p>
              </div>
              <button
                onClick={() => setShowDisable(true)}
                className="px-4 py-2 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
              >
                Disable
              </button>
            </div>
          </div>
        ) : totpEnabled && showDisable ? (
          <form onSubmit={handleDisable2FA} className="border-4 border-black bg-stone-50 p-5 space-y-4">
            <p className="text-sm font-semibold">Enter your current TOTP code to disable 2FA:</p>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input w-full text-center text-xl tracking-[0.5em] font-mono"
              placeholder="000000"
              maxLength={6}
              required
            />
            <div className="flex gap-2">
              <button type="submit" disabled={tfaLoading || disableCode.length !== 6} className="btn">
                {tfaLoading ? "Disabling..." : "Confirm Disable"}
              </button>
              <button type="button" onClick={() => { setShowDisable(false); setDisableCode(""); }} className="px-4 py-2 border-2 border-stone-300 text-xs font-bold uppercase">
                Cancel
              </button>
            </div>
          </form>
        ) : setupData ? (
          <div className="border-4 border-black bg-white p-5 space-y-4">
            <p className="text-sm font-semibold">Scan this QR code with your authenticator app:</p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            <div className="p-3 bg-stone-50 border-2 border-stone-200">
              <p className="text-xs text-stone-500 uppercase font-bold mb-1">Manual entry key:</p>
              <code className="text-sm font-mono break-all select-all">{setupData.secret}</code>
            </div>
            <form onSubmit={handleVerify2FA} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input w-full text-center text-xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" disabled={tfaLoading || verifyCode.length !== 6} className="btn w-full">
                {tfaLoading ? "Verifying..." : "Enable 2FA"}
              </button>
            </form>
          </div>
        ) : (
          <div className="border-4 border-black bg-stone-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm uppercase tracking-wide">2FA is not enabled</p>
                <p className="text-xs text-stone-500 font-mono mt-1">Add an extra layer of security to your account</p>
              </div>
              <button
                onClick={handleSetup2FA}
                disabled={tfaLoading}
                className="px-4 py-2 border-2 border-black text-xs font-bold uppercase bg-black text-white hover:bg-stone-800 transition-colors"
              >
                {tfaLoading ? "Setting up..." : "Setup 2FA"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="space-y-4 pt-6 border-t-4 border-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Active Sessions
          </h2>
          {sessions.length > 1 && (
            <button
              onClick={revokeAllSessions}
              className="px-3 py-1 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
            >
              Revoke All Others
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-stone-100 animate-pulse border-2 border-stone-200" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 border-4 border-black bg-stone-50">
            <p className="text-sm text-stone-500">No active sessions found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, i) => (
              <div key={session.id} className="border-4 border-black bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{session.deviceName || "Unknown Device"}</p>
                  <p className="text-xs text-stone-500 font-mono">
                    {session.ipAddress || "Unknown IP"} · {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="px-2 py-1 bg-black text-white text-xs font-bold uppercase">Current</span>
                ) : (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="px-3 py-1 border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const t = useTranslations("settings");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const data = await apiPost<{ key: string }>("/api/v1/auth/api-key", {});
      setGeneratedKey(data.key);
      setCopied(false);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-4 border-black bg-stone-50 p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-2">{t("apiKeys.howItWorksTitle")}</h2>
        <p className="text-sm text-stone-600 mb-3">
          {t("apiKeys.howItWorksDescription")} <span className="font-mono bg-stone-100 px-1">X-API-Key</span> {t("apiKeys.howItWorksHeader")}{t("apiKeys.howItWorksRevoke")}
        </p>
        <div className="font-mono text-xs bg-stone-900 text-green-400 p-3 rounded overflow-x-auto">
          curl -H &quot;X-API-Key: YOUR_KEY&quot; https://traza-api-production.up.railway.app/api/v1/documents
        </div>
      </div>

      <div>
        <button
          onClick={generateKey}
          disabled={generating}
          className={[
            "px-6 py-3 border-4 border-black font-bold text-sm uppercase tracking-widest transition-all",
            "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1",
            generating ? "bg-stone-300 text-stone-500 cursor-wait" : "bg-black text-white hover:bg-stone-800",
          ].join(" ")}
        >
          {generating ? t("apiKeys.generating") : generatedKey ? t("apiKeys.regenerate") : t("apiKeys.generate")}
        </button>
        {generatedKey && (
          <p className="text-xs text-stone-500 mt-2 font-semibold uppercase">
            {t("apiKeys.regenerateWarning")}
          </p>
        )}
      </div>

      {generatedKey && (
        <div className="border-4 border-black bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">
            {t("apiKeys.copyNowWarning")}
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 font-mono text-sm break-all bg-white border-2 border-black p-3 select-all">
              {generatedKey}
            </code>
            <button
              onClick={copyKey}
              className="px-4 py-3 border-4 border-black font-bold text-xs uppercase tracking-widest bg-black text-white hover:bg-stone-800 flex-shrink-0"
            >
              {copied ? t("apiKeys.copied") : t("apiKeys.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = [
  { value: "document.sent", label: "webhooks.events.sent" },
  { value: "signature.signed", label: "webhooks.events.signed" },
  { value: "document.completed", label: "webhooks.events.completed" },
  { value: "signature.declined", label: "webhooks.events.declined" },
];

function WebhookDeliveryLog({ webhookId }: { webhookId: string }) {
  const t = useTranslations("settings");
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ deliveries: WebhookDelivery[] } | WebhookDelivery[]>(
      "/api/v1/webhooks/" + webhookId + "/deliveries"
    )
      .then((data) => setDeliveries(Array.isArray(data) ? data : data.deliveries))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, [webhookId]);

  if (loading) {
    return (
      <div className="p-4 border-t-2 border-stone-200">
        <div className="h-3 w-48 bg-stone-200 animate-pulse" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="p-4 border-t-2 border-stone-200">
        <p className="text-xs text-stone-400 font-mono">{t("webhooks.noDeliveries")}</p>
      </div>
    );
  }

  return (
    <div className="border-t-2 border-stone-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">{t("webhooks.deliveryLog.event")}</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">{t("webhooks.deliveryLog.status")}</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">{t("webhooks.deliveryLog.code")}</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">{t("webhooks.deliveryLog.time")}</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b border-stone-100">
              <td className="px-4 py-2 font-mono">{d.event}</td>
              <td className="px-4 py-2">
                {d.success ? (
                  <span className="px-1.5 py-0.5 bg-green-100 border border-green-400 text-green-700 font-bold uppercase">{t("webhooks.deliveryLog.ok")}</span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-red-100 border border-red-400 text-red-700 font-bold uppercase">
                    {d.nextRetryAt ? t("webhooks.deliveryLog.retrying") : t("webhooks.deliveryLog.failed")}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-stone-500">{d.responseCode ?? "—"}</td>
              <td className="px-4 py-2 text-stone-400">{new Date(d.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WebhooksTab() {
  const t = useTranslations("settings");
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["signature.signed", "document.completed"]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    try {
      const data = await apiGet<{ webhooks: Webhook[] } | Webhook[]>("/api/v1/webhooks");
      setWebhooks(Array.isArray(data) ? data : data.webhooks);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const createWebhook = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || selectedEvents.length === 0) {
      setFormError(t("webhooks.urlAndEventRequired"));
      return;
    }
    setFormError("");
    setCreating(true);
    try {
      await apiPost("/api/v1/webhooks", { url: newUrl.trim(), events: selectedEvents });
      setNewUrl("");
      setSelectedEvents(["document.signed", "document.completed"]);
      fetchWebhooks();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t("webhooks.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      await apiDelete("/api/v1/webhooks/" + webhookId);
      setWebhooks(webhooks.filter((w) => w.id !== webhookId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={createWebhook} className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("webhooks.addTitle")}</h2>
        {formError && (
          <div className="p-3 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{formError}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("webhooks.endpointUrl")}</label>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("webhooks.eventsToReceive")}</label>
          <div className="grid grid-cols-3 gap-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <label
                key={evt.value}
                className={`flex items-center gap-2 px-3 py-2 border-2 cursor-pointer transition-colors ${
                  selectedEvents.includes(evt.value)
                    ? "border-black bg-black text-white"
                    : "border-stone-200 hover:border-black"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(evt.value)}
                  onChange={() => toggleEvent(evt.value)}
                  className="sr-only"
                />
                <span className="text-xs font-mono">{t(evt.label)}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={creating} className="btn">
          {creating ? t("webhooks.adding") : t("webhooks.addButton")}
        </button>
      </form>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 mb-4">{t("webhooks.activeTitle")}</h2>
      {loading ? (
        <div className="card">
          <div className="h-4 w-full bg-stone-200 animate-pulse" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="card">
          <p className="text-sm text-stone-500">{t("webhooks.noneConfigured")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="border-4 border-black bg-white overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm break-all">{webhook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map((evt) => (
                      <span key={evt} className="text-xs font-mono bg-stone-100 px-2 py-0.5 border border-stone-300">
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === webhook.id ? null : webhook.id)}
                    className="px-3 py-1 border-2 border-stone-300 text-xs font-semibold uppercase hover:border-black transition-colors"
                  >
                    {expandedId === webhook.id ? t("webhooks.hideLog") : t("webhooks.deliveryLogButton")}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="px-3 py-1 border-2 border-black text-xs font-semibold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    {t("webhooks.delete")}
                  </button>
                </div>
              </div>
              {expandedId === webhook.id && (
                <WebhookDeliveryLog webhookId={webhook.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PRESET_COLORS = [
  "#000000", "#1e293b", "#7c3aed", "#2563eb", "#0891b2",
  "#059669", "#d97706", "#dc2626", "#db2777",
];

function BrandingTab() {
  const t = useTranslations("settings");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGet<{ logoUrl: string | null; primaryColor: string | null }>("/api/v1/auth/branding")
      .then((data) => {
        setLogoUrl(data.logoUrl ?? "");
        setPrimaryColor(data.primaryColor ?? "#000000");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await apiPatch("/api/v1/auth/branding", {
        logoUrl: logoUrl.trim() || null,
        primaryColor: primaryColor || null,
      });
      setMessage(t("branding.saved"));
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("branding.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-32 bg-stone-100 animate-pulse" />;
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm text-stone-500 mb-6">
        {t("branding.description")}
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {message && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("branding.logoUrl")}</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://your-company.com/logo.png"
            className="input w-full"
          />
          {logoUrl && (
            <div className="mt-3 p-4 border-2 border-stone-200 bg-stone-50 flex items-center gap-4">
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={t("branding.logoPreviewAlt")} className="h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-xs text-stone-400 font-mono">{t("branding.preview")}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">{t("branding.brandColor")}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPrimaryColor(c)}
                style={{ backgroundColor: c }}
                className={`w-8 h-8 border-2 transition-all ${primaryColor === c ? "border-black scale-110 shadow-md" : "border-transparent hover:border-stone-400"}`}
              />
            ))}
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-8 h-8 border-2 border-stone-300 cursor-pointer"
              title={t("branding.customColor")}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-stone-300" style={{ backgroundColor: primaryColor }} />
            <span className="font-mono text-sm text-stone-600">{primaryColor}</span>
          </div>
        </div>

        {/* Preview signing header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">{t("branding.signingPagePreview")}</p>
          <div
            className="p-4 border-4 border-black flex items-center gap-4"
            style={{ borderColor: primaryColor }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="h-8 object-contain" />
            ) : (
              <div className="h-8 w-24 bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-400">{t("branding.logoPlaceholder")}</div>
            )}
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: primaryColor }}>{t("branding.previewAppName")}</p>
              <p className="text-xs text-stone-500 font-mono">{t("branding.previewSignPrompt")}</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn">
          {saving ? t("branding.saving") : t("branding.saveButton")}
        </button>
      </form>
    </div>
  );
}
