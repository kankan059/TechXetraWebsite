"use client";

import { useEffect, useState } from "react";
import { Users, AlertCircle, RefreshCw } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { EventRegistrationsReport } from "@/types/api";

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<EventRegistrationsReport>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.reports.registrations();
      setRegistrations(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRegistrations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            EVENT CAPACITY & ROSTERS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Event Registrations & Occupancy
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor confirmed attendee seat allocations and active reservation holds.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRegistrations()}
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
            Loading registration statistics...
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            No event registration data reported yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                  <th className="px-5 py-4">Event</th>
                  <th className="px-5 py-4">Day</th>
                  <th className="px-5 py-4">Confirmed Seats</th>
                  <th className="px-5 py-4">Reserved Seats</th>
                  <th className="px-5 py-4">Total Capacity</th>
                  <th className="px-5 py-4">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {registrations.map((reg) => {
                  const used = reg.confirmed_seats_count + reg.reserved_seats_count;
                  const capacity = reg.capacity || 0;
                  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;

                  return (
                    <tr key={reg.event_id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{reg.title}</p>
                        <p className="text-xs text-slate-500">{reg.category}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300">Day {reg.day_of_event}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-400">
                        {reg.confirmed_seats_count}
                      </td>
                      <td className="px-5 py-4 text-amber-300">{reg.reserved_seats_count}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {capacity > 0 ? capacity : "Unlimited"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#55DFFF]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{pct}%</span>
                        </div>
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
  );
}
