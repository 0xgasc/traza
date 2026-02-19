"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";

type Tab = "general" | "members" | "invitations";

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  status: string;
  logoUrl?: string;
  primaryColor?: string;
  billingEmail?: string;
  _count: { members: number; documents: number };
}

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  invitedBy: { name: string; email: string };
}

export default function OrganizationSettingsPage() {
  const t = useTranslations("orgSettings");
  const { currentOrg } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  if (!currentOrg) {
    return (
      <div className="max-w-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">{t("title")}</h1>
        </div>
        <div className="p-6 border-4 border-black bg-white">
          <p className="font-semibold mb-4">{t("noOrg")}</p>
          <Link href="/settings/organization/new" className="btn inline-block">
            {t("createOrg")}
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: t("tabs.general") },
    { key: "members", label: t("tabs.members") },
    { key: "invitations", label: t("tabs.invitations") },
  ];

  const isOwnerOrAdmin = currentOrg.role === "OWNER" || currentOrg.role === "ADMIN";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">
          {t("settingsTitle")}
        </h1>
        <p className="text-sm text-stone-500 font-mono mt-1">
          {currentOrg.name.toUpperCase()} · {currentOrg.role}
        </p>
      </div>

      <div className="flex border-4 border-black mb-8 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors ${
              activeTab === tab.key ? "bg-black text-white" : "bg-white text-black hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <GeneralTab orgId={currentOrg.id} canEdit={isOwnerOrAdmin} />
      )}
      {activeTab === "members" && (
        <MembersTab orgId={currentOrg.id} canManage={isOwnerOrAdmin} />
      )}
      {activeTab === "invitations" && (
        <InvitationsTab orgId={currentOrg.id} canManage={isOwnerOrAdmin} />
      )}
    </div>
  );
}

function GeneralTab({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const t = useTranslations("orgSettings");
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGet<{ organization: OrgDetails }>(`/api/v1/organizations/${orgId}`)
      .then((data) => {
        setOrg(data.organization);
        setName(data.organization.name);
        setBillingEmail(data.organization.billingEmail || "");
        setPrimaryColor(data.organization.primaryColor || "#000000");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await apiPatch(`/api/v1/organizations/${orgId}`, {
        name: name.trim(),
        billingEmail: billingEmail.trim() || undefined,
        primaryColor,
      });
      setMessage(t("general.saveSuccess"));
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("general.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-stone-200 animate-pulse" />)}</div>;
  }

  return (
    <div className="max-w-lg">
      {message && (
        <div className="mb-6 p-4 border-4 border-black bg-stone-100">
          <p className="text-sm font-semibold">{message}</p>
        </div>
      )}

      {org && (
        <div className="mb-6 flex gap-4 text-sm font-mono text-stone-500">
          <span>{t("general.plan")}: {org.planTier}</span>
          <span>·</span>
          <span>{t("general.members")}: {org._count.members}</span>
          <span>·</span>
          <span>{t("general.docs")}: {org._count.documents}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("general.orgName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            disabled={!canEdit}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("general.slug")}
          </label>
          <input
            type="text"
            value={org?.slug || ""}
            className="input w-full bg-stone-50 font-mono"
            disabled
          />
          <p className="text-xs text-stone-500 font-mono mt-1">{t("general.slugCannotChange")}</p>
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("general.billingEmail")}
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="input w-full"
            disabled={!canEdit}
            placeholder="billing@yourcompany.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold uppercase tracking-wide mb-2">
            {t("general.brandColor")}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-12 border-4 border-black cursor-pointer"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="input w-32 font-mono"
              disabled={!canEdit}
              pattern="#[0-9A-Fa-f]{6}"
            />
          </div>
        </div>

        {canEdit && (
          <button type="submit" disabled={saving} className="btn">
            {saving ? t("general.saving") : t("general.saveChanges")}
          </button>
        )}
      </form>
    </div>
  );
}

function MembersTab({
  orgId,
  canManage,
}: {
  orgId: string;
  canManage: boolean;
}) {
  const t = useTranslations("orgSettings");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = () => {
    apiGet<{ members: Member[] }>(`/api/v1/organizations/${orgId}/members`)
      .then((data) => setMembers(data.members))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); }, [orgId]);

  const handleRemove = async (memberId: string) => {
    if (!confirm(t("members.confirmRemove"))) return;
    try {
      await apiDelete(`/api/v1/organizations/${orgId}/members/${memberId}`);
      fetchMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("members.removeFailed"));
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await apiPatch(`/api/v1/organizations/${orgId}/members/${memberId}`, { role });
      fetchMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("members.roleUpdateFailed"));
    }
  };

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-200 animate-pulse" />)}</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 bg-white border-4 border-black">
            <div>
              <p className="font-semibold text-sm">{member.user.name}</p>
              <p className="text-xs text-stone-500 font-mono">{member.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {canManage && member.role !== "OWNER" ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="input py-1 text-xs font-semibold uppercase"
                >
                  <option value="ADMIN">{t("members.roleAdmin")}</option>
                  <option value="MEMBER">{t("members.roleMember")}</option>
                  <option value="VIEWER">{t("members.roleViewer")}</option>
                </select>
              ) : (
                <span className="text-xs font-bold uppercase px-3 py-1 border-2 border-black">
                  {member.role}
                </span>
              )}
              {canManage && member.role !== "OWNER" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-xs font-semibold uppercase px-3 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                >
                  {t("members.remove")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvitationsTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const t = useTranslations("orgSettings");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchInvitations = () => {
    apiGet<{ invitations: Invitation[] }>(`/api/v1/organizations/${orgId}/invitations`)
      .then((data) => setInvitations(data.invitations))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvitations(); }, [orgId]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setMessage("");
    try {
      await apiPost(`/api/v1/organizations/${orgId}/invitations`, {
        email: email.trim(),
        role,
      });
      setEmail("");
      setMessage(t("invitations.sentTo", { email: email.trim() }));
      fetchInvitations();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("invitations.sendFailed"));
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await apiDelete(`/api/v1/organizations/${orgId}/invitations/${invitationId}`);
      fetchInvitations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("invitations.revokeFailed"));
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {canManage && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide mb-4">{t("invitations.inviteTitle")}</h3>

          {message && (
            <div className="mb-4 p-4 border-4 border-black bg-stone-100">
              <p className="text-sm font-semibold">{message}</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input flex-1"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input w-32 font-semibold uppercase text-sm"
            >
              <option value="ADMIN">{t("invitations.roleAdmin")}</option>
              <option value="MEMBER">{t("invitations.roleMember")}</option>
              <option value="VIEWER">{t("invitations.roleViewer")}</option>
            </select>
            <button type="submit" disabled={inviting} className="btn whitespace-nowrap">
              {inviting ? t("invitations.sending") : t("invitations.sendButton")}
            </button>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide mb-4">{t("invitations.pendingTitle")}</h3>

        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 bg-stone-200 animate-pulse" />)}</div>
        ) : invitations.length === 0 ? (
          <div className="p-4 border-4 border-black bg-white">
            <p className="text-sm text-stone-500">{t("invitations.noPending")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white border-4 border-black">
                <div>
                  <p className="font-semibold text-sm">{inv.email}</p>
                  <p className="text-xs text-stone-500 font-mono">
                    {inv.role} · {t("invitations.invitedBy")} {inv.invitedBy.name} · {t("invitations.expires")}{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-xs font-semibold uppercase px-3 py-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                  >
                    {t("invitations.revoke")}
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
