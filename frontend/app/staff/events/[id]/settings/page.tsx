"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  MapPin,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import StaffEventNav from "@/components/staff/StaffEventNav";
import FormSchemaBuilder from "@/components/staff/FormSchemaBuilder";
import type {
  FormFieldDefinition,
  FormFieldType,
  StaffEventDashboard,
  UserProfile,
  EventItem,
} from "@/types/api";

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
      const fieldType: FormFieldType =
        LEGACY_TYPE_MAP[type] ?? (type as FormFieldType) ?? "shortText";
      return {
        id: f.id || `field_${idx + 1}`,
        label: f.label || "Question",
        required: Boolean(f.required),
        placeholder: f.placeholder || "",
        ...rest,
        type: fieldType,
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

function toDatetimeLocal(val: number | string | null | undefined): string {
  if (!val) return "";
  const num = typeof val === "string" ? Number(val) : val;
  const ms = !isNaN(num) && num > 0 && num < 1e11 ? num * 1000 : val;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function StaffEventSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<StaffEventDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [venue, setVenue] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState("");
  const [registrationClosesAt, setRegistrationClosesAt] = useState<string>("");
  const [formSchema, setFormSchema] = useState<FormFieldDefinition[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Authenticate user
      let currentUser: UserProfile;
      try {
        currentUser = await participantApi.auth.me();
      } catch {
        router.push(`/login?redirect=/staff/events/${id}/settings`);
        return;
      }
      setUser(currentUser);

      // 2. Fetch dashboard (for permissions & staff roster) AND canonical event details in parallel
      const [dashResult, fullEventResult] = await Promise.allSettled([
        staffApi.events.getDashboard(id),
        participantApi.events.get(id),
      ]);

      const dash: StaffEventDashboard | null =
        dashResult.status === "fulfilled" ? dashResult.value : null;
      const fullEvt: EventItem | null =
        fullEventResult.status === "fulfilled" ? fullEventResult.value : null;

      if (!dash && !fullEvt) {
        throw new Error(
          dashResult.status === "rejected"
            ? (dashResult.reason instanceof Error
                ? dashResult.reason.message
                : "Failed to load event details")
            : "Event not found or unavailable."
        );
      }

      // 3. Verify permissions: Only assigned Event Leads and Super Admins can configure settings
      const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
      const isLead =
        Boolean(dash?.staff.some((s) => s.user_id === currentUser.id && s.role === "LEAD")) ||
        currentUser.role === "LEAD";

      if (!isSuperAdmin && !isLead) {
        throw new Error(
          "Access Restricted: Only assigned Event Leads and Super Admins can configure event operational settings."
        );
      }

      // 4. Merge canonical event data with dashboard event data (prefer canonical fullEvt)
      const evt = {
        ...(dash?.event || {}),
        ...(fullEvt || {}),
      } as any;

      if (dash) {
        setDashboard({
          ...dash,
          event: {
            ...dash.event,
            ...evt,
          },
        });
      } else {
        setDashboard({
          event: evt,
          metrics: {
            confirmed_count: 0,
            reserved_count: 0,
            checked_in_count: 0,
            pending_payments_count: 0,
            seats_remaining: evt.seats_remaining ?? null,
          },
          staff: [],
        });
      }

      // 5. Populate form fields from the canonical event data
      setVenue(evt.venue || evt.location || "");

      const resolvedImage =
        evt.imageURL ||
        evt.imageUrl ||
        evt.image_url ||
        evt.image ||
        evt.posterUrl ||
        evt.poster_url ||
        evt.bannerUrl ||
        "";
      setImageURL(resolvedImage);

      setDescription(
        evt.description ||
        evt.shortDescription ||
        evt.short_description ||
        ""
      );

      // Handle metadata: Avoid populating with synthetic dummy boilerplate
      let initialMetadata = "";
      if (evt.rawMetadata !== undefined && evt.rawMetadata !== null) {
        if (typeof evt.rawMetadata === "string") {
          initialMetadata = evt.rawMetadata;
        } else if (typeof evt.rawMetadata === "object") {
          initialMetadata = JSON.stringify(evt.rawMetadata, null, 2);
        }
      } else if (evt.metadata && typeof evt.metadata === "string") {
        try {
          const parsed = JSON.parse(evt.metadata);
          const isSynthetic =
            parsed &&
            typeof parsed === "object" &&
            "summary" in parsed &&
            "rules" in parsed &&
            "prizes" in parsed &&
            "timeline" in parsed &&
            (!parsed.rules || parsed.rules.length === 0) &&
            (!parsed.prizes || parsed.prizes.length === 0) &&
            (!parsed.timeline || parsed.timeline.length === 0) &&
            !parsed.organizer &&
            !parsed.eligibility;

          if (!isSynthetic) {
            initialMetadata = evt.metadata;
          }
        } catch {
          initialMetadata = evt.metadata;
        }
      }
      setMetadata(initialMetadata);

      // Registration deadline
      const deadlineVal =
        evt.registration_closes_at ??
        evt.registrationClosesAt ??
        evt.registrationCloseTime ??
        null;
      setRegistrationClosesAt(toDatetimeLocal(deadlineVal));

      // Questionnaire schema
      const rawSchema =
        evt.form_schema ??
        evt.formSchema ??
        evt.formSchemaBuilder ??
        evt.form_definitions;
      setFormSchema(parseFormSchema(rawSchema));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load event settings");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let deadlineMs: number | null = null;
      if (registrationClosesAt.trim()) {
        const parsedDate = new Date(registrationClosesAt);
        if (!isNaN(parsedDate.getTime())) {
          deadlineMs = parsedDate.getTime();
        }
      }

      const schemaPayload =
        formSchema.length > 0 ? formSchema : null;

      await staffApi.events.update(id, {
        venue: venue.trim() || null,
        imageURL: imageURL.trim() || null,
        description: description.trim() || null,
        metadata: metadata.trim() || null,
        registration_closes_at: deadlineMs,
        form_schema: schemaPayload,
      });

      setSuccess("Event settings & questionnaire updated successfully!");
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save event settings");
    } finally {
      setSaving(false);
    }
  };

  const isLeadOrAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "LEAD" ||
    dashboard?.staff.some((s) => s.user_id === user?.id && s.role === "LEAD");

  if (!loading && error && error.includes("Access Restricted")) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-[#0C1017] p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Lead Permission Required</h1>
          <p className="mt-2 text-xs text-white/50">{error}</p>
          <Link
            href={`/staff/events/${id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-400 px-5 py-2.5 text-xs font-bold text-black"
          >
            ← Return to Event Overview
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Breadcrumb & Refresh */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Link href="/staff" className="hover:text-white">Staff Portal</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/staff/events" className="hover:text-white">Events</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/staff/events/${id}`} className="hover:text-white truncate max-w-[160px]">
              {dashboard?.event.title || "Event"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">Settings</span>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <StaffEventNav
          eventId={id}
          currentTab="settings"
          isLeadOrAdmin={Boolean(isLeadOrAdmin)}
          isEsports={dashboard?.event.category === "E_SPORTS"}
        />

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Event Configuration & Form Builder
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Configure venue, guidelines, registration deadline, and custom questionnaire questions for{" "}
              <strong>{dashboard?.event.title || "this event"}</strong>.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: General Operational Details */}
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8 space-y-5">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white">
                1. Operational Details
              </h2>
              <p className="mt-0.5 text-xs text-white/50">
                Update the physical location, overview description, and registration deadline.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Venue */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/80">
                  Event Venue / Room
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Academic Complex Lab 2 or Dean Grounds"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Registration Closes At */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/80">
                  Registration Deadline (Cut-off Time)
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="datetime-local"
                    value={registrationClosesAt}
                    onChange={(e) => setRegistrationClosesAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/80">
                Event Artwork / Poster (imageURL)
              </label>
              <div className="relative">
                <ImageIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="url"
                  value={imageURL}
                  onChange={(e) => setImageURL(e.target.value)}
                  placeholder="https://example.com/images/poster.png"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                />
              </div>
              {imageURL.trim() && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-2">
                  <img
                    src={imageURL.trim()}
                    alt="Poster preview"
                    className="h-12 w-20 rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className="text-xs text-white/50">Poster Preview</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/80">
                Event Description & Problem Statement
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe rules, theme, objectives, and schedule for participants..."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
              />
            </div>

            {/* Metadata (Rules/Notes JSON) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/80">
                Custom Metadata / Additional Guidelines (JSON or Text)
              </label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder='e.g. {"rules": ["Bring your own laptop", "ID card mandatory"]}'
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 font-mono text-xs text-white/90 placeholder-white/30 outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Section 2: Visual Dynamic Questionnaire Builder */}
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8 space-y-5">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white">
                2. Registration Questionnaire Builder
              </h2>
              <p className="mt-0.5 text-xs text-white/50">
                Design custom questions presented to participants when registering or purchasing passes for this event.
              </p>
            </div>

            <FormSchemaBuilder
              schema={formSchema}
              onChange={setFormSchema}
              disabled={saving}
            />
          </div>

          {/* Sticky Submit Footer */}
          <div className="sticky bottom-4 z-20 rounded-2xl border border-white/15 bg-[#0C1017]/95 p-4 backdrop-blur-md shadow-2xl flex items-center justify-between">
            <p className="text-xs text-white/60">
              Ensure all changes are verified before saving.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-400 px-6 py-2.5 text-xs font-bold text-black transition hover:bg-purple-300 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Event Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
