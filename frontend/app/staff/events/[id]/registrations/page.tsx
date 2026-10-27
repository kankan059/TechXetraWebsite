"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import StaffEventNav from "@/components/staff/StaffEventNav";
import QuestionnaireResponsesModal from "@/components/staff/QuestionnaireResponsesModal";
import { exportRegistrationsToCsv } from "@/lib/export-csv";
import type { EventRegistrationDetail, StaffEventDashboard, UserProfile } from "@/types/api";

export default function StaffEventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<StaffEventDashboard | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "RESERVED">("ALL");
  const [admissionFilter, setAdmissionFilter] = useState<"ALL" | "CHECKED_IN" | "NOT_CHECKED_IN">("ALL");

  // Questionnaire responses modal state
  const [activeModalReg, setActiveModalReg] = useState<EventRegistrationDetail | null>(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Auth check
      let currentUser: UserProfile;
      try {
        currentUser = await participantApi.auth.me();
      } catch {
        router.push(`/login?redirect=/staff/events/${id}/registrations`);
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

      // 2. Fetch dashboard metadata, registrations, and canonical event
      const [dash, regs, fullEvt] = await Promise.all([
        staffApi.events.getDashboard(id),
        staffApi.events.getRegistrations(id, debouncedSearch.trim() || undefined),
        participantApi.events.get(id).catch(() => null),
      ]);
      if (dash && fullEvt) {
        dash.event = { ...dash.event, ...fullEvt };
      }
      setDashboard(dash);
      setRegistrations(regs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load attendee roster");
    } finally {
      setLoading(false);
    }
  }, [id, debouncedSearch, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Client-side status & admission filters
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) {
        return false;
      }
      if (admissionFilter === "CHECKED_IN" && !r.ticket?.checked_in) {
        return false;
      }
      if (admissionFilter === "NOT_CHECKED_IN" && r.ticket?.checked_in) {
        return false;
      }
      return true;
    });
  }, [registrations, statusFilter, admissionFilter]);

  const isLeadOrAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "LEAD" ||
    dashboard?.staff.some((s) => s.user_id === user?.id && s.role === "LEAD");

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
            <Link href={`/staff/events/${id}`} className="hover:text-white truncate max-w-[160px]">
              {dashboard?.event.title || "Event"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">Registrations</span>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <StaffEventNav
          eventId={id}
          currentTab="registrations"
          isLeadOrAdmin={Boolean(isLeadOrAdmin)}
          isEsports={dashboard?.event.category === "E_SPORTS"}
        />

        {/* Header & Controls */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Attendee & Team Roster
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Showing {filteredRegistrations.length} of {registrations.length} attendees for{" "}
              {dashboard?.event.title || "this event"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              exportRegistrationsToCsv(
                dashboard?.event.title || "Event",
                filteredRegistrations
              )
            }
            disabled={filteredRegistrations.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-purple-300 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by participant, email, or team name..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-9 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {(["ALL", "CONFIRMED", "RESERVED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    statusFilter === st
                      ? "bg-purple-400 text-black font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st}
                </button>
              ))}
            </div>

            {/* Admission Filter */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {(
                [
                  ["ALL", "All Entry"],
                  ["CHECKED_IN", "Checked In"],
                  ["NOT_CHECKED_IN", "Pending Entry"],
                ] as const
              ).map(([adm, label]) => (
                <button
                  key={adm}
                  type="button"
                  onClick={() => setAdmissionFilter(adm)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    admissionFilter === adm
                      ? "bg-cyan-400 text-black font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Attendee Table */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C1017]">
          {loading ? (
            <div className="py-24 text-center text-sm text-white/40">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-400" />
              Loading attendee roster...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-20 text-center text-white/40">
              <Users className="mx-auto mb-3 h-10 w-10 text-white/20" />
              <p className="text-base font-semibold text-white/70">No matching registrations found</p>
              <p className="mt-1 text-xs text-white/40">
                Try adjusting your search query or filter options.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase text-white/40">
                    <th className="py-3.5 px-5">Participant</th>
                    <th className="py-3.5 px-5">Contact</th>
                    <th className="py-3.5 px-5">Team</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Check-In</th>
                    <th className="py-3.5 px-5 text-right">Form Answers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredRegistrations.map((r) => {
                    const hasResponses =
                      r.form_responses && Object.keys(r.form_responses).length > 0;
                    const responseCount = hasResponses
                      ? Object.keys(r.form_responses!).length
                      : 0;

                    return (
                      <tr key={r.registration_id} className="transition hover:bg-white/[0.02]">
                        {/* 1. Participant */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-white text-sm">{r.participant.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                            {r.participant.institution_name && (
                              <span>{r.participant.institution_name}</span>
                            )}
                            {r.participant.institution_id && (
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.2 font-mono text-[10px] text-white/70">
                                {r.participant.institution_id}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Contact */}
                        <td className="py-4 px-5 space-y-1">
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Mail className="h-3 w-3 text-cyan-300 shrink-0" />
                            <a href={`mailto:${r.participant.email}`} className="hover:text-white">
                              {r.participant.email}
                            </a>
                          </div>
                          {r.participant.phone && (
                            <div className="flex items-center gap-1.5 text-white/70">
                              <Phone className="h-3 w-3 text-cyan-300 shrink-0" />
                              <a href={`tel:${r.participant.phone}`} className="hover:text-white">
                                {r.participant.phone}
                              </a>
                            </div>
                          )}
                        </td>

                        {/* 3. Team */}
                        <td className="py-4 px-5">
                          {r.team ? (
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              <Users className="h-3.5 w-3.5 text-purple-300" />
                              <span>{r.team.name}</span>
                            </div>
                          ) : (
                            <span className="text-white/40 italic">Solo Participant</span>
                          )}
                        </td>

                        {/* 4. Registration Status */}
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              r.status === "CONFIRMED"
                                ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                                : r.status === "RESERVED"
                                ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                                : "bg-red-500/15 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {r.status === "CONFIRMED" && <CheckCircle2 className="h-3 w-3" />}
                            {r.status === "RESERVED" && <Clock className="h-3 w-3" />}
                            {r.status}
                          </span>
                        </td>

                        {/* 5. Check-In */}
                        <td className="py-4 px-5">
                          {r.ticket?.checked_in ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Admitted
                              {r.ticket.checked_in_at &&
                                ` (${new Date(r.ticket.checked_in_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })})`}
                            </span>
                          ) : r.ticket ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[10px] text-white/50">
                              Pending Entrance
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] text-amber-300/70">
                              Awaiting Payment
                            </span>
                          )}
                        </td>

                        {/* 6. Form Answers */}
                        <td className="py-4 px-5 text-right">
                          {hasResponses ? (
                            <button
                              type="button"
                              onClick={() => setActiveModalReg(r)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>View Answers ({responseCount})</span>
                            </button>
                          ) : (
                            <span className="text-white/30 text-xs">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Answers Popover Modal */}
        <QuestionnaireResponsesModal
          isOpen={Boolean(activeModalReg)}
          onClose={() => setActiveModalReg(null)}
          participantName={activeModalReg?.participant.name || ""}
          teamName={activeModalReg?.team?.name}
          responses={activeModalReg?.form_responses || null}
        />
      </div>
    </main>
  );
}
