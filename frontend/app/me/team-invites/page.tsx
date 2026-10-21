"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Mail,
  Calendar,
} from "lucide-react";
import type { TeamMember } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function TeamInvitesPage() {
  const router = useRouter();

  const [invites, setInvites] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify session
      const authRes = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      if (authRes.status === 401) {
        router.push("/login?redirect=/me/team-invites");
        return;
      }

      const res = await fetch(`${API_BASE}/api/me/team-invites`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load team invitations");
      }

      setInvites(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading invitations");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchInvites();
  }, [fetchInvites]);

  const handleAccept = async (inviteId: string) => {
    setActionId(inviteId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/team-invites/${inviteId}/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to accept team invitation");
      }

      setSuccess("Team invitation accepted! You are now part of the roster.");
      void fetchInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setActionId(inviteId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/team-invites/${inviteId}/decline`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to decline team invitation");
      }

      setSuccess("Team invitation declined.");
      void fetchInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not decline invite");
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              TEAM MANAGEMENT
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Team Invitations Inbox
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Review and respond to invitations from team captains for fest competitions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchInvites()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Live Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
            Loading invitations...
          </div>
        ) : invites.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-white/40">
            <Mail className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-sm">You have no pending team invitations.</p>
            <p className="mt-1 text-xs text-white/30">
              When a team leader invites you with your email address, it will appear here.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-200"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      INVITED
                    </span>
                    <span className="text-xs text-white/40">
                      Team ID: {invite.team_id}
                    </span>
                  </div>

                  <p className="text-base font-semibold text-white">
                    {(invite as any).team_name
                      ? `Invitation to join ${(invite as any).team_name}`
                      : "Invitation to join team roster"}
                  </p>
                  {(invite as any).event_title && (
                    <p className="text-xs font-medium text-cyan-300">
                      Event: {(invite as any).event_title}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-white/40" />
                      {invite.invited_email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-white/40" />
                      Invited on {new Date(invite.invited_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={actionId === invite.id}
                    onClick={() => handleAccept(invite.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-300 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Invite
                  </button>
                  <button
                    type="button"
                    disabled={actionId === invite.id}
                    onClick={() => handleDecline(invite.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-white/70 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
