"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface InviteInfo {
  organization: { name: string; slug: string };
  role: string;
  invitedBy: { name: string };
  email: string;
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, switchOrg } = useAuth();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "accepting" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Peek at invite info (the accept endpoint returns org details on success,
  // so we show a placeholder until they accept)
  useEffect(() => {
    // We can't preview without accepting, so just show a prompt with the token
    setStatus("ready");
  }, [token]);

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const result = await apiPost<{
        membership: {
          organizationId: string;
          role: string;
          organization: { name: string };
        };
      }>("/api/v1/organizations/invitations/accept", { token });

      // Switch to the new org automatically
      try {
        await switchOrg(result.membership.organizationId);
      } catch {
        // Non-fatal if switch fails
      }

      setInfo({
        organization: result.membership.organization,
        role: result.membership.role,
        invitedBy: { name: "" },
        email: user?.email || "",
      });
      setStatus("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to accept invitation");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="h-8 bg-stone-200 animate-pulse" />
      </div>
    );
  }

  if (status === "done" && info) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="p-8 border-4 border-black bg-white text-center">
          <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-2">
            You&apos;re in!
          </h1>
          <p className="text-stone-500 font-mono text-sm mb-6">
            JOINED {info.organization.name.toUpperCase()} AS {info.role}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn w-full"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="p-8 border-4 border-black bg-white text-center">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-2">
            Invalid Invitation
          </h1>
          <p className="text-stone-500 font-mono text-sm mb-6">
            {errorMsg.toUpperCase()}
          </p>
          <p className="text-sm text-stone-500 mb-6">
            This invitation may have expired or already been used.
          </p>
          <button onClick={() => router.push("/dashboard")} className="btn w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="p-8 border-4 border-black bg-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-2">
            Organization Invitation
          </h1>
          <p className="text-sm text-stone-500 font-mono">
            YOU HAVE BEEN INVITED TO JOIN AN ORGANIZATION
          </p>
        </div>

        {user && (
          <div className="mb-6 p-4 border-2 border-stone-200 bg-stone-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Accepting as
            </p>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-stone-500 font-mono">{user.email}</p>
          </div>
        )}

        <p className="text-sm text-stone-500 mb-8">
          Click Accept to join the organization. You can leave at any time from your settings.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={status === "accepting"}
            className="btn flex-1"
          >
            {status === "accepting" ? "Accepting..." : "Accept Invitation"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 px-6 py-3 border-4 border-black font-semibold uppercase text-sm hover:bg-stone-100 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
