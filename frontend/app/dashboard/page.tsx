"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
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

const panel =
  "border border-white/10 bg-[#07111b]/70 shadow-[0_12px_40px_rgba(0,0,0,0.12)]";
const heading =
  "font-[var(--font-gotham-bold)] font-semibold tracking-tight text-white";
const muted = "text-sm leading-6 text-white/60";
const actionLink =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-white/15 px-4 py-2 font-sans text-sm font-medium text-white/80 transition hover:border-cyan-300/40 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF]";

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {eyebrow}
          </p>
        )}
        <h2 className={`${heading} text-xl sm:text-2xl`}>{title}</h2>
        {description && <p className={`mt-1.5 ${muted}`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "info" | "neutral" }) {
  const tones = {
    success: "border-emerald-300/20 bg-emerald-300/10 text-[#A7F3C0]",
    warning: "border-amber-300/20 bg-amber-300/10 text-[#FFD49A]",
    info: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    neutral: "border-white/10 bg-white/[0.05] text-white/65",
  };
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="border border-dashed border-white/10 px-5 py-8 text-center sm:px-8">
      <div className="mx-auto flex size-10 items-center justify-center border border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200">
        <span aria-hidden="true" className="text-lg">↗</span>
      </div>
      <h3 className={`${heading} mt-4 text-base`}>{title}</h3>
      <p className={`mx-auto mt-1.5 max-w-md ${muted}`}>{description}</p>
      {href && action && (
        <Link href={href} className="mt-5 inline-flex min-h-10 items-center justify-center bg-[#55DFFF] px-4 py-2 font-sans text-sm font-semibold text-[#041018] transition hover:bg-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          {action} <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      )}
    </div>
  );
}

function HowToRegister() {
  const steps = [
    {
      number: "01",
      title: "Complete your profile",
      description:
        "Add your personal and academic details. Make sure your information is correct before registering.",
    },
    {
      number: "02",
      title: "Explore events",
      description:
        "Browse the available TechXetra events and check their participation requirements to see whether individual or team registration is needed.",
    },
    {
      number: "03",
      title: "Create or join a team (if required)",
      description:
        "Some events require team participation, while others allow individual registration. If a team is required, create or join one. All team members must have registered on the TechXetra platform, as team invitations are sent through the platform itself.",
    },
    {
      number: "04",
      title: "Register for an event",
      description:
        "Open your chosen event and follow its registration instructions. For team events, make sure your team is ready before completing registration, if required.",
    },
    {
      number: "05",
      title: "Check your registration",
      description:
        "Visit your Registrations page to review your registration status and related details.",
    },
    {
      number: "06",
      title: "Access your digital pass",
      description:
        "If a pass is issued for your registration, open My Digital Passes to view your pass and QR code. Follow any event-specific entry instructions.",
    },
  ];

  return (
    <section id="how-to-register" className={`${panel} p-5 sm:p-7 lg:p-8`}>
      <SectionHeading
        eyebrow="New to TechXetra?"
        title="How to register for an event"
        description="A simple guide to help you get from your account to your event."
      />
      <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.number} className="relative flex gap-3 border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
            <span className="flex size-9 shrink-0 items-center justify-center border border-cyan-300/25 bg-cyan-300/[0.07] font-sans text-xs font-semibold text-cyan-200">
              {step.number}
            </span>
            <div>
              <h3 className={`${heading} text-sm`}>{step.title}</h3>
              <p className="mt-1.5 font-sans text-sm leading-6 text-white/55">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
        <Link href="/events" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#55DFFF] px-5 py-3 font-sans text-sm font-semibold text-[#041018] transition hover:bg-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          Explore events <span aria-hidden="true">→</span>
        </Link>
        <Link href="/registrations" className={actionLink}>
          View my registrations <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

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
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
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
      if (teamsRes.status === "fulfilled" && teamsRes.value) setTeams(teamsRes.value || []);
      if (invitesRes.status === "fulfilled" && invitesRes.value) setInvites(invitesRes.value || []);
      if (purchasesRes.status === "fulfilled" && purchasesRes.value) setPurchases(purchasesRes.value || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setActionMessage("Some dashboard information could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAcceptInvite = async (memberId: string) => {
    try {
      setBusyInviteId(memberId);
      setActionMessage(null);
      await participantApi.teams.acceptInvite(memberId);
      setActionMessage("Invitation accepted. Your team details are being updated.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not accept this invitation. Please try again.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleDeclineInvite = async (memberId: string) => {
    try {
      setBusyInviteId(memberId);
      setActionMessage(null);
      await participantApi.teams.declineInvite(memberId);
      setActionMessage("Invitation declined.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not decline this invitation. Please try again.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleRetryFulfillment = async (purchaseId: string) => {
    try {
      setRetryingId(purchaseId);
      setActionMessage(null);
      await participantApi.purchases.retryFulfillment(purchaseId);
      setActionMessage("Pass generation was requested successfully.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(
        err instanceof Error
          ? err.message
          : "Pass generation could not be completed. Please contact support if this continues."
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
      <main className="relative z-10 min-h-screen px-4 pb-16 pt-28 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6" aria-label="Loading dashboard">
          <div className="h-8 w-44 bg-white/10" />
          <div className="h-36 border border-white/10 bg-white/[0.03]" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-44 bg-white/[0.04]" />
            <div className="h-44 bg-white/[0.04]" />
            <div className="h-44 bg-white/[0.04]" />
          </div>
          <p className="font-sans text-sm text-white/45">Loading your dashboard…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const profileComplete = Boolean(user.profileComplete ?? user.profile_complete);
  const isStudent = Boolean(user.isStudent ?? user.is_student);
  const studentFieldsLocked = Boolean(user.studentFieldsLocked ?? user.student_fields_locked);
  const missingFields = user.missingFields ?? user.missing_fields ?? [];

  const purchaseStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: "Paid",
      PENDING_VERIFICATION: "Pending verification",
      AWAITING_PAYMENT: "Awaiting payment",
    };
    return labels[status] ?? status.replaceAll("_", " ").toLowerCase();
  };

  const purchaseTone = (status: string): "success" | "warning" | "info" | "neutral" => {
    if (status === "PAID") return "success";
    if (status === "PENDING_VERIFICATION") return "warning";
    if (status === "AWAITING_PAYMENT") return "info";
    return "neutral";
  };

  return (
    <main className="relative z-10 min-h-screen px-4 pb-16 pt-24 font-sans text-white sm:px-6 sm:pt-28 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="relative overflow-hidden border border-cyan-300/15 bg-[#07111b]/80 p-5 sm:p-7 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-cyan-400/[0.08] blur-[90px]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Participant dashboard</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className={`${heading} break-words text-2xl sm:text-3xl lg:text-4xl`}>
                  Welcome, {user.name}
                </h1>
                <StatusPill tone="info">{user.role}</StatusPill>
              </div>
              <p className="mt-3 break-all text-sm text-white/60">{user.email}</p>
              <p className="mt-1 break-all font-mono text-xs text-white/35">Account ID: {user.id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/events" className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#55DFFF] px-5 py-2.5 font-sans text-sm font-semibold text-[#041018] transition hover:bg-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                Browse events <span aria-hidden="true">→</span>
              </Link>
              <button type="button" onClick={handleLogout} className="inline-flex min-h-11 items-center justify-center border border-white/15 px-4 py-2.5 font-sans text-sm text-white/75 transition hover:border-red-300/40 hover:bg-red-300/[0.06] hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                Sign out
              </button>
            </div>
          </div>
        </header>

        <aside
          aria-label="Registration guide notice"
          className="relative overflow-hidden border border-amber-300/25 bg-amber-300/[0.06] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center border border-amber-300/25 bg-amber-300/[0.08] text-lg text-amber-200"
            >
              !
            </span>
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                New to TechXetra?
              </p>
              <h2 className={`${heading} mt-1 text-base`}>
                Need help registering for an event?
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/65">
                A step-by-step guide is available near the bottom of this dashboard.
                Scroll down or jump straight to the guide.
              </p>
            </div>
          </div>
          <a
            href="#how-to-register"
            className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-amber-200/30 px-4 py-2 font-sans text-sm font-semibold text-amber-100 transition hover:bg-amber-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:mt-0"
          >
            How to register <span aria-hidden="true">↓</span>
          </a>
        </aside>

        {actionMessage && (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-4 border border-cyan-300/20 bg-cyan-300/[0.07] p-4 text-sm text-cyan-100">
            <p>{actionMessage}</p>
            <button type="button" onClick={() => setActionMessage(null)} aria-label="Dismiss message" className="shrink-0 px-2 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Dismiss</button>
          </div>
        )}

        {!profileComplete && (
          <section className="flex flex-col gap-4 border border-amber-300/25 bg-amber-300/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <StatusPill tone="warning">Action needed</StatusPill>
              <h2 className={`${heading} mt-3 text-lg`}>Complete your profile to get started</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">
                Add your required details before registering for events or purchasing passes.
                {missingFields.length > 0 && (
                  <span className="mt-1 block text-amber-100/80">
                    Still needed: {missingFields.join(", ")}
                  </span>
                )}
              </p>
            </div>
            <Link href="/profile-completion" className="inline-flex min-h-11 shrink-0 items-center justify-center bg-amber-300 px-5 py-2.5 font-sans text-sm font-semibold text-[#171006] transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
              Complete profile <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          </section>
        )}

        <section aria-label="Dashboard overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`${panel} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">Profile</p>
            <p className={`${heading} mt-3 text-xl`}>{profileComplete ? "Complete" : "Incomplete"}</p>
            <div className="mt-3"><StatusPill tone={profileComplete ? "success" : "warning"}>{profileComplete ? "Ready to continue" : "Finish setup"}</StatusPill></div>
            <Link href="/profile-completion" className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">View profile →</Link>
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">Digital passes</p>
            <p className={`${heading} mt-3 text-3xl tabular-nums`}>{tickets.length}</p>
            <p className="mt-1 text-sm text-white/50">Passes currently available</p>
            <Link href="/me/tickets" className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">View passes →</Link>
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">My teams</p>
            <p className={`${heading} mt-3 text-3xl tabular-nums`}>{teams.length}</p>
            <p className="mt-1 text-sm text-white/50">{invites.length} pending invitation{invites.length === 1 ? "" : "s"}</p>
            <Link href="/teams" className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Manage teams →</Link>
          </div>
          <div className={`${panel} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">Orders</p>
            <p className={`${heading} mt-3 text-3xl tabular-nums`}>{purchases.length}</p>
            <p className="mt-1 text-sm text-white/50">Orders in your account</p>
            <a href="#order-history" className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">View history ↓</a>
          </div>
        </section>

        <section className={`${panel} p-5 sm:p-6`}>
          <SectionHeading eyebrow="Your account" title="Profile details" description="Review the information connected to your TechXetra account." action={<Link href="/profile-completion" className={actionLink}>Edit profile →</Link>} />
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs text-white/45">Phone number</dt><dd className="mt-1.5 break-words text-sm text-white/85">{user.phone ? `+91 ${user.phone}` : "Not added yet"}</dd></div>
            <div><dt className="text-xs text-white/45">Attendee type</dt><dd className="mt-1.5 text-sm text-white/85">{isStudent ? "Student" : "General attendee"}</dd></div>
            {isStudent && <div><dt className="text-xs text-white/45">Institution</dt><dd className="mt-1.5 break-words text-sm text-white/85">{user.institutionName ?? user.institution_name ?? "Not added yet"}</dd></div>}
            {isStudent && <div><dt className="text-xs text-white/45">Student ID</dt><dd className="mt-1.5 break-words text-sm text-white/85">{user.institutionId ?? user.institution_id ?? "Not added yet"}</dd></div>}
            {studentFieldsLocked && <div className="sm:col-span-2 lg:col-span-3"><StatusPill tone="success">Student ID verified and locked</StatusPill></div>}
          </dl>
        </section>

        {invites.length > 0 && (
          <section className={`${panel} p-5 sm:p-6`}>
            <SectionHeading eyebrow="Team updates" title="Pending invitations" description="Accept an invitation to join a team, or decline if it isn't for you." />
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-col gap-4 border border-amber-300/15 bg-amber-300/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className={`${heading} text-sm`}>
                      {(invite as any).team_name ? `Invitation to join ${(invite as any).team_name}` : "Team invitation"}
                    </h3>
                    <p className="mt-1.5 break-words text-sm text-white/55">
                      {(invite as any).event_title && <span className="text-cyan-200">{(invite as any).event_title} · </span>}
                      Sent to {invite.invited_email} · {new Date(invite.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button type="button" disabled={busyInviteId === invite.id} onClick={() => handleAcceptInvite(invite.id)} className="inline-flex min-h-10 items-center justify-center bg-[#55DFFF] px-4 py-2 text-sm font-semibold text-[#041018] transition hover:bg-[#8BEAFF] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                      {busyInviteId === invite.id ? "Please wait…" : "Accept invite"}
                    </button>
                    <button type="button" disabled={busyInviteId === invite.id} onClick={() => handleDeclineInvite(invite.id)} className="inline-flex min-h-10 items-center justify-center border border-white/15 px-4 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4"><Link href="/me/team-invites" className="text-sm font-medium text-cyan-300 hover:text-cyan-100">View all invitations →</Link></div>
          </section>
        )}

        {preparingTickets.length > 0 && (
          <section className={`${panel} p-5 sm:p-6`}>
            <SectionHeading eyebrow="Order updates" title="Passes being prepared" description="Some passes may need a little time before they become available." />
            <div className="space-y-3">
              {preparingTickets.map((prep) => (
                <div key={prep.purchase_id} className="flex flex-col gap-3 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className={`${heading} break-words text-sm`}>Order {prep.purchase_id}</p>
                    <p className="mt-1 text-sm leading-6 text-white/55">{prep.message}</p>
                  </div>
                  {prep.can_retry && (
                    <button type="button" disabled={retryingId === prep.purchase_id} onClick={() => handleRetryFulfillment(prep.purchase_id)} className="inline-flex min-h-10 shrink-0 items-center justify-center bg-[#55DFFF] px-4 py-2 text-sm font-semibold text-[#041018] transition hover:bg-[#8BEAFF] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                      {retryingId === prep.purchase_id ? "Requesting…" : "Try generating passes"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`${panel} p-5 sm:p-6`}>
          <SectionHeading eyebrow="Entry to TechXetra" title="My digital passes" description="Your available passes and entry information will appear here." action={<Link href="/me/tickets" className={actionLink}>Full pass view →</Link>} />
          {tickets.length === 0 ? (
            <EmptyState title="No digital passes yet" description="Once a pass is issued to your account, you can find it here. You can explore events to see what's available." href="/events" action="Explore events" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="relative overflow-hidden border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.05] to-transparent p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <StatusPill tone="info">{ticket.ticket_type}</StatusPill>
                      <h3 className={`${heading} mt-3 break-words text-lg`}>{ticket.event?.title || "TechXetra Gate Pass"}</h3>
                      <p className="mt-1 break-all font-mono text-xs text-white/40">Ticket ID: {ticket.id}</p>
                      <p className="mt-2 text-xs text-white/55">Pass type: {ticket.tier}</p>
                    </div>
                    <StatusPill tone={ticket.validity.state === "VALID" ? "success" : "warning"}>
                      {ticket.validity.state === "VALID" ? "Valid" : ticket.validity.state.replaceAll("_", " ")}
                    </StatusPill>
                  </div>
                  {ticket.tier === "STUDENT" && (
                    <div className="mt-4 border border-amber-300/15 bg-amber-300/[0.05] p-3 text-sm leading-6 text-amber-100/85">
                      {ticket.student_id_warning || "Please bring your physical college ID for check-in."}
                    </div>
                  )}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">QR entry token</p>
                    <p className="mt-2 break-all font-mono text-xs leading-5 text-cyan-100/85">{ticket.qr_token}</p>
                    <p className="mt-3 text-xs leading-5 text-white/45">
                      Valid from {new Date(ticket.validity.valid_from).toLocaleDateString()} to {new Date(ticket.validity.valid_to).toLocaleDateString()}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link href="/me/tickets" className="inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Open pass and QR code →</Link>
                      {(ticket.event?.whatsappUrl || (ticket.event as any)?.whatsapp_url) && (
                        <a
                          href={ticket.event?.whatsappUrl || (ticket.event as any)?.whatsapp_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/20 px-3 py-1 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/30 transition"
                        >
                          Join WhatsApp Group ↗
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`${panel} p-5 sm:p-6`}>
          <SectionHeading eyebrow="Your groups" title="Teams and memberships" description="See the teams you're part of and manage team activity." action={<Link href="/teams" className={actionLink}>Manage teams →</Link>} />
          {teams.length === 0 ? (
            <EmptyState title="You're not part of a team yet" description="If an event supports teams, you can join one through an invitation or the team options available for that event." href="/teams" action="Explore teams" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <article key={team.id} className="border border-white/10 bg-white/[0.02] p-4">
                  <h3 className={`${heading} break-words text-base`}>{team.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill tone={team.leader_id === user.id ? "info" : "neutral"}>{team.leader_id === user.id ? "Team leader" : "Team member"}</StatusPill>
                    <StatusPill>{team.status}</StatusPill>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-4"><Link href="/me/team-invites" className="text-sm font-medium text-cyan-300 hover:text-cyan-100">Open invitation inbox ({invites.length}) →</Link></div>
        </section>

        <section id="order-history" className={`${panel} scroll-mt-24 p-5 sm:p-6`}>
          <SectionHeading eyebrow="Payments and orders" title="Order history" description="Check the status, date and amount of your orders." />
          {purchases.length === 0 ? (
            <EmptyState title="No orders yet" description="When you make an order, its details and current status will appear here." href="/events" action="Browse events" />
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {purchases.map((purchase) => {
                const p = purchase as any;

                const rawAmountInr = p.totalAmountInr;
                const rawPaise =
                  p.totalAmountPaise ??
                  p.total_amount_paise ??
                  p.amountPaise ??
                  p.amount_paise;
                const rawAmount = p.amount ?? p.total_amount;

                let amountFormatted = "0.00";

                if (
                  typeof rawAmountInr === "number" &&
                  !isNaN(rawAmountInr)
                ) {
                  amountFormatted = rawAmountInr.toFixed(2);
                } else if (
                  typeof rawPaise === "number" &&
                  !isNaN(rawPaise)
                ) {
                  amountFormatted = (rawPaise / 100).toFixed(2);
                } else if (
                  typeof rawAmount === "number" &&
                  !isNaN(rawAmount)
                ) {
                  amountFormatted = (
                    rawAmount > 1000 ? rawAmount / 100 : rawAmount
                  ).toFixed(2);
                } else {
                  const parsed = Number(
                    rawAmountInr ?? rawPaise ?? rawAmount
                  );

                  if (!isNaN(parsed) && parsed > 0) {
                    amountFormatted = (
                      rawPaise != null || parsed > 1000
                        ? parsed / 100
                        : parsed
                    ).toFixed(2);
                  }
                }

                const rawDate =
                  p.created_at ?? p.createdAt ?? p.updated_at;

                const dateObj = rawDate ? new Date(rawDate) : null;

                const formattedDate =
                  dateObj && !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                    : "Recent";

                const orderTitle =
                  p.items?.[0]?.descriptionSnapshot?.title ||
                  p.registrations?.[0]?.event_title ||
                  (p.items?.[0]?.item_type === "GATE_PASS" ||
                    p.items?.[0]?.itemType === "GATE_PASS"
                    ? "Festival Gate Pass"
                    : null);

                return (
                  <div
                    key={purchase.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`${heading} break-words text-sm`}>
                          Order {p.publicId || purchase.id}
                        </p>

                        <StatusPill tone={purchaseTone(purchase.status)}>
                          {purchaseStatusLabel(purchase.status)}
                        </StatusPill>
                      </div>

                      <p className="mt-1 text-sm text-white/50">
                        {formattedDate}
                        {orderTitle && (
                          <span className="ml-2 text-cyan-300/80">
                            · {orderTitle}
                          </span>
                        )}
                      </p>

                      {purchase.status === "AWAITING_PAYMENT" && (
                        <p className="mt-1 text-xs text-cyan-200">
                          Your reservation is active while payment is pending.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <p className={`${heading} text-base tabular-nums`}>
                        ₹{amountFormatted}
                      </p>

                      {purchase.status === "AWAITING_PAYMENT" && (
                        <Link
                          href={`/checkout/${encodeURIComponent(purchase.id)}/pay`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-400/20"
                        >
                          Complete Payment →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <HowToRegister />

        <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-xs leading-5 text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>Need a hand? Review the event instructions or contact the TechXetra team.</p>
          <Link href="/events" className="font-medium text-cyan-300 hover:text-cyan-100">Back to events →</Link>
        </footer>
      </div>
    </main>
  );
}
