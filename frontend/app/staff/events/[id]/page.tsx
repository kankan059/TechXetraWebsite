"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  QrCode,
  ArrowLeft,
  RefreshCw,
  Phone,
  Mail,
  Shield,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import StaffEventNav from "@/components/staff/StaffEventNav";
import type { StaffEventDashboard, UserProfile } from "@/types/api";

export default function StaffEventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<StaffEventDashboard | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Authenticate user
      let currentUser: UserProfile;
      try {
        currentUser = await participantApi.auth.me();
      } catch {
        router.push(`/login?redirect=/staff/events/${id}`);
        return;
      }

      if (
        currentUser.role !== "VOLUNTEER" &&
        currentUser.role !== "LEAD" &&
        currentUser.role !== "SUPER_ADMIN"
      ) {
        router.push("/dashboard");
        return;
      }
      setUser(currentUser);

      // 2. Fetch event dashboard data
      const dashboardData = await staffApi.events.getDashboard(id);
      setData(dashboardData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load event dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-6 w-48 rounded-xl bg-white/10" />
          <div className="h-28 rounded-3xl bg-white/5" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-32 rounded-3xl bg-white/5" />
            <div className="h-32 rounded-3xl bg-white/5" />
            <div className="h-32 rounded-3xl bg-white/5" />
            <div className="h-32 rounded-3xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Event Dashboard Unavailable</h1>
          <p className="mt-2 text-xs text-white/50">{error || "Event not found or access denied."}</p>
          <Link
            href="/staff/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-400 px-5 py-2.5 text-xs font-bold text-black"
          >
            ← Return to Events Hub
          </Link>
        </div>
      </main>
    );
  }

  const { event, metrics, staff } = data;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const userStaffRecord = staff.find((s) => s.user_id === user?.id);
  const isLeadOrAdmin = isSuperAdmin || userStaffRecord?.role === "LEAD" || user?.role === "LEAD";

  const capacity = event.capacity;
  const capacityPercent = capacity && capacity > 0
    ? Math.min(100, Math.round(((metrics.confirmed_count) / capacity) * 100))
    : null;

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Breadcrumb & Refresh */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Link href="/staff" className="hover:text-white">Staff Portal</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/staff/events" className="hover:text-white">Events</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium truncate max-w-xs">{event.title}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Event Header Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-300">
                  {event.category}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    event.status === "OPEN"
                      ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                      : event.status === "CLOSED"
                      ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {event.status}
                </span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-white/70">
                  DAY {event.day_of_event}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/60">
                {event.venue && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                    <span>{event.venue}</span>
                  </div>
                )}
                {event.starts_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-300" />
                    <span>
                      {new Date(event.starts_at).toLocaleDateString()} at{" "}
                      {new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-cyan-300" />
                  <span>
                    {event.is_team_event
                      ? `Team (${event.min_team_size}–${event.max_team_size} members)`
                      : "Solo Competition"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/events/${event.slug || event.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>Public Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <StaffEventNav
          eventId={id}
          currentTab="overview"
          isLeadOrAdmin={isLeadOrAdmin}
          isEsports={event.category === "E_SPORTS"}
        />

        {/* Metrics Grid (4 Stat Cards) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Confirmed Registrations */}
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.02] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Confirmed Registrations
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-4 text-3xl font-extrabold text-white">
              {metrics.confirmed_count}
            </p>
            <p className="mt-1 text-xs text-emerald-300/80">
              {capacity ? `${capacityPercent}% of total capacity filled` : "Unlimited capacity"}
            </p>
          </div>

          {/* 2. Seats Remaining */}
          <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-amber-500/[0.02] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Seats Remaining
              </span>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="mt-4 text-3xl font-extrabold text-white">
              {metrics.seats_remaining !== null ? metrics.seats_remaining : "∞"}
            </p>
            {capacity && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${capacityPercent || 0}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-white/40">
                  {metrics.confirmed_count + metrics.reserved_count} / {capacity} slots allocated
                </p>
              </div>
            )}
          </div>

          {/* 3. Checked In at Arena */}
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-cyan-500/[0.02] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Admitted at Venue
              </span>
              <QrCode className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="mt-4 text-3xl font-extrabold text-white">
              {metrics.checked_in_count}
            </p>
            <p className="mt-1 text-xs text-cyan-300/80">
              {metrics.confirmed_count > 0
                ? `${Math.round((metrics.checked_in_count / metrics.confirmed_count) * 100)}% attendee turnout`
                : "No confirmed attendees yet"}
            </p>
          </div>

          {/* 4. Pending Payment Reviews */}
          <div
            className={`rounded-3xl border p-6 transition ${
              metrics.pending_payments_count > 0
                ? "border-red-500/30 bg-gradient-to-b from-red-500/15 to-red-500/[0.03]"
                : "border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Payment Verification
              </span>
              <CreditCard className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-4 text-3xl font-extrabold text-white">
              {metrics.pending_payments_count}
            </p>
            {isLeadOrAdmin ? (
              <Link
                href={`/staff/events/${id}/payments`}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-300 hover:text-white"
              >
                <span>Review payments queue</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <p className="mt-1 text-xs text-white/50">Lead approval required</p>
            )}
          </div>
        </div>

        {/* Committee Staff Roster */}
        <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Event Committee Roster
                </h2>
                <p className="text-xs text-white/50">
                  Organizers, leads, and volunteers assigned to operate this event.
                </p>
              </div>
            </div>
          </div>

          {staff.length === 0 ? (
            <p className="py-12 text-center text-xs text-white/40">
              No committee members assigned to this event yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] uppercase text-[11px] font-semibold text-white/40">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Committee Role</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Assigned On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {staff.map((m) => {
                    const isLead = m.role === "LEAD";
                    return (
                      <tr key={m.user_id} className="transition hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <p>{m.name}</p>
                          <p className="font-mono text-[10px] text-white/40">{m.user_id}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isLead
                                ? "bg-purple-400/15 text-purple-300 border border-purple-400/30"
                                : "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-2 text-white/70">
                            <Mail className="h-3 w-3 text-white/40" />
                            <a href={`mailto:${m.email}`} className="hover:text-white">
                              {m.email}
                            </a>
                          </div>
                          {m.phone && (
                            <div className="flex items-center gap-2 text-white/70">
                              <Phone className="h-3 w-3 text-white/40" />
                              <a href={`tel:${m.phone}`} className="hover:text-white">
                                {m.phone}
                              </a>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-white/50">
                          {new Date(m.assigned_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
