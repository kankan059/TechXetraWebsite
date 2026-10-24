"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  UserProfile,
  DigitalTicket,
  PreparingTicket,
  TeamDetail,
  TeamMember,
  PurchaseDetail,
} from "@/types/api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [preparingTickets, setPreparingTickets] = useState<PreparingTicket[]>([]);
  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [invites, setInvites] = useState<TeamMember[]>([]);
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch current user
      let currentUser: UserProfile | null = null;
      try {
        currentUser = await participantApi.auth.me();
        setUser(currentUser);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        throw err;
      }

      // 2. Fetch data in parallel
      const [ticketsRes, teamsRes, invitesRes, purchasesRes] = await Promise.allSettled([
        participantApi.tickets.myTickets(),
        participantApi.teams.myTeams(),
        participantApi.teams.myInvites(),
        participantApi.purchases.list(),
      ]);

      if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
        setTickets(ticketsRes.value.tickets || []);
        setPreparingTickets(ticketsRes.value.preparing_tickets || []);
      }

      if (teamsRes.status === "fulfilled" && teamsRes.value) {
        setTeams(teamsRes.value || []);
      }

      if (invitesRes.status === "fulfilled" && invitesRes.value) {
        setInvites(invitesRes.value || []);
      }

      if (purchasesRes.status === "fulfilled" && purchasesRes.value) {
        setPurchases(purchasesRes.value || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAcceptInvite = async (memberId: string) => {
    try {
      setActionMessage(null);
      await participantApi.teams.acceptInvite(memberId);
      setActionMessage("Team invitation accepted!");
      void fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not accept invite");
    }
  };

  const handleDeclineInvite = async (memberId: string) => {
    try {
      setActionMessage(null);
      await participantApi.teams.declineInvite(memberId);
      setActionMessage("Team invitation declined.");
      void fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not decline invite");
    }
  };

  const handleRetryFulfillment = async (purchaseId: string) => {
    try {
      setRetryingId(purchaseId);
      await participantApi.purchases.retryFulfillment(purchaseId);
      setActionMessage("Tickets generated successfully!");
      void fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(
        err instanceof Error
          ? err.message
          : "Fulfillment retry requires administrator approval. Please contact support."
      );
    } finally {
      setRetryingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await participantApi.auth.logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <main className="relative z-10 min-h-screen px-4 pt-28 text-white font-heading">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-10 w-48 rounded-none bg-white/10" />
          <div className="h-40 rounded-none bg-white/5" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-60 rounded-none bg-white/5" />
            <div className="h-60 rounded-none bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 text-white font-pixel sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="[font-family:var(--font-gotham-bold)] text-2xl font-normal leading-tight tracking-normal sm:text-3xl">
                Welcome, {user.name}
              </h1>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-0.5 text-xs font-medium text-cyan-300">
                {user.role}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">{user.email}</p>
            <p className="mt-1 text-sm text-white/50">{user.id}</p>
          </div>

          <div className="flex items-center gap-3 ">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 font-sans rounded-none border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
            >

              Sign out
            </button>
          </div>
        </div>

        {/* Action alert toast/banner */}
        {actionMessage && (
          <div className="flex items-center justify-between rounded-none border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-200">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-xs text-white/60 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Profile Incomplete Banner */}
        {!(user.profileComplete ?? user.profile_complete) && (
          <div className="flex flex-col items-start justify-between gap-4 rounded-none border border-amber-400/30 bg-amber-400/10 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">

              <div>
                <p className="font-medium text-[#FFCA8A]">Profile incomplete</p>
                <p className="mt-0.5 text-xs text-[#FFCA8A]/80">
                  Please complete your profile to register for events or purchase passes.
                  {(user.missingFields ?? user.missing_fields ?? []).length > 0 &&
                    ` Missing: ${(user.missingFields ?? user.missing_fields ?? []).join(", ")}`}
                </p>
              </div>
            </div>
            <Link
              href="/profile-completion"
              className="inline-flex shrink-0 items-center gap-2 rounded-none bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-amber-300"
            >
              Complete Profile

            </Link>
          </div>
        )}

        {/* Profile Card & Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* User info card */}
          <div className="border border-[#55DFFF]/25 bg-transparent p-5 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">

              <div>
                <p className="font-[var(--font-gotham-bold)] font-semibold text-white">Profile Details</p>
                <p className="text-xs text-white/50">Personal & Academic info</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Phone</span>
                <span className="text-white/80">{user.phone ? `+91 ${user.phone}` : "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Student Status</span>
                <span className="text-white/80">{(user.isStudent ?? user.is_student) ? "Yes" : "General Attendee"}</span>
              </div>
              {(user.isStudent ?? user.is_student) && (
                <>
                  <div className="flex justify-between">
                    <span className="text-white/40">Institution</span>
                    <span className="max-w-[150px] truncate text-right text-white/80">
                      {user.institutionName ?? user.institution_name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Student ID</span>
                    <span className="text-white/80">{user.institutionId ?? user.institution_id ?? "—"}</span>
                  </div>
                </>
              )}
              {(user.studentFieldsLocked ?? user.student_fields_locked) && (
                <div className="mt-2 flex items-center gap-2 rounded-none bg-[#8FE388]/10 p-2 text-[11px] text-[#8FE388]">

                  <span>Student ID verified & locked</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3">
              <Link
                href="/profile-completion"
                className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
              >
                Edit details →
              </Link>
            </div>
          </div>

          {/* Quick pass summary */}
          <div className="border border-[#55DFFF]/25 bg-transparent p-5 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">

              <div>
                <p className="font-[var(--font-gotham-bold)] font-semibold text-white">Digital Passes</p>
                <p className="text-xs text-white/50">{tickets.length} Active Tickets</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {tickets.length > 0 ? (
                tickets.slice(0, 3).map((tkt) => (
                  <div
                    key={tkt.id}
                    className="flex items-center justify-between rounded-none border border-white/5 bg-transparent p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{tkt.ticket_type}</p>
                      <p className="text-[10px] text-white/40">Tier: {tkt.tier}</p>
                    </div>
                    <span className="rounded-full bg-[#8FE388]/10 px-2 py-0.5 text-[10px] font-medium text-[#8FE388]">
                      VALID
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-white/40">No passes purchased yet.</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between pt-3">
              <Link href="/me/tickets" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                View passes & QR →
              </Link>
              <Link href="/registrations" className="text-xs text-[#55DFFF] hover:text-purple-200">
                Registrations →
              </Link>
            </div>
          </div>

          {/* Teams summary */}
          <div className="border border-[#55DFFF]/25 bg-transparent p-5 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">

              <div>
                <p className="font-[var(--font-gotham-bold)] font-semibold text-white">Teams & Invites</p>
                <p className="text-xs text-white/50">
                  {teams.length} Teams · {invites.length} Pending Invites
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {invites.length > 0 && (
                <div className="rounded-none border border-amber-400/20 bg-amber-400/10 p-2.5 text-xs">
                  <p className="font-medium text-[#FFCA8A]">{invites.length} pending invite(s)</p>
                  <p className="mt-0.5 text-[10px] text-[#FFCA8A]/70">
                    Respond below to join team rosters
                  </p>
                </div>
              )}

              {teams.length > 0 ? (
                teams.slice(0, 3).map((tm) => (
                  <div
                    key={tm.id}
                    className="flex items-center justify-between rounded-none border border-white/5 bg-transparent p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{tm.name}</p>
                      <p className="text-[10px] text-white/40">
                        {tm.leader_id === user.id ? "Leader" : "Member"} · {tm.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-white/40">You are not part of any team yet.</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between pt-3">
              <Link href="/teams" className="text-xs font-semibold text-[#55DFFF] hover:text-sky-200">
                Manage all teams →
              </Link>
              <Link href="/me/team-invites" className="text-xs font-medium text-[#FFB86B] hover:text-[#FFCA8A]">
                Invitations inbox ({invites.length}) →
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Team Invitations Section */}
        {invites.length > 0 && (
          <section className="border border-[#55DFFF]/25 bg-transparent p-6 [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
            <div className="mb-4 flex items-center gap-2">

              <h2 className="font-[var(--font-gotham-bold)] text-lg font-semibold text-white">Pending Team Invitations</h2>
            </div>

            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col justify-between gap-4 rounded-none border border-white/10 bg-transparent p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-white">
                      {(invite as any).team_name
                        ? `Invitation to join ${(invite as any).team_name}`
                        : "Team Invitation"}
                    </p>
                    <p className="text-xs text-white/50">
                      {(invite as any).event_title && (
                        <span className="text-cyan-300">{(invite as any).event_title} · </span>
                      )}
                      Sent to: {invite.invited_email} · Invited {new Date(invite.invited_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="rounded-none bg-[#55DFFF] px-3 py-1.5 text-xs font-medium text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-[#8BEAFF]"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineInvite(invite.id)}
                      className="rounded-none border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-white/10 hover:text-white"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Preparing Tickets (Retry banner) */}
        {preparingTickets.length > 0 && (
          <section className="border border-[#55DFFF]/30 bg-transparent p-6 [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">

                <h2 className="font-[var(--font-gotham-bold)] text-lg font-semibold text-white">Preparing Passes</h2>
              </div>
            </div>

            <div className="space-y-3">
              {preparingTickets.map((prep) => (
                <div
                  key={prep.purchase_id}
                  className="flex flex-col justify-between gap-4 rounded-none border border-white/10 bg-transparent p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-white">Order {prep.purchase_id}</p>
                    <p className="text-xs text-white/60">{prep.message}</p>
                  </div>

                  {prep.can_retry && (
                    <button
                      type="button"
                      disabled={retryingId === prep.purchase_id}
                      onClick={() => handleRetryFulfillment(prep.purchase_id)}
                      className="inline-flex items-center gap-2 rounded-none bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-[#8BEAFF] disabled:opacity-50"
                    >

                      Generate Passes Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Digital Tickets Section */}
        <section className="border border-[#55DFFF]/25 bg-transparent p-6 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">

              <h2 className="font-[var(--font-gotham-bold)] text-xl font-semibold text-white">My Digital Passes</h2>
            </div>
            <Link
              href="/me/tickets"
              className="inline-flex items-center gap-1.5 rounded-none border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-cyan-300 hover:text-black"
            >
              Full Pass View & QR Codes →
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="rounded-none border border-dashed border-white/10 py-12 text-center">

              <p className="mt-3 text-sm text-white/50">You don’t have any active digital passes.</p>
              <Link
                href="/events"
                className="mt-4 inline-flex items-center gap-2 rounded-none bg-cyan-300 px-4 py-2 text-xs font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-cyan-200"
              >
                Browse Events & Passes
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="relative overflow-hidden border border-[#55DFFF]/35 bg-transparent p-5 [clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_22px,100%_100%,22px_100%,0_calc(100%_-_22px))]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-cyan-300">
                        {tkt.ticket_type}
                      </span>
                      <h3 className="font-[var(--font-gotham-bold)] mt-2 text-lg font-bold text-white">
                        {tkt.event?.title || "TechXetra Gate Pass"}
                      </h3>
                      <p className="text-xs text-white/50">Ticket ID: {tkt.id}</p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tkt.validity.state === "VALID"
                          ? "bg-[#8FE388]/10 text-[#8FE388]"
                          : "bg-amber-400/10 text-[#FFB86B]"
                        }`}
                    >
                      {tkt.validity.state}
                    </span>
                  </div>

                  {/* Student ID alert for student tier passes */}
                  {tkt.tier === "STUDENT" && (
                    <div className="mt-4 flex items-start gap-2 rounded-none border border-amber-400/20 bg-amber-400/[0.07] p-2.5 text-xs text-[#FFCA8A]">

                      <span>{tkt.student_id_warning || "Physical college ID required at check-in."}</span>
                    </div>
                  )}

                  {/* Tamper-proof QR Token Display */}
                  <div className="mt-5 rounded-none border border-white/10 bg-transparent p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                      Signed QR Entry Token
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-cyan-200">
                      {tkt.qr_token}
                    </p>
                    <p className="mt-2 text-[10px] text-white/30">
                      Valid from {new Date(tkt.validity.valid_from).toLocaleDateString()} to{" "}
                      {new Date(tkt.validity.valid_to).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Purchases Section */}
        <section className="border border-[#55DFFF]/25 bg-transparent p-6 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">

              <h2 className="font-[var(--font-gotham-bold)] text-xl font-semibold text-white">Order & Payment History</h2>
            </div>
          </div>

          {purchases.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/40">No orders recorded yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {purchases.map((p) => (
                <div key={p.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">Order {p.id}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "PAID"
                            ? "bg-[#8FE388]/10 text-[#8FE388]"
                            : p.status === "PENDING_VERIFICATION"
                              ? "bg-amber-400/10 text-[#FFB86B]"
                              : p.status === "AWAITING_PAYMENT"
                                ? "bg-[#55DFFF]/10 text-[#55DFFF]"
                                : "bg-white/10 text-white/50"
                          }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">
                      {new Date(p.created_at).toLocaleDateString()} · ₹{(p.total_amount_paise / 100).toFixed(2)}
                    </p>
                  </div>

                  {p.status === "AWAITING_PAYMENT" && (
                    <span className="text-xs text-cyan-300">
                      Reservation active
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
