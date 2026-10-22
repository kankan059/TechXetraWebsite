"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { participantApi } from "@/services/participant-api";
import type { Registration } from "@/types/api";

export default function RegistrationsPage() {
  const router = useRouter();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check user session
      try {
        await participantApi.auth.me();
      } catch {
        router.push("/login?redirect=/registrations");
        return;
      }

      const data = await participantApi.registrations.list();
      setRegistrations(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load event registrations");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={() => void loadRegistrations()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            MY FESTIVAL AGENDA
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            My Event Registrations
          </h1>
          <p className="mt-2 text-sm text-white/60">
            All solo and team competitions, hackathons, and workshops you are confirmed or reserved for.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
            Loading your event registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-20 text-center text-white/40">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="text-base font-semibold text-white/70">No registrations found</p>
            <p className="mt-1 text-xs text-white/40">
              You haven&apos;t registered for any festival events or competitions yet.
            </p>
            <Link
              href="/events?view=directory"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-200"
            >
              Explore Events Directory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {registrations.map((reg) => {
              const isConfirmed = reg.status === "CONFIRMED";
              const isReserved = reg.status === "RESERVED";
              const parsedResponses: Record<string, any> | null = (() => {
                if (!reg.form_responses) return null;
                if (typeof reg.form_responses === "object") return reg.form_responses;
                try {
                  const p = JSON.parse(reg.form_responses);
                  return typeof p === "object" && p !== null ? p : null;
                } catch {
                  return null;
                }
              })();

              return (
                <div
                  key={reg.id}
                  className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 transition hover:border-cyan-300/40"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                        {reg.day_of_event ? `DAY ${reg.day_of_event}` : "EVENT"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          isConfirmed
                            ? "bg-emerald-500/10 text-emerald-300"
                            : isReserved
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 className="h-3 w-3" />}
                        {isReserved && <Clock className="h-3 w-3" />}
                        {reg.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {reg.event_title || "Festival Event"}
                      </h3>
                      {reg.event_category && (
                        <p className="mt-0.5 text-xs text-white/50">{reg.event_category}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-white/60">
                      {reg.event_venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                          <span>{reg.event_venue}</span>
                        </div>
                      )}

                      {reg.team_name ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-cyan-300" />
                          <span>
                            Team: <strong className="text-white">{reg.team_name}</strong> ({reg.seat_count} seats)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-cyan-300" />
                          <span>Solo Participant</span>
                        </div>
                      )}
                    </div>

                    {parsedResponses && Object.keys(parsedResponses).length > 0 && (
                      <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs">
                        <p className="font-semibold text-white/70">Custom Questionnaire Answers:</p>
                        <div className="mt-2 space-y-1">
                          {Object.entries(parsedResponses).map(([key, val]) => (
                            <div key={key} className="flex justify-between gap-2 text-white/50">
                              <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                              <span className="font-medium text-white/80 text-right break-all">
                                {String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className="font-mono text-[11px] text-white/30">
                      ID: {reg.id.slice(0, 16)}...
                    </span>

                    <div className="flex items-center gap-2">
                      {reg.team_id && (
                        <Link
                          href={`/teams/${reg.team_id}`}
                          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                        >
                          Team Roster
                        </Link>
                      )}
                      <Link
                        href="/me/tickets"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-300/20"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Passes
                      </Link>
                    </div>
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
