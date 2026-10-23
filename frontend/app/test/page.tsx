"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Ticket,
  Users,
  QrCode,
  Trophy,
  CreditCard,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { UserProfile } from "@/types/api";
import { participantApi } from "@/services/participant-api";

const TEST_SECTIONS = [
  {
    title: "1. Attendee & Participant Portal",
    badge: "PUBLIC & SESSION",
    badgeColor: "bg-cyan-400/10 text-cyan-300",
    routes: [
      {
        name: "Events Directory & Search",
        path: "/events?view=directory",
        desc: "Live events list with category pills, Day 1–3 filter, and instant search (GET /api/events)",
      },
      {
        name: "Festival Gate Pass Checkout",
        path: "/checkout",
        desc: "Gate pass reservation creation (POST /api/purchases) with student discount policy check",
      },
      {
        name: "My Digital Passes & QR Codes",
        path: "/me/tickets",
        desc: "View active passes (GET /api/tickets/me), signed QR tokens, and fulfillment retry",
      },
      {
        name: "My Event Registrations",
        path: "/registrations",
        desc: "Solo and team competition reservations and confirmed agenda (GET /api/registrations)",
      },
      {
        name: "User Dashboard & Status",
        path: "/dashboard",
        desc: "Personal profile status, active teams, passes summary, and order history",
      },
      {
        name: "Profile & Student ID Verification",
        path: "/profile-completion",
        desc: "Complete required phone number, student roll number, or edit profile (PATCH /api/me/profile)",
      },
      {
        name: "My Teams & Team Creation",
        path: "/teams",
        desc: "List active squads (GET /api/me/teams) or create a new team (POST /api/teams)",
      },
      {
        name: "Team Invitations Inbox",
        path: "/me/team-invites",
        desc: "Inbox of invitations from captains with live Accept / Decline actions",
      },
      {
        name: "Public E-Sports Leaderboards",
        path: "/leaderboards",
        desc: "Public tournament rankings, round-by-round points, and standings",
      },
      {
        name: "Sign In / Login",
        path: "/login",
        desc: "Email/password authentication and Google ID Token sign-in",
      },
      {
        name: "Sign Up / Register",
        path: "/signup",
        desc: "Create attendee account with email and password",
      },
    ],
  },
  {
    title: "2. Staff & Volunteer Operations",
    badge: "VOLUNTEER & LEAD",
    badgeColor: "bg-blue-400/10 text-blue-300",
    routes: [
      {
        name: "Staff Operations Portal Hub",
        path: "/staff",
        desc: "Operational console for gate volunteers, event check-in staff, and referee leads",
      },
      {
        name: "Gate & Event Ticket QR Scanner",
        path: "/staff/scan",
        desc: "Live QR lookup, tamper-proof signature verification, and physical student ID check toggle",
      },
      {
        name: "Tournament Referees Scoring",
        path: "/staff/events/evt_01j8k92b4m10ac/scores",
        desc: "Round-by-round score matrix with optimistic concurrency locking and audit history",
      },
    ],
  },
  {
    title: "3. Super Admin & Reviewer Portal",
    badge: "REVIEWER & ADMIN",
    badgeColor: "bg-purple-400/10 text-purple-300",
    routes: [
      {
        name: "Super Admin Overview",
        path: "/admin",
        desc: "Executive festival overview: ticket revenue, queue backlog, unique gate admissions",
      },
      {
        name: "Manual UPI Payment Verification Queue",
        path: "/admin/payments",
        desc: "Review queue with instant modal actions: Approve, Reject, Hold, Unhold, and Resubmit UTR",
      },
      {
        name: "User Management & Staff Roles",
        path: "/admin/users",
        desc: "Pre-register staff roles by email, toggle payment reviewer access, deactivate accounts",
      },
      {
        name: "Passes & Purchase Orders",
        path: "/admin/passes",
        desc: "Sales breakdowns by General vs Student tiers and order fulfillment tracking",
      },
      {
        name: "Event Registrations & Capacity",
        path: "/admin/registrations",
        desc: "Occupancy rates, confirmed seat allocations, and reserved capacity holds",
      },
      {
        name: "Gate & Event Attendance Reports",
        path: "/admin/attendance",
        desc: "Day-by-day gate admissions and per-event check-in counts",
      },
      {
        name: "Competitions & Event Configuration",
        path: "/admin/compititions",
        desc: "Event directory, team size boundaries, pricing models, and assigned staff",
      },
      {
        name: "Ticket Inspection & Overrides",
        path: "/admin/tickets",
        desc: "Inspect scan audit trail, rotate QR version, reissue, or undo accidental check-in",
      },
      {
        name: "Gate Staff Assignments",
        path: "/admin/gate-staff",
        desc: "Assign authorized volunteers to operate festival gate scanners",
      },
      {
        name: "Diagnostics & Health Reports",
        path: "/admin/reports",
        desc: "Capacity reconciliation, failed fulfillment retry, student demographics, duplicate IDs",
      },
      {
        name: "Festival Settings & Schedule",
        path: "/admin/settings",
        desc: "Global ticket pricing, ticket purchasing toggle, support contacts, Day 1-3 dates",
      },
      {
        name: "System Audit Trail",
        path: "/admin/audit-logs",
        desc: "Tamper-proof immutable logs of administrative decisions and state changes",
      },
    ],
  },
];

export default function TestingDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const checkSession = async () => {
    try {
      setLoadingUser(true);
      const data = await participantApi.auth.me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    void checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await participantApi.auth.logout();
      setUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              DEVELOPER & TESTING SUITE
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              TechXetra Route & Feature Launchpad
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Direct access to test every frontend route, API flow, and user role permission.
            </p>
          </div>

          <button
            type="button"
            onClick={checkSession}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingUser ? "animate-spin" : ""}`} />
            Check Live Session
          </button>
        </div>

        {/* Live Session State Bar */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  user ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/40"
                }`}
              >
                {user ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user ? `Logged in: ${user.name}` : "No active session (Guest / Anonymous)"}
                </p>
                <p className="text-xs text-white/50">
                  {user
                    ? `Role: ${user.role} · Email: ${user.email} · Profile Complete: ${
                        user.profile_complete ? "Yes" : "No"
                      }`
                    : "Sign in with test account to access authenticated participant/staff/admin routes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                >
                  Logout Session
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl bg-cyan-300 px-4 py-2 text-xs font-bold text-black transition hover:bg-cyan-200"
                >
                  Sign In to Test
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Route Testing Cards Grid */}
        <div className="space-y-10">
          {TEST_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
                <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${section.badgeColor}`}>
                  {section.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.routes.map((rt) => (
                  <Link
                    key={rt.path}
                    href={rt.path}
                    className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.05]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-cyan-300/80">{rt.path}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-1 group-hover:text-cyan-300" />
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-white group-hover:text-cyan-200">
                        {rt.name}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/50">{rt.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5">
                      <span className="text-[11px] font-semibold text-cyan-300 group-hover:underline">
                        Open page →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
