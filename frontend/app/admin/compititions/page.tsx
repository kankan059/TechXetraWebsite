"use client";

import { useEffect, useState } from "react";
import { Trophy, RefreshCw, AlertCircle, Plus, Users } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminEvent } from "@/types/api";

export default function AdminCompetitionsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.events.list({ limit: 100 });
      setEvents(res.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            EVENT DIRECTORY & CONFIGURATION
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Competitions & Events
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View all festival events, team requirements, pricing tiers, and registration states.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
            Loading festival events...
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            No events registered in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Day</th>
                  <th className="px-5 py-3">Format</th>
                  <th className="px-5 py-3">Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {events.map((evt) => (
                  <tr key={evt.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{evt.title}</p>
                      <p className="font-mono text-xs text-slate-500">{evt.slug}</p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-slate-300">
                        {evt.category}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">Day {evt.day_of_event}</td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {evt.is_team_event
                        ? `Team (${evt.min_team_size}–${evt.max_team_size})`
                        : "Solo"}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-white">
                      {evt.price_model === "FREE"
                        ? "FREE"
                        : `₹${(evt.price_paise / 100).toFixed(0)} (${evt.price_model})`}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          evt.status === "OPEN"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : evt.status === "CLOSED"
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {evt.seats_taken} / {evt.capacity || "∞"} {evt.capacity_unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
