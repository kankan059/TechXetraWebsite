"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  RefreshCw,
  AlertCircle,
  Plus,
  Users,
  CheckCircle2,
  Lock,
  Unlock,
  Edit2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminEvent, AdminUser, EventCategory, EventStatus, PriceModel, CapacityUnit } from "@/types/api";

export default function AdminCompetitionsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState<EventCategory>("TECHNICAL");
  const [createDay, setCreateDay] = useState(1);
  const [createIsTeam, setCreateIsTeam] = useState(false);
  const [createMinTeam, setCreateMinTeam] = useState(1);
  const [createMaxTeam, setCreateMaxTeam] = useState(1);
  const [createPriceModel, setCreatePriceModel] = useState<PriceModel>("FREE");
  const [createPricePaise, setCreatePricePaise] = useState(0);
  const [createCapacity, setCreateCapacity] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Assign Staff Modal State
  const [assignEvent, setAssignEvent] = useState<AdminEvent | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("LEAD");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Reopen Scores Modal State
  const [reopenEvent, setReopenEvent] = useState<AdminEvent | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [submittingReopen, setSubmittingReopen] = useState(false);

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [editVenue, setEditVenue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("OPEN");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [eventsRes, usersRes] = await Promise.all([
        adminApi.events.list({ limit: 100 }),
        adminApi.users.list({ limit: 100 }).catch(() => ({ users: [], next_cursor: null })),
      ]);
      setEvents(eventsRes.events || []);
      setUsers(usersRes.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
  }, [loadEvents]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSlug.trim() || !createTitle.trim()) return;

    setSubmittingCreate(true);
    setError(null);
    setSuccess(null);

    try {
      const now = Date.now();
      await adminApi.events.create({
        slug: createSlug.trim().toLowerCase(),
        title: createTitle.trim(),
        category: createCategory,
        day_of_event: Number(createDay),
        starts_at: now + 86400000,
        ends_at: now + 86400000 * 2,
        status: "OPEN",
        is_team_event: createIsTeam,
        min_team_size: createIsTeam ? Number(createMinTeam) : 1,
        max_team_size: createIsTeam ? Number(createMaxTeam) : 1,
        price_model: createPriceModel,
        price_paise: Number(createPricePaise),
        capacity: createCapacity ? Number(createCapacity) : null,
        capacity_unit: createIsTeam ? "TEAMS" : "SEATS",
        scoring_enabled: createCategory === "E_SPORTS",
        scoring_status: createCategory === "E_SPORTS" ? "OPEN" : "NOT_APPLICABLE",
      });

      setSuccess(`Event "${createTitle}" created successfully!`);
      setShowCreateModal(false);
      setCreateSlug("");
      setCreateTitle("");
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEvent || !assignUserId) return;

    setSubmittingAssign(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.events.assignStaff(assignEvent.id, {
        user_id: assignUserId,
        role: assignRole,
      });

      setSuccess(`Staff assigned to "${assignEvent.title}"!`);
      setAssignEvent(null);
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign staff to event");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleReopenScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenEvent) return;

    setSubmittingReopen(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.events.reopenScores(reopenEvent.id);
      setSuccess(`Scores for "${reopenEvent.title}" reopened for editing!`);
      setReopenEvent(null);
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reopen scoring");
    } finally {
      setSubmittingReopen(false);
    }
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.events.update(editingEvent.id, {
        venue: editVenue.trim() || null,
        description: editDescription.trim() || null,
        status: editStatus,
      });

      setSuccess(`Event "${editingEvent.title}" updated successfully!`);
      setEditingEvent(null);
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            EVENT DIRECTORY & CONFIGURATION
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Competitions & Events
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create festival events, assign referee leads/volunteers, update venues, and manage e-sports scoring status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#55DFFF]/90"
          >
            <Plus className="h-4 w-4" />
            Create Event
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

      {/* Events Table */}
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Day</th>
                  <th className="px-5 py-3">Format</th>
                  <th className="px-5 py-3">Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Capacity</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {events.map((evt) => (
                  <tr key={evt.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{evt.title}</p>
                      <p className="font-mono text-xs text-slate-500">{evt.slug}</p>
                      {evt.venue && (
                        <p className="mt-0.5 text-[11px] text-slate-400">📍 {evt.venue}</p>
                      )}
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

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(evt);
                            setEditVenue(evt.venue || "");
                            setEditDescription(evt.description || "");
                            setEditStatus(evt.status);
                          }}
                          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
                          title="Edit Event"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignEvent(evt);
                            setAssignUserId("");
                            setAssignRole("LEAD");
                          }}
                          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
                          title="Assign Staff"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>

                        {evt.category === "E_SPORTS" &&  (
                          <button
                            type="button"
                            onClick={() => {
                              setReopenEvent(evt);
                              setReopenReason("");
                            }}
                            className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-amber-300 hover:bg-amber-500/20"
                            title="Reopen Scores"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create New Festival Event</h2>
            <p className="mt-1 text-xs text-slate-400">
              Add a competition, hackathon, workshop, or esports tournament.
            </p>

            <form onSubmit={handleCreateEvent} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Event Title</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
                    placeholder="e.g. Robo Wars Heavyweight"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Slug URL</label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    required
                    placeholder="robo-wars-heavyweight"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as EventCategory)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="E_SPORTS">E_SPORTS</option>
                    <option value="CULTURAL">CULTURAL</option>
                    <option value="SPORTS">SPORTS</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                    <option value="LITERARY">LITERARY</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Festival Day</label>
                  <select
                    value={createDay}
                    onChange={(e) => setCreateDay(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value={1}>Day 1</option>
                    <option value={2}>Day 2</option>
                    <option value={3}>Day 3</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_team"
                  checked={createIsTeam}
                  onChange={(e) => setCreateIsTeam(e.target.checked)}
                  className="rounded border-white/10"
                />
                <label htmlFor="is_team" className="text-slate-300 font-medium">
                  Team-based event
                </label>
              </div>

              {createIsTeam && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium">Min Team Size</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={createMinTeam}
                      onChange={(e) => setCreateMinTeam(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium">Max Team Size</label>
                    <input
                      type="number"
                      min={createMinTeam}
                      max={50}
                      value={createMaxTeam}
                      onChange={(e) => setCreateMaxTeam(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium">Pricing Model</label>
                  <select
                    value={createPriceModel}
                    onChange={(e) => setCreatePriceModel(e.target.value as PriceModel)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PER_PARTICIPANT">PER_PARTICIPANT</option>
                    <option value="PER_TEAM">PER_TEAM</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium">Price (Paise)</label>
                  <input
                    type="number"
                    value={createPricePaise}
                    onChange={(e) => setCreatePricePaise(Number(e.target.value))}
                    disabled={createPriceModel === "FREE"}
                    placeholder="e.g. 50000 (₹500)"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Max Capacity (Leave blank for unlimited)</label>
                <input
                  type="number"
                  value={createCapacity}
                  onChange={(e) => setCreateCapacity(e.target.value)}
                  placeholder="e.g. 32"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="rounded-xl bg-[#55DFFF] px-5 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingCreate ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN STAFF MODAL */}
      {assignEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Assign Staff to Event</h2>
            <p className="mt-1 text-xs text-slate-400">
              Assign a lead or volunteer to supervise &quot;{assignEvent.title}&quot;.
            </p>

            <form onSubmit={handleAssignStaff} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Staff User</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="" className="bg-[#0C1017]">-- Select user --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#0C1017]">
                      {u.name} ({u.email}) — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Role in this Event</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="LEAD">LEAD (Full scoring & venue controls)</option>
                  <option value="VOLUNTEER">VOLUNTEER (Check-in & scoring entries)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignEvent(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !assignUserId}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingAssign ? "Assigning..." : "Assign Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN SCORES MODAL */}
      {reopenEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Reopen Tournament Scores</h2>
            <p className="mt-1 text-xs text-slate-400">
              Reopens finalized scoring for &quot;{reopenEvent.title}&quot; to allow referee dispute corrections.
            </p>

            <form onSubmit={handleReopenScores} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Audit Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Official referee dispute resolution: score correction for Round 3"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReopenEvent(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen || !reopenReason.trim()}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  {submittingReopen ? "Reopening..." : "Reopen Tournament"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Edit Event Details</h2>
            <p className="mt-1 text-xs text-slate-400">
              Update venue, description, or status for &quot;{editingEvent.title}&quot;.
            </p>

            <form onSubmit={handleEditEvent} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Venue</label>
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  placeholder="e.g. Indoor Sports Complex - Court 1"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Event Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
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
