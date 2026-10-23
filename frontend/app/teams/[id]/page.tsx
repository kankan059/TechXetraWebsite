"use client";

import { useEffect, useState, use, useMemo } from "react";
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
import type { TeamDetail, UserProfile, EventItem, FormFieldDefinition } from "@/types/api";
import DynamicQuestionnaireModal from "@/components/forms/DynamicQuestionnaireModal";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

export default function TeamWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Dynamic Questionnaire modal state
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);

  const parsedSchema: FormFieldDefinition[] = useMemo(() => {
    if (!event?.form_schema) return [];
    try {
      const parsed = JSON.parse(event.form_schema);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [event?.form_schema]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get user profile
      try {
        const userData = await participantApi.auth.me();
        setUser(userData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
      }

      // 2. Get team details
      const teamData = await participantApi.teams.get(id);
      setTeam(teamData);

      // 3. Get event details to inspect form_schema
      const eventId = teamData.event_id || (teamData as any).eventId;
      if (eventId) {
        try {
          const eventData = await participantApi.events.get(eventId);
          if (eventData) {
            setEvent(eventData);
          }
        } catch {
          // Non-critical if event fails to load immediately
        }
      }
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
      await participantApi.teams.invite(team.id, inviteEmail.trim().toLowerCase());
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
      await participantApi.teams.removeMember(id, memberId);
      setSuccess("Member removed.");
      void loadTeamData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error removing member");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAcceptThisInvite = async (memberId: string) => {
    setProcessingAction(true);
    setError(null);
    setSuccess(null);
    try {
      await participantApi.teams.acceptInvite(memberId);
      setSuccess("You have joined the team!");
      void loadTeamData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeclineThisInvite = async (memberId: string) => {
    if (!confirm("Are you sure you want to decline this invitation?")) return;
    setProcessingAction(true);
    setError(null);
    try {
      await participantApi.teams.declineInvite(memberId);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not decline invite");
      setProcessingAction(false);
    }
  };

  const handleDisbandTeam = async () => {
    if (!confirm("Are you sure you want to disband this team? This action cannot be undone.")) return;

    setProcessingAction(true);
    setError(null);

    try {
      await participantApi.teams.disband(id);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error disbanding team");
      setProcessingAction(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (!team) return;
    if (parsedSchema.length > 0) {
      setQuestionnaireError(null);
      setShowQuestionnaireModal(true);
    } else {
      void executeCheckout({});
    }
  };


  const executeCheckout = async (responses: Record<string, any>) => {
    if (!team) return;

    setProcessingAction(true);
    setError(null);
    setQuestionnaireError(null);

    try {
      const data = await participantApi.purchases.create({
        items: [
          {
            item_type: "EVENT_PASS",
            event_id: team.event_id,
            team_id: team.id,
            form_responses:
              Object.keys(responses).length > 0 ? responses : undefined,
          } as any,
        ],
        acknowledge_student_id_policy: Boolean(
          user?.isStudent ?? user?.is_student
        ),
      });

      const purchase = data.purchase;

      if (!purchase?.id) {
        throw new Error("Purchase ID is missing from the response.");
      }

      setShowQuestionnaireModal(false);

      if (purchase.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(
          `/checkout/${encodeURIComponent(purchase.id)}/pay`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Checkout error";

      if (parsedSchema.length > 0) {
        setQuestionnaireError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
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
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
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

  const myPendingInvite = pendingMembers.find(
    (m) =>
      (m.user_id && m.user_id === user.id) ||
      (user.email && m.invited_email.toLowerCase() === user.email.toLowerCase())
  );

  return (
    <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Invitation Action Banner for Invitee */}
        {myPendingInvite && (
          <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/40 via-[#0a1524] to-[#07090e] p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Invitation Pending
                </span>
                <h2 className="mt-2 text-xl font-bold text-white">
                  You have been invited to join this team
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  Join <strong className="text-white">{team.name}</strong> to participate together in this competition.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={() => handleAcceptThisInvite(myPendingInvite.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept & Join Team
                </button>
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={() => handleDeclineThisInvite(myPendingInvite.id)}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Banner */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  TEAM ROSTER
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${team.status === "CONFIRMED"
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

        {/* Confirmed Team Members Roster */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Confirmed Roster ({acceptedMembers.length})
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {acceptedMembers.map((member) => (
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
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      CONFIRMED
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

          {/* Pending Invitations list */}
          {pendingMembers.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300/80 mb-3">
                Pending Invitations ({pendingMembers.length})
              </h3>
              <div className="divide-y divide-white/5">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white/90">{member.invited_email}</p>
                        <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          INVITED (Awaiting Response)
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Invited {new Date(member.invited_at).toLocaleDateString()}
                      </p>
                    </div>

                    {isLeader && team.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 transition hover:border-red-500/40 hover:text-red-300"
                      >
                        Cancel Invite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
        {/* Dynamic Questionnaire Modal */}
        {team && (
          <DynamicQuestionnaireModal
            isOpen={showQuestionnaireModal}
            onClose={() => setShowQuestionnaireModal(false)}
            eventTitle={event?.title || team.event?.title || "Event Registration"}
            formSchema={parsedSchema}
            onSubmit={executeCheckout}
            isSubmitting={processingAction}
            externalError={questionnaireError}
          />
        )}
      </div>
    </main>
  );
}
