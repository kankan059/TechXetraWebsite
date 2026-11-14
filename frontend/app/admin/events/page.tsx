"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  Plus,
  CheckCircle2,
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
  FormFieldType,
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

const LEGACY_TYPE_MAP: Record<string, FormFieldType> = {
  text: "shortText",
  textarea: "longText",
  tel: "phone",
  url: "shortText",
  select: "singleChoice",
};

function normalizeSchema(raw: any[]): FormFieldDefinition[] {
  return raw
    .filter((f) => f && typeof f === "object")
    .map((f, idx) => {
      const { description, options, type, ...rest } = f;
      return {
        id: f.id || `field_${idx + 1}`,
        label: f.label || "Question",
        required: Boolean(f.required),
        placeholder: f.placeholder || "",
        ...rest,
        type: LEGACY_TYPE_MAP[type] ?? (type as FormFieldType) ?? "shortText",
        ...(description || f.helperText ? { helperText: f.helperText ?? description } : {}),
        ...(Array.isArray(options)
          ? {
            options: options.map((o: any) =>
              typeof o === "string" ? o : String(o?.label ?? o?.value ?? "")
            ),
          }
          : {}),
      };
    });
}

function parseFormSchema(rawSchema: unknown): FormFieldDefinition[] {
  if (!rawSchema) return [];
  if (Array.isArray(rawSchema)) {
    return normalizeSchema(rawSchema);
  }
  if (typeof rawSchema === "object" && rawSchema !== null) {
    const asObj = rawSchema as any;
    if (Array.isArray(asObj.fields)) return normalizeSchema(asObj.fields);
    if (Array.isArray(asObj.questions)) return normalizeSchema(asObj.questions);
  }
  if (typeof rawSchema === "string" && rawSchema.trim()) {
    try {
      const parsed = JSON.parse(rawSchema);
      return parseFormSchema(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Edit Tab 1: Basic
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImageURL, setEditImageURL] = useState("");
  const [editCategory, setEditCategory] = useState<EventCategory>("TECHNICAL");
  const [editDay, setEditDay] = useState(1);
  const [editVenue, setEditVenue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editStatus, setEditStatus] = useState<EventStatus>("OPEN");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editRegistrationClosesAt, setEditRegistrationClosesAt] = useState("");
  const [editWhatsappUrl, setEditWhatsappUrl] = useState("");

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

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setEditTab("BASIC");
    setSlugManuallyEdited(false);
    setEditTitle("");
    setEditSlug("");
    setEditImageURL("");
    setEditCategory("TECHNICAL");
    setEditDay(1);
    setEditVenue("");
    setEditDescription("");
    setEditRules("");
    setEditStatus("OPEN");
    setEditStartsAt("");
    setEditEndsAt("");
    setEditRegistrationClosesAt("");
    setEditWhatsappUrl("");
    setEditIsTeam(false);
    setEditMinTeam(1);
    setEditMaxTeam(1);
    setEditPriceModel("FREE");
    setEditPriceRupees("0");
    setEditStudentPriceRupees("");
    setEditCapacity("");
    setEditCapacityUnit("SEATS");
    setEditScoringEnabled(false);
    setEditScoringStatus("OPEN");
    setEditMaxRounds(1);
    setEditVolunteersCanScore(true);
    setEditLeaderboardPublic(true);
    setEditFormSchema([]);
    setError(null);
    setShowCreateModal(true);
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
    setShowCreateModal(false);
    setEditingEvent(evt);
    setEditTab("BASIC");
    setEditTitle(evt.title);
    setEditSlug(evt.slug);
    setEditImageURL(
      evt.imageUrl ||
      evt.imageURL ||
      (evt as any).image_url ||
      (evt as any).image ||
      ""
    );
    setEditCategory(evt.category);
    setEditDay(evt.festDay || evt.day_of_event || 1);
    setEditVenue(evt.venue || "");
    setEditDescription(evt.description || "");
    const eventRules = evt.rules ?? (evt as any).rules;
    setEditRules(
      Array.isArray(eventRules)
        ? eventRules.join("\n")
        : typeof eventRules === "string"
          ? eventRules
          : ""
    );
    setEditStatus(evt.status);
    setEditStartsAt(toDatetimeLocal(evt.startsAt ?? evt.starts_at));
    setEditEndsAt(toDatetimeLocal(evt.endsAt ?? evt.ends_at));
    setEditRegistrationClosesAt(
      toDatetimeLocal(evt.registrationClosesAt ?? evt.registration_closes_at)
    );
    setEditWhatsappUrl(
      evt.whatsappUrl ||
      (evt as any).whatsapp_url ||
      ""
    );

    const isTeam = Boolean(evt.isTeam ?? evt.is_team_event);
    setEditIsTeam(isTeam);
    setEditMinTeam(evt.minTeamSize ?? evt.min_team_size ?? (isTeam ? 2 : 1));
    setEditMaxTeam(evt.maxTeamSize ?? evt.max_team_size ?? (isTeam ? 4 : 1));
    setEditPriceModel(evt.priceModel ?? evt.price_model ?? "FREE");
    const rawPricePaise = evt.pricePaise ?? evt.price_paise;
    setEditPriceRupees(rawPricePaise ? (rawPricePaise / 100).toString() : "0");
    const rawStudentPaise = evt.studentPricePaise ?? evt.student_price_paise;
    setEditStudentPriceRupees(
      rawStudentPaise !== null && rawStudentPaise !== undefined
        ? (rawStudentPaise / 100).toString()
        : ""
    );
    setEditCapacity(
      evt.capacity !== null && evt.capacity !== undefined ? evt.capacity.toString() : ""
    );
    setEditCapacityUnit(
      evt.capacityUnit ?? evt.capacity_unit ?? (isTeam ? "TEAMS" : "SEATS")
    );

    setEditScoringEnabled(Boolean(evt.scoringEnabled ?? evt.scoring_enabled));
    setEditScoringStatus(
      (evt as any).scoringStatus ||
      (evt as any).scoring_status ||
      (evt.category === "E_SPORTS" ? "OPEN" : "NOT_APPLICABLE")
    );
    setEditMaxRounds((evt as any).maxRounds || (evt as any).max_rounds || 1);
    setEditVolunteersCanScore(
      (evt as any).volunteersCanScore !== false &&
      (evt as any).volunteers_can_score !== false
    );
    setEditLeaderboardPublic(
      (evt as any).leaderboardPublic !== false &&
      evt.leaderboard_public !== false
    );

    const rawSchema = evt.formSchema ?? evt.form_schema ?? (evt as any).form_definitions;
    setEditFormSchema(parseFormSchema(rawSchema));
  };

  const handleEventEditorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCreatingEvent = showCreateModal;
    if (!isCreatingEvent && !editingEvent) return;
    if (!editTitle.trim() || !editSlug.trim()) {
      setEditTab("BASIC");
      setError("Enter an event title and page address before saving.");
      return;
    }

    setSubmittingEvent(true);
    setError(null);
    setSuccess(null);

    try {
      const pricePaise = editPriceRupees ? Math.round(parseFloat(editPriceRupees) * 100) : 0;
      const studentPricePaise = editStudentPriceRupees
        ? Math.round(parseFloat(editStudentPriceRupees) * 100)
        : null;

      const rulesArray = editRules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      const startsAtVal = fromDatetimeLocal(editStartsAt);
      const endsAtVal = fromDatetimeLocal(editEndsAt);
      const regCloseVal = fromDatetimeLocal(editRegistrationClosesAt);
      const schemaPayload = editFormSchema.length > 0 ? editFormSchema : null;

      const payload: Record<string, any> = {
        title: editTitle.trim(),
        slug: editSlug.trim().toLowerCase(),
        imageUrl: editImageURL.trim() || null,
        imageURL: editImageURL.trim() || null,
        category: editCategory,
        festDay: Number(editDay),
        day_of_event: Number(editDay),
        venue: editVenue.trim() || null,
        description: editDescription.trim() || null,
        rules: rulesArray.length > 0 ? rulesArray : (editRules.trim() || null),
        status: editStatus,
        startsAt: startsAtVal,
        starts_at: startsAtVal,
        endsAt: endsAtVal,
        ends_at: endsAtVal,
        registrationClosesAt: regCloseVal,
        registration_closes_at: regCloseVal,
        isTeam: editIsTeam,
        is_team_event: editIsTeam,
        minTeamSize: editIsTeam ? Number(editMinTeam) : 1,
        min_team_size: editIsTeam ? Number(editMinTeam) : 1,
        maxTeamSize: editIsTeam ? Number(editMaxTeam) : 1,
        max_team_size: editIsTeam ? Number(editMaxTeam) : 1,
        priceModel: editPriceModel,
        price_model: editPriceModel,
        pricePaise: pricePaise,
        price_paise: pricePaise,
        studentPricePaise: studentPricePaise,
        student_price_paise: studentPricePaise,
        capacity: editCapacity ? Number(editCapacity) : null,
        capacityUnit: editCapacityUnit,
        capacity_unit: editCapacityUnit,
        scoringEnabled: editCategory === "E_SPORTS" ? editScoringEnabled : false,
        scoring_enabled: editCategory === "E_SPORTS" ? editScoringEnabled : false,
        formSchema: schemaPayload,
        form_schema: schemaPayload,
        whatsappUrl: editWhatsappUrl.trim() || null,
        whatsapp_url: editWhatsappUrl.trim() || null,
      };

      if (editCategory === "E_SPORTS") {
        payload.scoringEnabled = editScoringEnabled;
        payload.scoring_enabled = editScoringEnabled;
        payload.scoringStatus = editScoringStatus;
        payload.scoring_status = editScoringStatus;
        payload.maxRounds = Number(editMaxRounds);
        payload.max_rounds = Number(editMaxRounds);
        payload.volunteersCanScore = editVolunteersCanScore;
        payload.volunteers_can_score = editVolunteersCanScore;
        payload.leaderboardPublic = editLeaderboardPublic;
        payload.leaderboard_public = editLeaderboardPublic;
      }

      if (isCreatingEvent) {
        await adminApi.events.create(payload);
        setSuccess(`Event "${editTitle}" created successfully.`);
      } else if (editingEvent) {
        await adminApi.events.fullUpdate(editingEvent.id, payload);
        setSuccess(`Event "${editTitle}" updated successfully.`);
      }

      setEditingEvent(null);
      setShowCreateModal(false);
      void loadEvents();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${isCreatingEvent ? "create" : "update"} event`,
      );
    } finally {
      setSubmittingEvent(false);
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
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#55DFFF]/90"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {error && !showCreateModal && !editingEvent && (
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
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${evt.status === "OPEN"
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
                            className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${m.role === "LEAD"
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

      {/* EVENT EDITOR */}
      {(editingEvent || showCreateModal) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-editor-title"
            className="relative isolate flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#BED6FF]/[0.16] bg-[linear-gradient(180deg,#0e1630_0%,#070b1a_55%,#04060f_100%)] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)] sm:rounded-3xl"
          >
            {/* Accent bar */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 z-20 h-[3px] bg-gradient-to-r from-[#55DFFF] via-[#6C7BFF] to-[#B3A4FF]"
            />

            {/* Static constellation backdrop (no animation, no lag) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 800 600"
              preserveAspectRatio="xMidYMid slice"
              fill="none"
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-70"
            >
              <g stroke="#8FB4FF" strokeOpacity="0.22" strokeWidth="1">
                <path d="M40 60 L120 30 L210 78 L300 24 L380 66" />
                <path d="M560 40 L640 86 L720 36 L780 90" />
                <path d="M30 330 L96 290 L170 340 L236 296" />
                <path d="M600 420 L670 380 L740 430 L790 392" />
                <path d="M80 560 L170 520 L260 570 L340 530" />
                <path d="M470 570 L560 530 L650 580" />
              </g>
              <g fill="#DCEBFF" fillOpacity="0.75">
                <circle cx="40" cy="60" r="2" />
                <circle cx="120" cy="30" r="2.6" />
                <circle cx="210" cy="78" r="1.8" />
                <circle cx="300" cy="24" r="2.4" />
                <circle cx="380" cy="66" r="1.8" />
                <circle cx="560" cy="40" r="2" />
                <circle cx="640" cy="86" r="2.6" />
                <circle cx="720" cy="36" r="1.8" />
                <circle cx="780" cy="90" r="2.2" />
                <circle cx="30" cy="330" r="1.8" />
                <circle cx="96" cy="290" r="2.4" />
                <circle cx="170" cy="340" r="1.8" />
                <circle cx="236" cy="296" r="2.2" />
                <circle cx="600" cy="420" r="1.8" />
                <circle cx="670" cy="380" r="2.4" />
                <circle cx="740" cy="430" r="1.8" />
                <circle cx="790" cy="392" r="2.2" />
                <circle cx="80" cy="560" r="1.8" />
                <circle cx="170" cy="520" r="2.4" />
                <circle cx="260" cy="570" r="1.8" />
                <circle cx="340" cy="530" r="2.2" />
                <circle cx="470" cy="570" r="1.8" />
                <circle cx="560" cy="530" r="2.4" />
                <circle cx="650" cy="580" r="1.8" />
              </g>
            </svg>

            {/* Header */}
            <div className="relative z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 pb-4 pt-6 sm:px-8 sm:pt-7">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-[#55DFFF]/35 bg-[#55DFFF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8BEAFF]">
                  Event details
                </span>
                <h2
                  id="event-editor-title"
                  className="mt-3 break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl"
                >
                  {showCreateModal
                    ? "Create an event"
                    : `Edit "${editingEvent?.title ?? ""}"`}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/65">
                  Set up the event details, registration, and scoring options.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setShowCreateModal(false);
                }}
                aria-label="Close event editor"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Event editor sections"
              className="relative z-10 flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 px-5 py-3 sm:px-8"
            >
              <button
                type="button"
                role="tab"
                aria-selected={editTab === "BASIC"}
                onClick={() => setEditTab("BASIC")}
                className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] ${editTab === "BASIC"
                    ? "border-transparent bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] text-[#04101a]"
                    : "border-[#BED6FF]/15 text-white/70 hover:border-[#55DFFF]/50 hover:text-white"
                  }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Basic info</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={editTab === "PRICING"}
                onClick={() => setEditTab("PRICING")}
                className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] ${editTab === "PRICING"
                    ? "border-transparent bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] text-[#04101a]"
                    : "border-[#BED6FF]/15 text-white/70 hover:border-[#55DFFF]/50 hover:text-white"
                  }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Pricing &amp; capacity</span>
              </button>

              {editCategory === "E_SPORTS" && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={editTab === "ESPORTS"}
                  onClick={() => setEditTab("ESPORTS")}
                  className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] ${editTab === "ESPORTS"
                      ? "border-transparent bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] text-[#04101a]"
                      : "border-[#BED6FF]/15 text-white/70 hover:border-[#55DFFF]/50 hover:text-white"
                    }`}
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>E-sports scoring</span>
                </button>
              )}

              <button
                type="button"
                role="tab"
                aria-selected={editTab === "FORM"}
                onClick={() => setEditTab("FORM")}
                className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] ${editTab === "FORM"
                    ? "border-transparent bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] text-[#04101a]"
                    : "border-[#BED6FF]/15 text-white/70 hover:border-[#55DFFF]/50 hover:text-white"
                  }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Registration form ({editFormSchema.length})</span>
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleEventEditorSubmit}
              className="relative z-10 flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
                {error && (showCreateModal || editingEvent) && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-400/35 bg-red-500/[0.09] px-4 py-3 text-sm leading-6 text-red-200"
                  >
                    {error}
                  </p>
                )}

                {/* TAB 1: BASIC INFO */}
                {editTab === "BASIC" && (
                  <div role="tabpanel" className="space-y-7">
                    {/* Identity */}
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#55DFFF]">
                        Identity
                        <span className="h-px flex-1 bg-gradient-to-r from-[#55DFFF]/30 to-transparent" />
                      </h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="ev-title" className="block text-xs font-semibold tracking-wide text-white/85">
                            Event title <span className="text-[#FF806E]">*</span>
                          </label>
                          <input
                            id="ev-title"
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => {
                              const title = e.target.value;
                              setEditTitle(title);
                              if (showCreateModal && !slugManuallyEdited) {
                                setEditSlug(
                                  title
                                    .toLowerCase()
                                    .trim()
                                    .replace(/[^a-z0-9]+/g, "-")
                                    .replace(/(^-|-$)/g, ""),
                                );
                              }
                            }}
                            placeholder="e.g. Robotics Challenge"
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>

                        <div>
                          <label htmlFor="ev-slug" className="block text-xs font-semibold tracking-wide text-white/85">
                            Page address <span className="text-[#FF806E]">*</span>
                          </label>
                          <input
                            id="ev-slug"
                            type="text"
                            required
                            value={editSlug}
                            onChange={(e) => {
                              setEditSlug(e.target.value);
                              if (showCreateModal) setSlugManuallyEdited(true);
                            }}
                            placeholder="robotics-challenge"
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 font-mono text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                          <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                            Used in the event page address. You can edit the suggested value.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="ev-category" className="block text-xs font-semibold tracking-wide text-white/85">
                            Category
                          </label>
                          <select
                            id="ev-category"
                            value={editCategory}
                            onChange={(e) => {
                              const category = e.target.value as EventCategory;
                              setEditCategory(category);
                              if (showCreateModal && category === "E_SPORTS") {
                                setEditScoringEnabled(true);
                              }
                            }}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
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
                          <label htmlFor="ev-day" className="block text-xs font-semibold tracking-wide text-white/85">
                            Day
                          </label>
                          <select
                            id="ev-day"
                            value={editDay}
                            onChange={(e) => setEditDay(Number(e.target.value))}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
                          >
                            <option value={1}>Day 1</option>
                            <option value={2}>Day 2</option>
                            <option value={3}>Day 3</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="ev-status" className="block text-xs font-semibold tracking-wide text-white/85">
                            Status
                          </label>
                          <select
                            id="ev-status"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as EventStatus)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="CLOSED">CLOSED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </div>
                    </section>

                    {/* Media and links */}
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B3A4FF]">
                        Media and links
                        <span className="h-px flex-1 bg-gradient-to-r from-[#B3A4FF]/30 to-transparent" />
                      </h3>

                      <div>
                        <label htmlFor="ev-image" className="block text-xs font-semibold tracking-wide text-white/85">
                          Image URL
                        </label>
                        <input
                          id="ev-image"
                          type="url"
                          value={editImageURL}
                          onChange={(e) => setEditImageURL(e.target.value)}
                          placeholder="https://example.com/images/poster.png"
                          className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                        />
                        {editImageURL.trim() && (
                          <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-2.5">
                            <img
                              src={editImageURL.trim()}
                              alt="Preview"
                              className="h-12 w-20 rounded-lg object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                            <span className="text-xs text-white/65">Image preview</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="ev-whatsapp" className="block text-xs font-semibold tracking-wide text-white/85">
                          Official WhatsApp Group Link (Exclusive to Ticket Holders)
                        </label>
                        <input
                          id="ev-whatsapp"
                          type="url"
                          value={editWhatsappUrl}
                          onChange={(e) => setEditWhatsappUrl(e.target.value)}
                          placeholder="https://chat.whatsapp.com/XXXXXX"
                          className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                        />
                        <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                          Displayed exclusively to confirmed ticket holders on their digital pass.
                        </p>
                      </div>
                    </section>

                    {/* Schedule */}
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6FF0C8]">
                        Schedule and place
                        <span className="h-px flex-1 bg-gradient-to-r from-[#6FF0C8]/30 to-transparent" />
                      </h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="ev-starts" className="block text-xs font-semibold tracking-wide text-white/85">
                            Starts At
                          </label>
                          <input
                            id="ev-starts"
                            type="datetime-local"
                            value={editStartsAt}
                            onChange={(e) => setEditStartsAt(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-xs text-white transition-colors [color-scheme:dark] hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="ev-ends" className="block text-xs font-semibold tracking-wide text-white/85">
                            Ends At
                          </label>
                          <input
                            id="ev-ends"
                            type="datetime-local"
                            value={editEndsAt}
                            onChange={(e) => setEditEndsAt(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-xs text-white transition-colors [color-scheme:dark] hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="ev-closes" className="block text-xs font-semibold tracking-wide text-white/85">
                            Registration Closes At
                          </label>
                          <input
                            id="ev-closes"
                            type="datetime-local"
                            value={editRegistrationClosesAt}
                            onChange={(e) => setEditRegistrationClosesAt(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-xs text-white transition-colors [color-scheme:dark] hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="ev-venue" className="block text-xs font-semibold tracking-wide text-white/85">
                          Venue
                        </label>
                        <input
                          id="ev-venue"
                          type="text"
                          value={editVenue}
                          onChange={(e) => setEditVenue(e.target.value)}
                          placeholder="e.g. Indoor Stadium - Court 1"
                          className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                        />
                      </div>
                    </section>

                    {/* Description and rules */}
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FFC46B]">
                        Description and rules
                        <span className="h-px flex-1 bg-gradient-to-r from-[#FFC46B]/30 to-transparent" />
                      </h3>

                      <div>
                        <label htmlFor="ev-description" className="block text-xs font-semibold tracking-wide text-white/85">
                          Description
                        </label>
                        <textarea
                          id="ev-description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                          className="mt-1.5 w-full resize-y rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm leading-6 text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                        />
                      </div>

                      <div>
                        <label htmlFor="ev-rules" className="block text-xs font-semibold tracking-wide text-white/85">
                          Rules
                        </label>
                        <textarea
                          id="ev-rules"
                          value={editRules}
                          onChange={(e) => setEditRules(e.target.value)}
                          rows={6}
                          placeholder={"Enter each rule on a new line. Markdown is also supported."}
                          className="mt-1.5 w-full resize-y rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm leading-6 text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                        />
                        <p className="mt-1.5 text-[11px] leading-5 text-white/55">
                          Put each rule on a separate line. Rules are saved as a newline-separated string.
                        </p>
                      </div>
                    </section>
                  </div>
                )}

                {/* TAB 2: PRICING & CAPACITY */}
                {editTab === "PRICING" && (
                  <div role="tabpanel" className="space-y-7">
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#55DFFF]">
                        Participation
                        <span className="h-px flex-1 bg-gradient-to-r from-[#55DFFF]/30 to-transparent" />
                      </h3>

                      <label
                        htmlFor="editIsTeam"
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-4 transition-colors hover:border-[#55DFFF]/45"
                      >
                        <input
                          type="checkbox"
                          id="editIsTeam"
                          checked={editIsTeam}
                          onChange={(e) => setEditIsTeam(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#55DFFF]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-white">Team Event Format</span>
                          <span className="mt-0.5 block text-xs leading-5 text-white/60">
                            Turn this on if participants register as a team.
                          </span>
                        </span>
                      </label>

                      {editIsTeam && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="ev-min-team" className="block text-xs font-semibold tracking-wide text-white/85">
                              Min Team Size
                            </label>
                            <input
                              id="ev-min-team"
                              type="number"
                              min={1}
                              max={20}
                              value={editMinTeam}
                              onChange={(e) => setEditMinTeam(Number(e.target.value))}
                              className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                            />
                          </div>
                          <div>
                            <label htmlFor="ev-max-team" className="block text-xs font-semibold tracking-wide text-white/85">
                              Max Team Size
                            </label>
                            <input
                              id="ev-max-team"
                              type="number"
                              min={editMinTeam}
                              max={20}
                              value={editMaxTeam}
                              onChange={(e) => setEditMaxTeam(Number(e.target.value))}
                              className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B3A4FF]">
                        Pricing
                        <span className="h-px flex-1 bg-gradient-to-r from-[#B3A4FF]/30 to-transparent" />
                      </h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor="ev-price-model" className="block text-xs font-semibold tracking-wide text-white/85">
                            Price Model
                          </label>
                          <select
                            id="ev-price-model"
                            value={editPriceModel}
                            onChange={(e) => setEditPriceModel(e.target.value as PriceModel)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
                          >
                            <option value="FREE">FREE</option>
                            <option value="PER_PARTICIPANT">PER_PARTICIPANT</option>
                            <option value="PER_TEAM">PER_TEAM</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="ev-price" className="block text-xs font-semibold tracking-wide text-white/85">
                            General Fee (₹ Rupees)
                          </label>
                          <input
                            id="ev-price"
                            type="number"
                            min={0}
                            step={1}
                            value={editPriceRupees}
                            onChange={(e) => setEditPriceRupees(e.target.value)}
                            placeholder="e.g. 200"
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>

                        <div>
                          <label htmlFor="ev-student-price" className="block text-xs font-semibold tracking-wide text-white/85">
                            Student Discount (₹ Rupees)
                          </label>
                          <input
                            id="ev-student-price"
                            type="number"
                            min={0}
                            step={1}
                            value={editStudentPriceRupees}
                            onChange={(e) => setEditStudentPriceRupees(e.target.value)}
                            placeholder="Optional"
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6FF0C8]">
                        Capacity
                        <span className="h-px flex-1 bg-gradient-to-r from-[#6FF0C8]/30 to-transparent" />
                      </h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="ev-capacity" className="block text-xs font-semibold tracking-wide text-white/85">
                            Capacity Limit
                          </label>
                          <input
                            id="ev-capacity"
                            type="number"
                            min={1}
                            value={editCapacity}
                            onChange={(e) => setEditCapacity(e.target.value)}
                            placeholder="Leave empty for unlimited"
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors placeholder:text-white/30 hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                        <div>
                          <label htmlFor="ev-capacity-unit" className="block text-xs font-semibold tracking-wide text-white/85">
                            Capacity Unit
                          </label>
                          <select
                            id="ev-capacity-unit"
                            value={editCapacityUnit}
                            onChange={(e) => setEditCapacityUnit(e.target.value as CapacityUnit)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
                          >
                            <option value="SEATS">SEATS</option>
                            <option value="TEAMS">TEAMS</option>
                          </select>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* TAB 3: E-SPORTS */}
                {editTab === "ESPORTS" && (
                  <div role="tabpanel" className="space-y-7">
                    <section className="space-y-4">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#55DFFF]">
                        Tournament scoring
                        <span className="h-px flex-1 bg-gradient-to-r from-[#55DFFF]/30 to-transparent" />
                      </h3>

                      <label
                        htmlFor="editScoringEnabled"
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-4 transition-colors hover:border-[#55DFFF]/45"
                      >
                        <input
                          type="checkbox"
                          id="editScoringEnabled"
                          checked={editScoringEnabled}
                          onChange={(e) => setEditScoringEnabled(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#55DFFF]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-white">Enable Tournament Scoring</span>
                          <span className="mt-0.5 block text-xs leading-5 text-white/60">
                            Lets referees enter scores for this event.
                          </span>
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="ev-scoring-status" className="block text-xs font-semibold tracking-wide text-white/85">
                            Scoring Status
                          </label>
                          <select
                            id="ev-scoring-status"
                            value={editScoringStatus}
                            onChange={(e) => setEditScoringStatus(e.target.value as ScoringStatus)}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20 [&>option]:bg-[#07102a]"
                          >
                            <option value="OPEN">OPEN (Referees can enter scores)</option>
                            <option value="FINALIZED">FINALIZED (Locked to editing)</option>
                            <option value="NOT_APPLICABLE">NOT_APPLICABLE</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="ev-max-rounds" className="block text-xs font-semibold tracking-wide text-white/85">
                            Max Rounds
                          </label>
                          <input
                            id="ev-max-rounds"
                            type="number"
                            min={1}
                            max={50}
                            value={editMaxRounds}
                            onChange={(e) => setEditMaxRounds(Number(e.target.value))}
                            className="mt-1.5 w-full rounded-xl border border-[#BED6FF]/20 bg-[#050a18] px-3.5 py-2.5 text-sm text-white transition-colors hover:border-[#BED6FF]/35 focus:border-[#55DFFF] focus:outline-none focus:ring-2 focus:ring-[#55DFFF]/20"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B3A4FF]">
                        Access
                        <span className="h-px flex-1 bg-gradient-to-r from-[#B3A4FF]/30 to-transparent" />
                      </h3>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-4 transition-colors hover:border-[#B3A4FF]/45">
                        <input
                          type="checkbox"
                          checked={editVolunteersCanScore}
                          onChange={(e) => setEditVolunteersCanScore(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#55DFFF]"
                        />
                        <span className="text-sm leading-6 text-white/85">
                          Allow Volunteers to submit scores (otherwise Leads only)
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-4 transition-colors hover:border-[#B3A4FF]/45">
                        <input
                          type="checkbox"
                          checked={editLeaderboardPublic}
                          onChange={(e) => setEditLeaderboardPublic(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#55DFFF]"
                        />
                        <span className="text-sm leading-6 text-white/85">
                          Public Leaderboard visible to festival audience
                        </span>
                      </label>
                    </section>
                  </div>
                )}

                {/* TAB 4: FORM BUILDER */}
                {editTab === "FORM" && (
                  <div role="tabpanel" className="space-y-4">
                    <section className="rounded-xl border border-[#BED6FF]/15 bg-white/[0.03] p-4">
                      <p className="text-sm leading-6 text-white/75">
                        Configure custom dynamic questions that attendees must answer when registering for this competition.
                      </p>
                    </section>
                    <FormSchemaBuilder
                      schema={editFormSchema}
                      onChange={setEditFormSchema}
                      disabled={submittingEvent}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 bg-[#050813] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-8">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvent(null);
                    setShowCreateModal(false);
                  }}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#BED6FF]/25 px-5 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] px-6 text-sm font-semibold text-[#04101a] transition hover:from-[#B5F2FF] hover:to-[#55DFFF] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8BEAFF]"
                >
                  {submittingEvent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {showCreateModal ? "Creating…" : "Saving…"}
                    </>
                  ) : showCreateModal ? (
                    "Create event"
                  ) : (
                    "Save changes"
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