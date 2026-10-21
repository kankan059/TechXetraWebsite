"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/services/admin-api";
import type { AdminUser } from "@/types/api";

interface GateStaffRecord {
  id: string;
  user_id: string;
  user?: AdminUser;
}

export default function AdminGateStaffPage() {
  const [gateStaff, setGateStaff] = useState<GateStaffRecord[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Assign Gate Staff modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadGateStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [staffRes, usersRes] = await Promise.all([
        adminApi.gateStaff.list(),
        adminApi.users.list({ limit: 100 }).catch(() => ({ users: [], next_cursor: null })),
      ]);

      setGateStaff(staffRes.gate_staff || []);
      setUsers(usersRes.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load gate staff roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGateStaff();
  }, [loadGateStaff]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.gateStaff.assign({ user_id: selectedUserId });
      setSuccess("Staff member successfully assigned to festival gates!");
      setShowAssignModal(false);
      setSelectedUserId("");
      void loadGateStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not assign gate staff");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Remove ${userName || "this user"} from gate scanning permissions?`)) return;

    setError(null);
    setSuccess(null);

    try {
      await adminApi.gateStaff.remove(userId);
      setSuccess("Gate staff authorization revoked.");
      void loadGateStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke gate staff assignment");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            ACCESS CONTROL & SECURITY
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Gate Staff Crew Assignments
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Designate authorized volunteers and leads permitted to operate the Gate Ticket Scanner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/scan"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Launch Gate Scanner
          </Link>

          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#55DFFF]/90"
          >
            <UserPlus className="h-4 w-4" />
            Assign Gate Staff
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

      {/* Staff Roster Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
            Loading assigned gate staff...
          </div>
        ) : gateStaff.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-white/20" />
            No gate staff volunteers currently assigned. Click &quot;Assign Gate Staff&quot; above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                  <th className="px-5 py-3">Volunteer / Staff Member</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Institution / ID</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {gateStaff.map((gs) => {
                  const staffUser = gs.user;
                  const displayName = staffUser?.name || "Staff Member";
                  const displayEmail = staffUser?.email || gs.user_id;

                  return (
                    <tr key={gs.id || gs.user_id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{displayName}</p>
                        <p className="text-xs text-slate-400">{displayEmail}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-[#55DFFF]">
                          {staffUser?.role || "VOLUNTEER"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {staffUser?.institution_name
                          ? `${staffUser.institution_name} (${staffUser.institution_id || "N/A"})`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(gs.user_id, displayName)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Authorize Gate Staff Volunteer</h2>
            <p className="mt-1 text-xs text-slate-400">
              Select a volunteer or lead to authorize gate scanner operations.
            </p>

            <form onSubmit={handleAssign} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Select Staff User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="" className="bg-[#0C1017]">
                    -- Choose volunteer or lead --
                  </option>
                  {users
                    .filter((u) => u.role === "VOLUNTEER" || u.role === "LEAD" || u.role === "SUPER_ADMIN")
                    .map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#0C1017]">
                        {u.name} ({u.email}) — {u.role}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedUserId}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {assigning ? "Authorizing..." : "Authorize Gate Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
