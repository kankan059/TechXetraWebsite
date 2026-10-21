"use client";

import { useEffect, useState } from "react";
import { Users, Calendar, CheckCircle2, RefreshCw } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AttendanceReport } from "@/types/api";

export default function AdminAttendancePage() {
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.reports.attendance();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendance();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            ATTENDANCE & SCAN AUDIT
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Festival & Event Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time gate admissions and event check-in records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAttendance()}
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

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
          Loading attendance metrics...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Unique Attendees Stat Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
            <p className="text-sm text-slate-400">Unique Gate Attendees Admitted</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {data.unique_gate_attendees_count}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total individual pass holders who scanned into the festival grounds.
            </p>
          </div>

          {/* Gate Admissions by Day */}
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
            <h2 className="text-base font-semibold text-white">Gate Entries by Day</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {data.gate_admissions_by_day.map((d) => (
                <div
                  key={`${d.day_number}-${d.date}`}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-xs font-semibold text-[#55DFFF]">DAY {d.day_number}</p>
                  <p className="mt-1 text-xs text-slate-400">{d.date}</p>
                  <p className="mt-3 text-2xl font-bold text-white">{d.admissions_count}</p>
                  <p className="text-[11px] text-slate-500">Total gate check-ins</p>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Event Check-ins */}
          <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
            <h2 className="text-base font-semibold text-white">Individual Event Check-ins</h2>
            {data.event_admissions.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No event check-in records logged yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-white/5">
                {data.event_admissions.map((ea) => (
                  <div
                    key={ea.event_id}
                    className="flex items-center justify-between py-3.5"
                  >
                    <div>
                      <p className="font-medium text-white">{ea.event_title}</p>
                      <p className="text-xs text-slate-500">Day {ea.day_of_event}</p>
                    </div>
                    <span className="rounded-full bg-[#55DFFF]/10 px-3 py-1 font-mono text-xs font-semibold text-[#55DFFF]">
                      {ea.admissions_count} admitted
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
