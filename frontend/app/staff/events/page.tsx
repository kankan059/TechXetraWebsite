"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import type { StaffEventSummary, UserProfile } from "@/types/api";

export default function StaffAssignedEventsPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<StaffEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<number | "ALL">("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Authenticate user session
      let currentUser: UserProfile;
      try {
        currentUser = await participantApi.auth.me();
      } catch {
        router.push("/login?redirect=/staff/events");
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

      // 2. Fetch assigned events
      const res = await staffApi.events.listMine();
      setEvents(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load assigned events");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredEvents = useMemo(() => {
    if (dayFilter === "ALL") return events;
    return events.filter((e) => e.day_of_event === dayFilter);
  }, [events, dayFilter]);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/staff"
            className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Staff Console
          </Link>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-300">
                EVENT COMMITTEE
              </span>
              {user && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-white/70">
                  {user.role}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My Assigned Fest Events
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {user
                ? `Logged in as ${user.name} (${user.email}). Select an event to access registrations, live check-ins, and payments.`
                : "Manage your assigned festival competitions and activities."}
            </p>
          </div>

          {/* Day Filter Tabs */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-1 text-xs">
            {(["ALL", 1, 2, 3] as const).map((day) => {
              const isActive = dayFilter === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDayFilter(day)}
                  className={`rounded-xl px-3.5 py-1.5 font-medium transition ${
                    isActive
                      ? "bg-purple-400 text-black font-bold shadow-md shadow-purple-400/20"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {day === "ALL" ? "All Days" : `Day ${day}`}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-400" />
            Loading assigned festival events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] py-20 text-center text-white/40">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-base font-semibold text-white/70">
              {dayFilter === "ALL"
                ? "You have not been assigned to any events yet."
                : `No events assigned for Day ${dayFilter}.`}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Contact the festival administrator or Super Admin to receive committee assignments.
            </p>
          </div>
        ) : (
          /* Event Cards Grid */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((evt) => {
              const isLead = evt.role === "LEAD" || evt.role === "SUPER_ADMIN";
              const hasPendingPayments = evt.pending_payments_count > 0;

              return (
                <div
                  key={evt.id}
                  className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 shadow-xl transition hover:border-purple-400/40"
                >
                  <div className="space-y-4">
                    {/* Header tags */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isLead
                            ? "bg-purple-400/15 text-purple-300 border border-purple-400/30"
                            : "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                        }`}
                      >
                        {evt.role}
                      </span>
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium text-white/60">
                        {evt.category}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">
                        {evt.title}
                      </h2>
                      <p className="mt-1 text-xs text-white/50">
                        Day {evt.day_of_event}
                        {evt.venue ? ` • ${evt.venue}` : " • Venue TBA"}
                      </p>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold uppercase">Confirmed</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-white">
                          {evt.confirmed_registrations_count}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold uppercase">Seats Left</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-white">
                          {evt.seats_remaining !== null ? evt.seats_remaining : "∞"}
                        </p>
                      </div>
                    </div>

                    {/* Pending payments alert for lead */}
                    {hasPendingPayments && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-200">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                        <span>
                          <strong>{evt.pending_payments_count}</strong> payment{evt.pending_payments_count > 1 ? "s" : ""} awaiting verification
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Link */}
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <Link
                      href={`/staff/events/${evt.id}`}
                      className="inline-flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-purple-400 hover:text-black"
                    >
                      <span>Open Event Dashboard</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
