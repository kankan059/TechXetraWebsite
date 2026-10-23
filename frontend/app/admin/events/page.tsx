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
  Calendar,
  DollarSign,
  Gamepad2,
  ClipboardList,
  X,
  Loader2,
  ShieldAlert,
  Info,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import FormSchemaBuilder from "@/components/staff/FormSchemaBuilder";
import type {
  AdminEvent,
  AdminUser,
  EventCategory,
  EventStatus,
  PriceModel,
  CapacityUnit,
  FormFieldDefinition,
  ScoringStatus,
} from "@/types/api";

function toDatetimeLocal(ms: number | null | undefined): string {
  if (!ms) return "";
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function fromDatetimeLocal(val: string): number | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export default function AdminEventsPage() {
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
  const [assignedStaffList, setAssignedStaffList] = useState<
    Array<{ user_id: string; role: "LEAD" | "VOLUNTEER"; name: string; email: string }>
  >([]);
  const [loadingStaffList, setLoadingStaffList] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("LEAD");
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Reopen Scores Modal State
  const [reopenEvent, setReopenEvent] = useState<AdminEvent | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [submittingReopen, setSubmittingReopen] = useState(false);

  // Delete Modal State
  const [deleteEvent, setDeleteEvent] = useState<AdminEvent | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Edit Event Modal State (Full Super Admin Multi-tab Editor)
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [editTab, setEditTab] = useState<"BASIC" | "PRICING" | "ESPORTS" | "FORM">("BASIC");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Edit Tab 1: Basic
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCategory, setEditCategory] = useState<EventCategory>("TECHNICAL");
  const [editDay, setEditDay] = useState(1);
  const [editVenue, setEditVenue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("OPEN");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editRegistrationClosesAt, setEditRegistrationClosesAt] = useState("");

  // Edit Tab 2: Pricing & Team
  const [editIsTeam, setEditIsTeam] = useState(false);
  const [editMinTeam, setEditMinTeam] = useState(1);
  const [editMaxTeam, setEditMaxTeam] = useState(1);
  const [editPriceModel, setEditPriceModel] = useState<PriceModel>("FREE");
  const [editPriceRupees, setEditPriceRupees] = useState("");
  const [editStudentPriceRupees, setEditStudentPriceRupees] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editCapacityUnit, setEditCapacityUnit] = useState<CapacityUnit>("SEATS");

  // Edit Tab 3: E-Sports
  const [editScoringEnabled, setEditScoringEnabled] = useState(false);
  const [editScoringStatus, setEditScoringStatus] = useState<ScoringStatus>("NOT_APPLICABLE");
  const [editMaxRounds, setEditMaxRounds] = useState(1);
  const [editVolunteersCanScore, setEditVolunteersCanScore] = useState(true);
  const [editLeaderboardPublic, setEditLeaderboardPublic] = useState(true);

  // Edit Tab 4: Form Schema
  const [editFormSchema, setEditFormSchema] = useState<FormFieldDefinition[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [eventsRes, usersRes] = await Promise.all([
        adminApi.events.list({ limit: 50 }),
        adminApi.users.list({ limit: 50 }).catch(() => ({ users: [], next_cursor: null })),
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

  const handleOpenAssignStaff = async (evt: AdminEvent) => {
    setAssignEvent(evt);
    setAssignUserId("");
    setAssignRole("LEAD");
    setLoadingStaffList(true);
    try {
      const list = await adminApi.events.listStaff(evt.id);
      setAssignedStaffList(list || []);
    } catch {
      setAssignedStaffList([]);
    } finally {
      setLoadingStaffList(false);
    }
  };

  const handleRemoveAssignedStaff = async (userId: string) => {
    if (!assignEvent) return;
    setRemovingUserId(userId);
    try {
      await adminApi.events.removeStaff(assignEvent.id, userId);
      setAssignedStaffList((prev) => prev.filter((s) => s.user_id !== userId));
      setSuccess("Staff member removed from event.");
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove staff member");
    } finally {
      setRemovingUserId(null);
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
      const updatedList = await adminApi.events.listStaff(assignEvent.id);
      setAssignedStaffList(updatedList || []);
      setAssignUserId("");
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

  const handleDeleteEvent = async () => {
    if (!deleteEvent) return;

    setSubmittingDelete(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminApi.events.delete(deleteEvent.id);
      setSuccess(res.message || "Event deletion processed successfully.");
      setDeleteEvent(null);
      void loadEvents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handleOpenEdit = (evt: AdminEvent) => {
    setEditingEvent(evt);
    setEditTab("BASIC");
    setEditTitle(evt.title);
    setEditSlug(evt.slug);
    setEditCategory(evt.category);
    setEditDay(evt.day_of_event || (evt as any).festDay || 1);
    setEditVenue(evt.venue || "");
    setEditDescription(evt.description || "");
    setEditStatus(evt.status);
    setEditStartsAt(toDatetimeLocal(evt.starts_at));
    setEditEndsAt(toDatetimeLocal(evt.ends_at));
    setEditRegistrationClosesAt(toDatetimeLocal(evt.registration_closes_at));

    setEditIsTeam(Boolean(evt.is_team_event));
    setEditMinTeam(evt.min_team_size || 1);
    setEditMaxTeam(evt.max_team_size || 1);
    setEditPriceModel(evt.price_model || "FREE");
    setEditPriceRupees(evt.price_paise ? (evt.price_paise / 100).toString() : "0");
    setEditStudentPriceRupees(
      evt.student_price_paise !== null && evt.student_price_paise !== undefined
        ? (evt.student_price_paise / 100).toString()
        : ""
    );
    setEditCapacity(
      evt.capacity !== null && evt.capacity !== undefined ? evt.capacity.toString() : ""
    );
    setEditCapacityUnit(evt.capacity_unit || (evt.is_team_event ? "TEAMS" : "SEATS"));

    setEditScoringEnabled(Boolean(evt.scoring_enabled));
    setEditScoringStatus(
      (evt as any).scoring_status ||
        (evt.category === "E_SPORTS" ? "OPEN" : "NOT_APPLICABLE")
    );
    setEditMaxRounds((evt as any).max_rounds || 1);
    setEditVolunteersCanScore((evt as any).volunteers_can_score !== false);
    setEditLeaderboardPublic(evt.leaderboard_public !== false);

    if (evt.form_schema) {
      try {
        const parsed = JSON.parse(evt.form_schema);
        setEditFormSchema(Array.isArray(parsed) ? parsed : []);
      } catch {
        setEditFormSchema([]);
      }
    } else {
      setEditFormSchema([]);
    }
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setSubmittingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const pricePaise = editPriceRupees ? Math.round(parseFloat(editPriceRupees) * 100) : 0;
      const studentPricePaise = editStudentPriceRupees
        ? Math.round(parseFloat(editStudentPriceRupees) * 100)
        : null;

      const payload: Record<string, any> = {
        title: editTitle.trim(),
        slug: editSlug.trim().toLowerCase(),
        category: editCategory,
        day_of_event: Number(editDay),
        venue: editVenue.trim() || null,
        description: editDescription.trim() || null,
        status: editStatus,
        starts_at: fromDatetimeLocal(editStartsAt),
        ends_at: fromDatetimeLocal(editEndsAt),
        registration_closes_at: fromDatetimeLocal(editRegistrationClosesAt),
        is_team_event: editIsTeam,
        min_team_size: editIsTeam ? Number(editMinTeam) : 1,
        max_team_size: editIsTeam ? Number(editMaxTeam) : 1,
        price_model: editPriceModel,
        price_paise: pricePaise,
        student_price_paise: studentPricePaise,
        capacity: editCapacity ? Number(editCapacity) : null,
        capacity_unit: editCapacityUnit,
        scoring_enabled: editCategory === "E_SPORTS" ? editScoringEnabled : false,
        form_schema: editFormSchema.length > 0 ? JSON.stringify(editFormSchema) : null,
      };

      if (editCategory === "E_SPORTS") {
        payload.scoring_status = editScoringStatus;
        payload.max_rounds = Number(editMaxRounds);
        payload.volunteers_can_score = editVolunteersCanScore;
        payload.leaderboard_public = editLeaderboardPublic;
      }

      await adminApi.events.fullUpdate(editingEvent.id, payload);

      setSuccess(`Event "${editTitle}" updated successfully!`);
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
            Create festival events, configure dynamic forms, assign referee leads/volunteers, and manage safe deletion.
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
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
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

                    <td className="px-5 py-4 text-slate-300">Day {evt.day_of_event || (evt as any).festDay}</td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {evt.is_team_event
                        ? `Team (${evt.min_team_size}–${evt.max_team_size})`
                        : "Solo"}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-white">
                      {evt.price_model === "FREE"
                        ? "FREE"
                        : `₹${((evt.price_paise || (evt as any).pricePaise || 0) / 100).toFixed(0)} (${evt.price_model})`}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          evt.status === "OPEN"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : evt.status === "CLOSED"
                            ? "bg-amber-400/10 text-amber-300"
                            : evt.status === "CANCELLED"
                            ? "bg-red-400/10 text-red-300"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {evt.seats_taken || 0} / {evt.capacity || "∞"} {evt.capacity_unit || "SEATS"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(evt)}
                          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
                          title="Full Event Editor"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Assign Staff Button */}
                        <button
                          type="button"
                          onClick={() => void handleOpenAssignStaff(evt)}
                          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-300"
                          title="Assign / Manage Staff"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>

                        {/* Reopen Scores (E-sports only) */}
                        {evt.category === "E_SPORTS" && (
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

                        {/* Safe Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteEvent(evt)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20"
                          title="Safe Delete / Cancel Event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
            <h2 className="text-lg font-bold text-white">Create New Event</h2>
            <p className="mt-1 text-xs text-slate-400">
              Add a new competition, workshop, or esports tournament to the festival catalog.
            </p>

            <form onSubmit={handleCreateEvent} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Slug <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    placeholder="e.g. valorant-championship"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Valorant Championship"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value as EventCategory)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="CULTURAL">CULTURAL</option>
                    <option value="E_SPORTS">E_SPORTS</option>
                    <option value="SPORTS">SPORTS</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                    <option value="LITERARY">LITERARY</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Day of Event</label>
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
                  id="createIsTeam"
                  checked={createIsTeam}
                  onChange={(e) => setCreateIsTeam(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-[#55DFFF]"
                />
                <label htmlFor="createIsTeam" className="text-xs text-slate-300">
                  This is a team event
                </label>
              </div>

              {createIsTeam && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Min Team Size</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={createMinTeam}
                      onChange={(e) => setCreateMinTeam(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Max Team Size</label>
                    <input
                      type="number"
                      min={createMinTeam}
                      max={20}
                      value={createMaxTeam}
                      onChange={(e) => setCreateMaxTeam(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Price Model</label>
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
                  <label className="text-xs font-medium text-slate-300">Capacity Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={createCapacity}
                    onChange={(e) => setCreateCapacity(e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              {createPriceModel !== "FREE" && (
                <div>
                  <label className="text-xs font-medium text-slate-300">Fee in Paise</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={createPricePaise}
                    onChange={(e) => setCreatePricePaise(Number(e.target.value))}
                    placeholder="e.g. 20000 for ₹200"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
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
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingCreate ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN / MANAGE STAFF MODAL */}
      {assignEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Staff Committee Roster</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Manage assigned Leads and Volunteers for &quot;{assignEvent.title}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignEvent(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Currently assigned staff list */}
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Currently Assigned Staff ({assignedStaffList.length}):
              </p>
              {loadingStaffList ? (
                <div className="py-6 text-center text-xs text-white/40">
                  <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-cyan-400" />
                  Loading assigned staff...
                </div>
              ) : assignedStaffList.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                  No staff members currently assigned to this event.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignedStaffList.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{m.name}</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                              m.role === "LEAD"
                                ? "bg-purple-400/20 text-purple-300"
                                : "bg-cyan-400/20 text-cyan-300"
                            }`}
                          >
                            {m.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50">{m.email}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleRemoveAssignedStaff(m.user_id)}
                        disabled={removingUserId === m.user_id}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50"
                      >
                        {removingUserId === m.user_id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign new staff form */}
            <form onSubmit={handleAssignStaff} className="border-t border-white/10 pt-4 space-y-4">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Assign New Committee Member:
              </p>

              <div>
                <label className="text-xs font-medium text-slate-300">Select User</label>
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
                  <option value="LEAD">LEAD (Full payment verification & settings)</option>
                  <option value="VOLUNTEER">VOLUNTEER (Check-in & scoring entries)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignEvent(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !assignUserId}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingAssign ? "Assigning..." : "Assign Staff Member"}
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

      {/* SAFE DELETE EVENT MODAL */}
      {deleteEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#0C1017] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Delete or Cancel Event</h2>
                <p className="text-xs text-white/50">{deleteEvent.title}</p>
              </div>
            </div>

            {/* Invariant Explanation Banner */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1">
              <p className="font-semibold text-amber-300">Safe Deletion Policy:</p>
              <p className="text-white/80">
                Notice: If attendees have already registered or purchased tickets for this event, the event will <strong>NOT</strong> be erased. It will be gracefully cancelled to preserve participant tickets and financial history.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-1">
              <div className="flex justify-between text-white/60">
                <span>Event Slug:</span>
                <span className="font-mono text-cyan-300">{deleteEvent.slug}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Allocated Registrations:</span>
                <span className="font-bold text-white">{deleteEvent.seats_taken || 0}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteEvent(null)}
                disabled={submittingDelete}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteEvent()}
                disabled={submittingDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-50"
              >
                {submittingDelete ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Delete or Cancel Event"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SUPER ADMIN EDIT MODAL */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#0C1017] p-6 sm:p-8 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  SUPER ADMIN CONTROLS
                </span>
                <h2 className="mt-1 text-xl font-bold text-white">
                  Edit &quot;{editingEvent.title}&quot;
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="rounded-xl border border-white/10 p-2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Multi-Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-white/10 py-3 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setEditTab("BASIC")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  editTab === "BASIC"
                    ? "bg-[#55DFFF] text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>1. Basic Info & Dates</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab("PRICING")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  editTab === "PRICING"
                    ? "bg-[#55DFFF] text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>2. Pricing & Capacity</span>
              </button>

              {editCategory === "E_SPORTS" && (
                <button
                  type="button"
                  onClick={() => setEditTab("ESPORTS")}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
                    editTab === "ESPORTS"
                      ? "bg-[#55DFFF] text-black font-bold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>3. E-Sports Scoring</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditTab("FORM")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
                  editTab === "FORM"
                    ? "bg-[#55DFFF] text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>4. Dynamic Form ({editFormSchema.length})</span>
              </button>
            </div>

            {/* Scrollable Tab Body */}
            <form onSubmit={handleEditEventSubmit} className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
              {/* TAB 1: BASIC INFO */}
              {editTab === "BASIC" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Title</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Slug</label>
                      <input
                        type="text"
                        required
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as EventCategory)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="TECHNICAL">TECHNICAL</option>
                        <option value="CULTURAL">CULTURAL</option>
                        <option value="E_SPORTS">E_SPORTS</option>
                        <option value="SPORTS">SPORTS</option>
                        <option value="MANAGEMENT">MANAGEMENT</option>
                        <option value="LITERARY">LITERARY</option>
                        <option value="WORKSHOP">WORKSHOP</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Day</label>
                      <select
                        value={editDay}
                        onChange={(e) => setEditDay(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value={1}>Day 1</option>
                        <option value={2}>Day 2</option>
                        <option value={3}>Day 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Status</label>
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
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Starts At</label>
                      <input
                        type="datetime-local"
                        value={editStartsAt}
                        onChange={(e) => setEditStartsAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Ends At</label>
                      <input
                        type="datetime-local"
                        value={editEndsAt}
                        onChange={(e) => setEditEndsAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Registration Closes At</label>
                      <input
                        type="datetime-local"
                        value={editRegistrationClosesAt}
                        onChange={(e) => setEditRegistrationClosesAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Venue</label>
                    <input
                      type="text"
                      value={editVenue}
                      onChange={(e) => setEditVenue(e.target.value)}
                      placeholder="e.g. Indoor Stadium - Court 1"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                    />
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
                </div>
              )}

              {/* TAB 2: PRICING & CAPACITY */}
              {editTab === "PRICING" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editIsTeam"
                      checked={editIsTeam}
                      onChange={(e) => setEditIsTeam(e.target.checked)}
                      className="rounded border-white/20 bg-white/10 text-[#55DFFF]"
                    />
                    <label htmlFor="editIsTeam" className="text-xs font-semibold text-white">
                      Team Event Format
                    </label>
                  </div>

                  {editIsTeam && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-300">Min Team Size</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editMinTeam}
                          onChange={(e) => setEditMinTeam(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300">Max Team Size</label>
                        <input
                          type="number"
                          min={editMinTeam}
                          max={20}
                          value={editMaxTeam}
                          onChange={(e) => setEditMaxTeam(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Price Model</label>
                      <select
                        value={editPriceModel}
                        onChange={(e) => setEditPriceModel(e.target.value as PriceModel)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PER_PARTICIPANT">PER_PARTICIPANT</option>
                        <option value="PER_TEAM">PER_TEAM</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">General Fee (₹ Rupees)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={editPriceRupees}
                        onChange={(e) => setEditPriceRupees(e.target.value)}
                        placeholder="e.g. 200"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Student Discount (₹ Rupees)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={editStudentPriceRupees}
                        onChange={(e) => setEditStudentPriceRupees(e.target.value)}
                        placeholder="Optional"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Capacity Limit</label>
                      <input
                        type="number"
                        min={1}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        placeholder="Leave empty for unlimited"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300">Capacity Unit</label>
                      <select
                        value={editCapacityUnit}
                        onChange={(e) => setEditCapacityUnit(e.target.value as CapacityUnit)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="SEATS">SEATS</option>
                        <option value="TEAMS">TEAMS</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: E-SPORTS */}
              {editTab === "ESPORTS" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editScoringEnabled"
                      checked={editScoringEnabled}
                      onChange={(e) => setEditScoringEnabled(e.target.checked)}
                      className="rounded border-white/20 bg-white/10 text-[#55DFFF]"
                    />
                    <label htmlFor="editScoringEnabled" className="text-xs font-semibold text-white">
                      Enable Tournament Scoring
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300">Scoring Status</label>
                      <select
                        value={editScoringStatus}
                        onChange={(e) => setEditScoringStatus(e.target.value as ScoringStatus)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="OPEN">OPEN (Referees can enter scores)</option>
                        <option value="FINALIZED">FINALIZED (Locked to editing)</option>
                        <option value="NOT_APPLICABLE">NOT_APPLICABLE</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300">Max Rounds</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={editMaxRounds}
                        onChange={(e) => setEditMaxRounds(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editVolunteersCanScore}
                        onChange={(e) => setEditVolunteersCanScore(e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-[#55DFFF]"
                      />
                      <span>Allow Volunteers to submit scores (otherwise Leads only)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={editLeaderboardPublic}
                        onChange={(e) => setEditLeaderboardPublic(e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-[#55DFFF]"
                      />
                      <span>Public Leaderboard visible to festival audience</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: FORM BUILDER */}
              {editTab === "FORM" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Configure custom dynamic questions that attendees must answer when registering for this competition.
                  </p>
                  <FormSchemaBuilder
                    schema={editFormSchema}
                    onChange={setEditFormSchema}
                    disabled={submittingEdit}
                  />
                </div>
              )}

              {/* Sticky Submit Footer */}
              <div className="sticky bottom-0 pt-4 pb-1 border-t border-white/10 bg-[#0C1017] flex justify-end gap-3">
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-5 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save All Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
