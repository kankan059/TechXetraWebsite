"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  AlertCircle,
  RefreshCw,
  XCircle,
  UserCheck,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { EventRegistrationsReport } from "@/types/api";

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<EventRegistrationsReport>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cancel Registration Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [targetRegId, setTargetRegId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Replace Member Modal State
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceRegId, setReplaceRegId] = useState("");
  const [oldUserId, setOldUserId] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [submittingReplace, setSubmittingReplace] = useState(false);

  const loadRegistrations = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const handleCancelRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRegId.trim()) return;

    setSubmittingCancel(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.registrations.cancel(targetRegId.trim(), {
        reason: cancelReason.trim() || undefined,
      });

      setSuccess(`Registration ${targetRegId} cancelled and reserved seats released!`);
      setShowCancelModal(false);
      setTargetRegId("");
      setCancelReason("");
      void loadRegistrations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel registration");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleReplaceMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceRegId.trim() || !oldUserId.trim() || !newUserId.trim()) return;

    setSubmittingReplace(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.registrations.replaceMember(replaceRegId.trim(), {
        old_participant_id: oldUserId.trim(),
        new_participant_id: newUserId.trim(),
        reason: replaceReason.trim() || undefined,
      });

      setSuccess(`Member replaced in registration ${replaceRegId}! Ticket reissued.`);
      setShowReplaceModal(false);
      setReplaceRegId("");
      setOldUserId("");
      setNewUserId("");
      setReplaceReason("");
      void loadRegistrations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to substitute team member");
    } finally {
      setSubmittingReplace(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            EVENT CAPACITY & ROSTERS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Event Registrations & Occupancy
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor confirmed attendee seat allocations, active reservation holds, and administrative overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadRegistrations()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowReplaceModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <UserCheck className="h-4 w-4" />
            Substitute Member
          </button>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            <XCircle className="h-4 w-4" />
            Cancel Registration
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Capacity & Occupancy Table */}
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
            <table className="w-full min-w-[750px] text-left text-sm">
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

      {/* CANCEL REGISTRATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Cancel Event Registration</h2>
            <p className="mt-1 text-xs text-slate-400">
              Revokes associated passes, releases held seats, and cancels the registration record.
            </p>

            <form onSubmit={handleCancelRegistration} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Registration UUID</label>
                <input
                  type="text"
                  value={targetRegId}
                  onChange={(e) => setTargetRegId(e.target.value)}
                  placeholder="reg_..."
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Reason for Cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Participant withdrew from festival"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel || !targetRegId.trim()}
                  className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {submittingCancel ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLACE MEMBER MODAL */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Substitute Team Member</h2>
            <p className="mt-1 text-xs text-slate-400">
              Replaces a member in a team registration and reissues the ticket to the substitute attendee.
            </p>

            <form onSubmit={handleReplaceMember} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Registration UUID</label>
                <input
                  type="text"
                  value={replaceRegId}
                  onChange={(e) => setReplaceRegId(e.target.value)}
                  placeholder="reg_..."
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Current User ID</label>
                  <input
                    type="text"
                    value={oldUserId}
                    onChange={(e) => setOldUserId(e.target.value)}
                    placeholder="usr_old"
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Substitute User ID</label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="usr_new"
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Audit Reason</label>
                <textarea
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Medical emergency substitution approved by fest director"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingReplace || !replaceRegId || !oldUserId || !newUserId}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingReplace ? "Replacing..." : "Substitute Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
