"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, RefreshCw, AlertCircle, Medal } from "lucide-react";
import type { LeaderboardResponse, LeaderboardEntry } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function EventLeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(slug)}/leaderboard`, {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Scoreboard unavailable for this event");
      }

      setData(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeaderboard();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold">Scoreboard Not Available</h1>
          <p className="mt-2 text-sm text-white/50">{error || "Leaderboard not found."}</p>
          <Link
            href="/leaderboards"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← View All Leaderboards
          </Link>
        </div>
      </main>
    );
  }

  const { event, leaderboard } = data;
  const maxRounds = event.max_rounds || 5;
  const roundNumbers = Array.from({ length: maxRounds }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/leaderboards"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All Leaderboards
          </Link>

          <button
            type="button"
            onClick={loadLeaderboard}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Live Refresh
          </button>
        </div>

        {/* Title Header */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              {event.category} TOURNAMENT
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              Status: {event.scoring_status}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">{event.title}</h1>
          <p className="mt-1 text-xs text-white/50">
            Real-time tournament score matrix with tie-breaker rank calculations.
          </p>
        </div>

        {/* Scoreboard Table */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c121d]">
          {leaderboard.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/40">
              No participant scores entered yet. Matches will begin shortly.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                    <th className="px-5 py-4">Rank</th>
                    <th className="px-5 py-4">Team / Participant</th>
                    {roundNumbers.map((r) => (
                      <th key={r} className="px-3 py-4 text-center">
                        R{r}
                      </th>
                    ))}
                    <th className="px-5 py-4 text-right font-bold text-cyan-300">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.registration_id}
                      className={`transition hover:bg-white/[0.02] ${
                        entry.rank === 1 ? "bg-amber-400/[0.03]" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-bold">
                        <div className="flex items-center gap-2">
                          {entry.rank === 1 && <Medal className="h-4 w-4 text-amber-400" />}
                          {entry.rank === 2 && <Medal className="h-4 w-4 text-slate-300" />}
                          {entry.rank === 3 && <Medal className="h-4 w-4 text-amber-600" />}
                          <span>#{entry.rank}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{entry.display_name}</p>
                        {entry.team_name && (
                          <p className="text-xs text-slate-400">Team: {entry.team_name}</p>
                        )}
                      </td>

                      {roundNumbers.map((r) => (
                        <td key={r} className="px-3 py-4 text-center font-mono text-xs text-slate-300">
                          {entry.round_scores?.[r] !== undefined ? entry.round_scores[r] : "—"}
                        </td>
                      ))}

                      <td className="px-5 py-4 text-right font-mono text-base font-extrabold text-cyan-300">
                        {entry.total_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
