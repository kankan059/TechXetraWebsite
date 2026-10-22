"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Lock,
  CalendarDays,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminUser, AdminEvent, UserRole } from "@/types/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Pre-register Modal
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [preRegEmail, setPreRegEmail] = useState("");
  const [preRegName, setPreRegName] = useState("");
  const [preRegRole, setPreRegRole] = useState<UserRole>("VOLUNTEER");
  const [preRegEventId, setPreRegEventId] = useState("");
  const [preRegCanReview, setPreRegCanReview] = useState(false);
  const [submittingPreReg, setSubmittingPreReg] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("PARTICIPANT");
  const [editEventId, setEditEventId] = useState("");
  const [editCanReview, setEditCanReview] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = { limit: "50" };
      if (roleFilter !== "ALL") params.role = roleFilter;
      if (search.trim()) params.search = search.trim();

      const [usersRes, eventsRes] = await Promise.all([
        adminApi.users.list(params),
        adminApi.events.list({ limit: 50 }).catch(() => ({ events: [], next_cursor: null })),
      ]);

      setUsers(usersRes.users || []);
      setEvents(eventsRes.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users list");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegEmail.trim() || !preRegName.trim()) return;

    setSubmittingPreReg(true);
    setError(null);
    setSuccess(null);

    try {
      const createdUser = await adminApi.users.preRegister({
        email: preRegEmail.trim().toLowerCase(),
        name: preRegName.trim(),
        role: preRegRole,
        can_review_payments: preRegCanReview,
      });

      // If an event was selected for Lead or Volunteer, assign them
      if (
        preRegEventId &&
        (preRegRole === "LEAD" || preRegRole === "VOLUNTEER") &&
        createdUser?.id
      ) {
        await adminApi.events.assignStaff(preRegEventId, {
          user_id: createdUser.id,
          role: preRegRole,
        });
      }

      setSuccess(`Staff user ${preRegEmail} pre-registered successfully!`);
      setShowPreRegModal(false);
      setPreRegEmail("");
      setPreRegName("");
      setPreRegEventId("");
      void loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pre-registration failed");
    } finally {
      setSubmittingPreReg(false);
    }
  };

  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditCanReview(Boolean(u.can_review_payments));
    setEditActive(u.is_active === 1 || u.is_active === true);
    const currentAssigned = u.event_staff_assignments?.[0]?.event_id || "";
    setEditEventId(currentAssigned);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.users.update(editingUser.id, {
        role: editRole,
        can_review_payments: editCanReview,
        is_active: editActive,
      });

      // If assigned to an event as Lead or Volunteer, persist assignment
      if (editEventId && (editRole === "LEAD" || editRole === "VOLUNTEER")) {
        await adminApi.events.assignStaff(editEventId, {
          user_id: editingUser.id,
          role: editRole,
        });
      }

      setSuccess(`User ${editingUser.name} updated successfully!`);
      setEditingUser(null);
      void loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            ACCESS CONTROL & COMMITTEE ASSIGNMENTS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            User & Staff Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Pre-register event staff, assign them to competitions, adjust permissions, and manage attendee accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowPreRegModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-4 py-2 text-sm font-semibold text-[#080B10] transition hover:bg-[#9BEAFF]"
          >
            <UserPlus className="h-4 w-4" />
            Pre-Register Staff
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Search & Role Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-white/10 bg-[#0C1017] py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-[#55DFFF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "PARTICIPANT", "VOLUNTEER", "LEAD", "SUPER_ADMIN"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                roleFilter === r
                  ? "bg-[#55DFFF] text-[#080B10] font-semibold"
                  : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            No users match the search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] font-semibold uppercase text-slate-400">
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role & Assigned Event</th>
                  <th className="px-5 py-4">Payment Reviewer</th>
                  <th className="px-5 py-4">Account Status</th>
                  <th className="px-5 py-4">Student Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => {
                  const isActive = u.is_active === 1 || u.is_active === true;
                  const assignments = u.event_staff_assignments || [];

                  return (
                    <tr key={u.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                        {u.phone && <p className="text-[10px] text-slate-500">+91 {u.phone}</p>}
                      </td>

                      {/* Role & Event Assignment */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                u.role === "SUPER_ADMIN"
                                  ? "bg-purple-400/10 text-purple-300"
                                  : u.role === "LEAD"
                                  ? "bg-blue-400/10 text-blue-300"
                                  : u.role === "VOLUNTEER"
                                  ? "bg-cyan-400/10 text-cyan-300"
                                  : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>

                          {u.role === "SUPER_ADMIN" ? (
                            <span className="text-[11px] text-purple-300/70">
                              All Events (Global Admin)
                            </span>
                          ) : assignments.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {assignments.map((a, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-medium text-cyan-300 truncate max-w-xs"
                                >
                                  📍 {a.event_title} ({a.role})
                                </span>
                              ))}
                            </div>
                          ) : u.role === "LEAD" || u.role === "VOLUNTEER" ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="text-left text-[11px] font-medium text-amber-400 hover:underline"
                            >
                              ⚠️ Unassigned (Click to assign event)
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {u.can_review_payments ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Reviewer
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                            isActive
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {u.is_student ? (
                          <div>
                            <span className="text-emerald-300">Verified Student</span>
                            {u.institution_name && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {u.institution_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">General</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Role & Event
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

      {/* Pre-Register Modal */}
      {showPreRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Pre-Register Staff Member</h3>
            <p className="mt-1 text-xs text-slate-400">
              Assign staff roles and festival competitions to an email before they sign in with Google.
            </p>

            <form onSubmit={handlePreRegister} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={preRegName}
                  onChange={(e) => setPreRegName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Google Account Email
                </label>
                <input
                  type="email"
                  required
                  value={preRegEmail}
                  onChange={(e) => setPreRegEmail(e.target.value)}
                  placeholder="volunteer@tezu.ac.in"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Staff Role
                </label>
                <select
                  value={preRegRole}
                  onChange={(e) => setPreRegRole(e.target.value as UserRole)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                >
                  <option value="VOLUNTEER">VOLUNTEER (Event Volunteer / Scanner)</option>
                  <option value="LEAD">LEAD (Event Lead / Coordinator)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                </select>
              </div>

              {/* Event assignment dropdown for Lead & Volunteer */}
              {(preRegRole === "LEAD" || preRegRole === "VOLUNTEER") && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Assigned Festival Event
                  </label>
                  <select
                    value={preRegEventId}
                    onChange={(e) => setPreRegEventId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                  >
                    <option value="">-- Select Event ({preRegRole}) --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} (Day {evt.day_of_event} • {evt.category})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Assign which event this {preRegRole.toLowerCase()} will operate and lead.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="canReview"
                  checked={preRegCanReview}
                  onChange={(e) => setPreRegCanReview(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black text-[#55DFFF] focus:ring-0"
                />
                <label htmlFor="canReview" className="text-xs text-slate-300">
                  Allow payment review queue access (`can_review_payments`)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPreRegModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPreReg}
                  className="rounded-xl bg-[#55DFFF] px-5 py-2 text-xs font-bold text-[#080B10] transition hover:bg-[#9BEAFF] disabled:opacity-50"
                >
                  {submittingPreReg ? "Saving..." : "Pre-Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit User Permissions & Event</h3>
            <p className="mt-1 text-xs text-slate-400">
              Modifying {editingUser.name} ({editingUser.email})
            </p>

            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  System Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                >
                  <option value="PARTICIPANT">PARTICIPANT</option>
                  <option value="VOLUNTEER">VOLUNTEER</option>
                  <option value="LEAD">LEAD</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              {/* Event assignment dropdown for Lead & Volunteer */}
              {(editRole === "LEAD" || editRole === "VOLUNTEER") && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400">
                    Assigned Festival Event
                  </label>
                  <select
                    value={editEventId}
                    onChange={(e) => setEditEventId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080B10] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                  >
                    <option value="">-- No specific event assigned --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} (Day {evt.day_of_event} • {evt.category})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Assigns {editingUser.name} as {editRole} for this specific competition.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editCanReviewCheck"
                  checked={editCanReview}
                  onChange={(e) => setEditCanReview(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black text-[#55DFFF] focus:ring-0"
                />
                <label htmlFor="editCanReviewCheck" className="text-xs text-slate-300">
                  Allow payment review queue access (`can_review_payments`)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black text-[#55DFFF] focus:ring-0"
                />
                <label htmlFor="editActiveCheck" className="text-xs text-slate-300">
                  Account is Active (`is_active`)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-xl bg-[#55DFFF] px-5 py-2 text-xs font-bold text-[#080B10] transition hover:bg-[#9BEAFF] disabled:opacity-50"
                >
                  {submittingEdit ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
