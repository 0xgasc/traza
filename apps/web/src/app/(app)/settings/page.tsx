"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Tab = "profile" | "apikeys" | "webhooks" | "branding";

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
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "apikeys", label: "API Keys" },
    { key: "webhooks", label: "Webhooks" },
    { key: "branding", label: "Branding" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">
          Settings
        </h1>
        <p className="text-sm text-stone-500 font-mono mt-1">
          MANAGE YOUR ACCOUNT
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-4 border-black mb-8 bg-white">
        {tabs.map((tab) => {
          const tabClass = activeTab === tab.key
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-stone-100";
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={"flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors " + tabClass}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "apikeys" && <ApiKeysTab />}
      {activeTab === "webhooks" && <WebhooksTab />}
      {activeTab === "branding" && <BrandingTab />}
    </div>
  );
}

function ProfileTab() {
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
      setMessage("Profile updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage("Password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    setPwMessage("");
    try {
      await apiPost("/api/v1/auth/change-password", { currentPassword, newPassword });
      setPwMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password change failed";
      setPwMessage(msg);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      {/* Profile info */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Profile Information</h2>
        {message && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Name
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
            Email
          </label>
          <input
            type="email"
            value={email}
            className="input w-full bg-stone-50"
            disabled
          />
          <p className="text-xs text-stone-500 mt-1 font-mono">
            EMAIL CANNOT BE CHANGED
          </p>
        </div>
        <button type="submit" disabled={loading} className="btn">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Password change */}
      <form onSubmit={handlePasswordChange} className="space-y-4 pt-6 border-t-4 border-stone-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Change Password</h2>
        {pwMessage && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{pwMessage}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            Current Password
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
            New Password
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
            Confirm New Password
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
          {pwLoading ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

function ApiKeysTab() {
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
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-2">How API Keys Work</h2>
        <p className="text-sm text-stone-600 mb-3">
          Use your API key to authenticate requests without a browser session.
          Include it as the <span className="font-mono bg-stone-100 px-1">X-API-Key</span> header.
          Generating a new key immediately revokes the previous one.
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
          {generating ? "Generating..." : generatedKey ? "Regenerate Key" : "Generate API Key"}
        </button>
        {generatedKey && (
          <p className="text-xs text-stone-500 mt-2 font-semibold uppercase">
            Warning: regenerating invalidates your current key immediately.
          </p>
        )}
      </div>

      {generatedKey && (
        <div className="border-4 border-black bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">
            Copy This Key Now — It Will Not Be Shown Again
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 font-mono text-sm break-all bg-white border-2 border-black p-3 select-all">
              {generatedKey}
            </code>
            <button
              onClick={copyKey}
              className="px-4 py-3 border-4 border-black font-bold text-xs uppercase tracking-widest bg-black text-white hover:bg-stone-800 flex-shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = [
  { value: "document.sent", label: "Sent for Signing" },
  { value: "signature.signed", label: "Signature Added" },
  { value: "document.completed", label: "All Signed" },
  { value: "signature.declined", label: "Declined" },
];

function WebhookDeliveryLog({ webhookId }: { webhookId: string }) {
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
        <p className="text-xs text-stone-400 font-mono">NO DELIVERIES YET</p>
      </div>
    );
  }

  return (
    <div className="border-t-2 border-stone-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">Event</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">Status</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">Code</th>
            <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-stone-400">Time</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b border-stone-100">
              <td className="px-4 py-2 font-mono">{d.event}</td>
              <td className="px-4 py-2">
                {d.success ? (
                  <span className="px-1.5 py-0.5 bg-green-100 border border-green-400 text-green-700 font-bold uppercase">OK</span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-red-100 border border-red-400 text-red-700 font-bold uppercase">
                    {d.nextRetryAt ? "Retrying" : "Failed"}
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
      setFormError("URL and at least one event are required.");
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
      setFormError(err instanceof Error ? err.message : "Failed to create webhook");
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Add Webhook</h2>
        {formError && (
          <div className="p-3 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{formError}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Endpoint URL</label>
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
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Events to receive</label>
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
                <span className="text-xs font-mono">{evt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={creating} className="btn">
          {creating ? "Adding..." : "Add Webhook"}
        </button>
      </form>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 mb-4">Active Webhooks</h2>
      {loading ? (
        <div className="card">
          <div className="h-4 w-full bg-stone-200 animate-pulse" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="card">
          <p className="text-sm text-stone-500">No webhooks configured yet.</p>
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
                    {expandedId === webhook.id ? "Hide Log" : "Delivery Log"}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="px-3 py-1 border-2 border-black text-xs font-semibold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    Delete
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
      setMessage("Branding saved.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Save failed");
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
        Your logo and brand color appear on the signing page shown to your signers.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {message && (
          <div className="p-4 border-4 border-black bg-stone-100">
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Logo URL</label>
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
              <img src={logoUrl} alt="Logo preview" className="h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="text-xs text-stone-400 font-mono">PREVIEW</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">Brand Color</label>
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
              title="Custom color"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-stone-300" style={{ backgroundColor: primaryColor }} />
            <span className="font-mono text-sm text-stone-600">{primaryColor}</span>
          </div>
        </div>

        {/* Preview signing header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Signing Page Preview</p>
          <div
            className="p-4 border-4 border-black flex items-center gap-4"
            style={{ borderColor: primaryColor }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="h-8 object-contain" />
            ) : (
              <div className="h-8 w-24 bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-400">LOGO</div>
            )}
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: primaryColor }}>Traza E-Signature</p>
              <p className="text-xs text-stone-500 font-mono">Please sign the document</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn">
          {saving ? "Saving..." : "Save Branding"}
        </button>
      </form>
    </div>
  );
}
