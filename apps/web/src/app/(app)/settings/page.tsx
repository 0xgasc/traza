"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type Tab = "profile" | "apikeys" | "webhooks";

interface ApiKey {
  id: string;
  name: string;
  keyMasked: string;
  createdAt: string;
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
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [generating, setGenerating] = useState(false);

  const fetchKeys = async () => {
    try {
      const data = await apiGet<{ keys: ApiKey[] } | ApiKey[]>(
        "/api/v1/api-keys"
      );
      setKeys(Array.isArray(data) ? data : data.keys);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setGenerating(true);
    try {
      const data = await apiPost<{ key: string; apiKey: ApiKey }>(
        "/api/v1/api-keys",
        { name: newKeyName.trim() }
      );
      setGeneratedKey(data.key);
      setNewKeyName("");
      fetchKeys();
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      await apiDelete("/api/v1/api-keys/" + keyId);
      setKeys(keys.filter((k) => k.id !== keyId));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={generateKey} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name"
          className="input flex-1"
          required
        />
        <button type="submit" disabled={generating} className="btn">
          {generating ? "..." : "Generate Key"}
        </button>
      </form>

      {generatedKey && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
            NEW API KEY (COPY NOW - SHOWN ONLY ONCE)
          </p>
          <p className="font-mono text-sm break-all bg-white p-3 border-2 border-stone-200">
            {generatedKey}
          </p>
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="h-4 w-full bg-stone-200 animate-pulse" />
        </div>
      ) : keys.length === 0 ? (
        <div className="card">
          <p className="text-sm text-stone-500">No API keys created yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{key.name}</p>
                <p className="font-mono text-xs text-stone-500">
                  {key.keyMasked}
                </p>
              </div>
              <button
                onClick={() => deleteKey(key.id)}
                className="px-3 py-1 border-2 border-black text-xs font-semibold uppercase hover:bg-black hover:text-white transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState("document.signed");
  const [creating, setCreating] = useState(false);

  const fetchWebhooks = async () => {
    try {
      const data = await apiGet<{ webhooks: Webhook[] } | Webhook[]>(
        "/api/v1/webhooks"
      );
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

  const createWebhook = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setCreating(true);
    try {
      await apiPost("/api/v1/webhooks", {
        url: newUrl.trim(),
        events: newEvents.split(",").map((s) => s.trim()),
      });
      setNewUrl("");
      fetchWebhooks();
    } catch {
      // ignore
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
      <form onSubmit={createWebhook} className="space-y-3 mb-6">
        <div className="flex gap-3">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="input flex-1"
            required
          />
          <button type="submit" disabled={creating} className="btn">
            {creating ? "..." : "Add Webhook"}
          </button>
        </div>
        <input
          type="text"
          value={newEvents}
          onChange={(e) => setNewEvents(e.target.value)}
          placeholder="Events (comma-separated)"
          className="input w-full"
        />
      </form>

      {loading ? (
        <div className="card">
          <div className="h-4 w-full bg-stone-200 animate-pulse" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="card">
          <p className="text-sm text-stone-500">No webhooks configured yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="card flex items-center justify-between"
            >
              <div>
                <p className="font-mono text-sm">{webhook.url}</p>
                <div className="flex gap-2 mt-1">
                  {webhook.events.map((evt) => (
                    <span
                      key={evt}
                      className="text-xs font-mono bg-stone-100 px-2 py-0.5 border border-stone-300"
                    >
                      {evt}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => deleteWebhook(webhook.id)}
                className="px-3 py-1 border-2 border-black text-xs font-semibold uppercase hover:bg-black hover:text-white transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
