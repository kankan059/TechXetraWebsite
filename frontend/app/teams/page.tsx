"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  ArrowRight,
  Shield,
  RefreshCw,
  Mail,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import type { TeamDetail, EventItem, UserProfile } from "@/types/api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

export default function TeamsDirectoryPage() {
  const router = useRouter();

  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get user profile
      try {
        const userData = await participantApi.auth.me();
        setUser(userData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/teams");
          return;
        }
      }

      // 2. Fetch my teams and team-enabled events in parallel
      const [teamsRes, eventsRes] = await Promise.allSettled([
        participantApi.teams.myTeams(),
        participantApi.events.list({ is_team: true, limit: 50 }),
      ]);

      if (teamsRes.status === "fulfilled" && teamsRes.value) {
        setTeams(teamsRes.value || []);
      }
      if (eventsRes.status === "fulfilled" && eventsRes.value) {
        setEvents(eventsRes.value?.events || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !teamName.trim()) return;

    const isComplete = Boolean(user?.profileComplete ?? user?.profile_complete);
    if (user && !isComplete) {
      router.push("/profile-completion");
      return;
    }

    setCreatingTeam(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await participantApi.teams.create({
        eventId: selectedEventId,
        name: teamName.trim(),
      });

      setSuccess(`Team "${teamName}" created! Redirecting to workspace...`);
      setShowCreateModal(false);
      setTeamName("");
      router.push(`/teams/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating team");
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              TEAM MANAGEMENT
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My Teams & Rosters
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Manage your competition squads, invite teammates by email, and track registration readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/me/team-invites"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Mail className="h-4 w-4 text-cyan-300" />
              Invitations Inbox
            </Link>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200"
            >
              <Plus className="h-4 w-4" />
              Create Team
            </button>
          </div>
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
          <div className="py-24 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
            Loading teams and rosters...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-white/40">
            <Users className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <h2 className="text-lg font-semibold text-white">No active teams yet</h2>
            <p className="mt-1 text-xs text-white/50">
              You haven’t formed or joined any teams for TechXetra 2026.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200"
              >
                Create Your First Team
              </button>
              <Link
                href="/me/team-invites"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Check Pending Invites
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((tm) => {
              const isLeader = tm.leader_id === user?.id;
              const acceptedMembers = tm.members?.filter((m) => m.status === "ACCEPTED") || [];
              const pendingMembers = tm.members?.filter((m) => m.status === "INVITED") || [];

              return (
                <div
                  key={tm.id}
                  className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-xl transition hover:border-cyan-300/40 hover:bg-white/[0.04]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                        {isLeader ? "CAPTAIN" : "MEMBER"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          tm.status === "CONFIRMED"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : tm.status === "LOCKED"
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {tm.status}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-white transition group-hover:text-cyan-200">
                      {tm.name}
                    </h2>
                    <p className="mt-1 text-xs text-white/50">Team ID: {tm.id}</p>

                    <div className="mt-5 space-y-2 border-t border-white/5 pt-4 text-xs text-white/60">
                      <div className="flex justify-between">
                        <span>Accepted Roster:</span>
                        <span className="font-semibold text-white">{acceptedMembers.length} members</span>
                      </div>
                      {pendingMembers.length > 0 && (
                        <div className="flex justify-between text-amber-300">
                          <span>Pending Invites:</span>
                          <span>{pendingMembers.length} waiting</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white/40">
                        <span>Created:</span>
                        <span>{new Date(tm.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-4">
                    <Link
                      href={`/teams/${tm.id}`}
                      className="inline-flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-300 hover:text-black"
                    >
                      <span>Open Team Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white">Create a Competition Team</h2>
              <p className="mt-1 text-xs text-white/50">
                You will be designated as the team leader. You can invite teammates after creation.
              </p>

              <form onSubmit={handleCreateTeam} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Select Event
                  </label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] p-3 text-xs text-white outline-none focus:border-cyan-300"
                  >
                    <option value="">-- Choose a team competition --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.category} · Day {evt.day_of_event})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={50}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Pixel Raiders"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam || !selectedEventId || !teamName.trim()}
                    className="rounded-xl bg-cyan-300 px-5 py-2 text-xs font-bold text-black transition hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {creatingTeam ? "Creating..." : "Create Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
