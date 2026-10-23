"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowRight, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import type { EventItem } from "@/types/api";
import { participantApi } from "@/services/participant-api";

export default function LeaderboardsIndexPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await participantApi.events.list({ category: "E_SPORTS", limit: 50 });
      const scoringEvents = (data?.events || []).filter(
        (e) => Boolean(e.scoring_enabled ?? e.scoringEnabled)
      );
      setEvents(scoringEvents.length > 0 ? scoringEvents : data?.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading leaderboards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaderboards();
  }, []);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events Directory
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              E-SPORTS & TOURNAMENTS
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Public Scoreboards & Leaderboards
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Live tournament rankings, round-by-round points, and standings.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeaderboards}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
            Loading tournament scoreboards...
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-white/40">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-white/20" />
            No public esports tournament leaderboards are currently open.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 transition hover:border-cyan-300/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      DAY {evt.day_of_event}
                    </span>
                    <span className="text-xs text-white/40">{evt.category}</span>
                  </div>

                  <h2 className="mt-3 text-xl font-bold text-white">{evt.title}</h2>
                  <p className="mt-1 text-xs text-white/50">
                    {evt.venue || "Esports Arena"}
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <Link
                    href={`/events/${evt.slug || evt.id}/leaderboard`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    View Live Scoreboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
