"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Trash2,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import type { TeamDetail, UserProfile } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function TeamWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get user profile
      const userRes = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
      if (userRes.status === 401) {
        router.push("/login");
        return;
      }
      const userData = await userRes.json();
      if (userData.success) setUser(userData.data);

      // 2. Get team details
      const teamRes = await fetch(`${API_BASE}/api/teams/${id}`, { credentials: "include" });
      const teamData = await teamRes.json();

      if (!teamRes.ok || !teamData.success) {
        throw new Error(teamData.error?.message || "Team not found or access denied");
      }

      setTeam(teamData.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeamData();
  }, [id]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !team) return;

    setSendingInvite(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/teams/${team.id}/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to send invitation");
      }

      setInviteEmail("");
      setSuccess(`Invitation sent to ${inviteEmail}!`);
      void loadTeamData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member / cancel invite?")) return;

    setProcessingAction(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/teams/${id}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to remove member");
      }

      setSuccess("Member removed.");
      void loadTeamData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error removing member");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDisbandTeam = async () => {
    if (!confirm("Are you sure you want to disband this team? This action cannot be undone.")) return;

    setProcessingAction(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/teams/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to disband team");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error disbanding team");
      setProcessingAction(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (!team) return;

    setProcessingAction(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/purchases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ item_type: "EVENT_PASS", team_id: team.id }],
          acknowledge_student_id_policy: user?.is_student || false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Could not start checkout");
      }

      if (data.data.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(`/checkout/${data.data.id}/pay`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout error");
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-32 rounded-3xl bg-white/5" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error && !team) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Team Workspace Unavailable</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!team || !user) return null;

  const isLeader = team.leader_id === user.id;
  const acceptedMembers = team.members.filter((m) => m.status === "ACCEPTED");
  const pendingMembers = team.members.filter((m) => m.status === "INVITED");
  const anyIncomplete = acceptedMembers.some((m) => m.user?.profile_completed_at === null);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header Banner */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  TEAM ROSTER
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                    team.status === "CONFIRMED"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : team.status === "LOCKED"
                      ? "bg-amber-400/10 text-amber-300"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {team.status}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {team.name}
              </h1>
              <p className="mt-1 text-xs text-white/50">Team ID: {team.id}</p>
            </div>

            {isLeader && team.status === "DRAFT" && (
              <button
                type="button"
                onClick={handleDisbandTeam}
                disabled={processingAction}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
                Disband Team
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            {success}
          </div>
        )}

        {/* Eligibility warnings for checkout */}
        {isLeader && team.status === "DRAFT" && (
          <div className="space-y-2">
            {pendingMembers.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  <strong>{pendingMembers.length} pending invitation(s):</strong> All invited teammates
                  must accept or be removed before you can proceed to pass checkout.
                </span>
              </div>
            )}

            {anyIncomplete && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  One or more accepted members have not completed their profile yet. All members must
                  have completed profiles before pass checkout.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Team Members Roster */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Members ({acceptedMembers.length} Confirmed)
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">
                      {member.user?.name || member.invited_email}
                    </p>
                    <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/70">
                      {member.role}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.status === "ACCEPTED"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>

                  <p className="text-xs text-white/40">
                    {member.user?.email || member.invited_email}{" "}
                    {member.user?.institution_name && `· ${member.user.institution_name}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isLeader && team.status === "DRAFT" && member.role !== "LEADER" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  )}

                  {!isLeader && member.user_id === user.id && team.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite Teammate Form */}
          {isLeader && team.status === "DRAFT" && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold text-white">Invite Teammate by Email</h3>
              <p className="mt-1 text-xs text-white/50">
                Teammate must have an account on TechXetra or can sign up with this email.
              </p>

              <form onSubmit={handleSendInvite} className="mt-4 flex gap-3">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@tezu.ac.in"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-300"
                />
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black hover:bg-cyan-200 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {sendingInvite ? "Inviting..." : "Send Invite"}
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Checkout Action for Leader */}
        {isLeader && team.status === "DRAFT" && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={processingAction || pendingMembers.length > 0 || anyIncomplete}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-8 py-4 text-sm font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proceed to Pass Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
