"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Trophy,
  Award,
  BookOpen,
  ListChecks,
  Cpu,
  Phone,
  Mail,
  Sparkles,
  Layers,
  Scale,
  Compass,
} from "lucide-react";
import type { EventItem, UserProfile } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface EventMetadata {
  sub_category?: string;
  organizer?: string;
  tagline?: string;
  full_name?: string;
  eligibility?: string;
  rules?: string[] | string;
  tracks?: { name?: string; title?: string; scope?: string; description?: string }[];
  evaluation_criteria?: { criterion?: string; weight_percentage?: number; focus?: string }[];
  prizes?:
  | {
    total_prize_pool_inr?: number;
    breakdown?: { position?: string; prize_inr?: number; reward?: string }[];
    notes?: string;
  }
  | string;
  prize_pool_inr?: number;
  timeline?: { stage?: string; activities?: string }[];
  rounds?: { stage?: number | string; name?: string; details?: string }[];
  event_format?: { stage?: number | string; name?: string; details?: string }[];
  software_required?: string;
  tools_allowed?: string;
  materials_provided?: string;
  device_requirement?: string;
  coordinators?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  leadership?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  event_heads?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  submitted_by?: string;
  mode?: string;
  tournament_format?: string;
  structure_and_rules?: string;
  duration_and_rules?: string;
  timing_rules?: string;
  registration?: {
    platform?: string;
    registration_fee_inr?: number;
    fee_type?: string;
    accommodation_and_food_fee_inr?: number;
    accommodation_notes?: string;
  };
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [categoryEvents, setCategoryEvents] = useState<EventItem[]>([]);
  const [isCategoryView, setIsCategoryView] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team creation modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEventData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch user auth status quietly
        fetch(`${API_BASE}/api/me`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setUser(d.data);
          })
          .catch(() => null);

        // 1. Try fetching single event details first
        const singleRes = await fetch(`${API_BASE}/api/events/${encodeURIComponent(slug)}`, {
          credentials: "include",
        });

        if (singleRes.ok) {
          const singleData = await singleRes.json();
          if (singleData.success && singleData.data) {
            setEvent(singleData.data);
            setIsCategoryView(false);
            return;
          }
        }

        // 2. If not a single event, check if it's a category match
        const normalizedCategory = slug.toUpperCase().replace("-", "_");
        const catRes = await fetch(
          `${API_BASE}/api/events?category=${encodeURIComponent(normalizedCategory)}`,
          {
            credentials: "include",
          },
        );

        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.success && Array.isArray(catData.data?.events) && catData.data.events.length > 0) {
            setCategoryEvents(catData.data.events);
            setIsCategoryView(true);
            return;
          }
        }

        // 3. Fallback: list all events and see if slug matches title or slug
        const listRes = await fetch(`${API_BASE}/api/events`, { credentials: "include" });
        if (listRes.ok) {
          const listData = await listRes.json();
          const matched = listData.data?.events?.find(
            (e: EventItem) => e.slug === slug || e.id === slug,
          );
          if (matched) {
            setEvent(matched);
            setIsCategoryView(false);
            return;
          }
        }

        throw new Error("The requested event or category could not be found.");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load event details");
      } finally {
        setLoading(false);
      }
    }

    void loadEventData();
  }, [slug]);

  const handleSoloRegister = async () => {
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    if (!user.profile_complete) {
      router.push("/profile-completion");
      return;
    }

    if (!event) return;

    try {
      const res = await fetch(`${API_BASE}/api/purchases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ item_type: "EVENT_PASS", event_id: event.id }],
          acknowledge_student_id_policy: user.is_student,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Could not start registration");
      }

      if (data.data.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(`/checkout/${data.data.id}/pay`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Registration error");
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !event) return;

    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    if (!user.profile_complete) {
      router.push("/profile-completion");
      return;
    }

    setCreatingTeam(true);
    setTeamError(null);

    try {
      const res = await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          name: teamName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create team");
      }

      router.push(`/teams/${data.data.id}`);
    } catch (err: unknown) {
      setTeamError(err instanceof Error ? err.message : "Team creation failed");
    } finally {
      setCreatingTeam(false);
    }
  };

  if (loading) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
          <div className="h-40 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error || (!event && !isCategoryView)) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold">Event Unavailable</h1>
          <p className="mt-2 text-sm text-white/50">{error || "Event not found."}</p>
          <Link
            href="/events"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← Return to Events Directory
          </Link>
        </div>
      </main>
    );
  }

  // Category track view (e.g. /events/technical or /events/cultural)
  if (isCategoryView) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All categories
          </Link>

          <h1 className="mt-4 text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            {slug.replace("-", " ")} Events
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Explore and register for events scheduled in this track.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categoryEvents.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-300/40"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase text-cyan-300">
                    Day {item.day_of_event} · {item.category}
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-white">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-xs text-white/60">{item.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300">
                    {item.price_model === "FREE"
                      ? "FREE"
                      : `₹${(item.price_paise / 100).toFixed(0)}`}
                  </span>
                  <Link
                    href={`/events/${item.slug || item.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-cyan-300"
                  >
                    View details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!event) return null;

  // Parse rich metadata JSON
  let meta: EventMetadata = {};
  if (event.metadata) {
    try {
      meta = typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata;
    } catch {
      meta = {};
    }
  }

  const priceFormatted =
    event.price_model === "FREE"
      ? "FREE"
      : `₹${(event.price_paise / 100).toFixed(0)} (${event.price_model === "PER_PARTICIPANT" ? "Per Person" : "Per Team"
      })`;

  // Extract rules
  const rulesList: string[] = [];
  if (Array.isArray(meta.rules)) {
    rulesList.push(...meta.rules);
  } else if (typeof meta.rules === "string" && meta.rules.trim()) {
    rulesList.push(meta.rules);
  }
  if (typeof meta.structure_and_rules === "string") {
    rulesList.push(meta.structure_and_rules);
  } else if (typeof meta.structure_and_rules === "object" && meta.structure_and_rules !== null) {
    Object.entries(meta.structure_and_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }
  if (typeof meta.duration_and_rules === "string") {
    rulesList.push(meta.duration_and_rules);
  } else if (typeof meta.duration_and_rules === "object" && meta.duration_and_rules !== null) {
    Object.entries(meta.duration_and_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }
  if (typeof meta.timing_rules === "string") {
    rulesList.push(meta.timing_rules);
  } else if (typeof meta.timing_rules === "object" && meta.timing_rules !== null) {
    Object.entries(meta.timing_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }

  // Extract prizes
  let prizePoolDisplay: string | null = null;
  let prizeBreakdown: { position?: string; prize_inr?: number; reward?: string }[] = [];
  let prizeNotes: string | null = null;

  if (Array.isArray(meta.prizes)) {
    prizeBreakdown = meta.prizes;
  } else if (meta.prizes && typeof meta.prizes === "object") {
    if (meta.prizes.total_prize_pool_inr) {
      prizePoolDisplay = `₹${meta.prizes.total_prize_pool_inr.toLocaleString("en-IN")}`;
    }
    if (Array.isArray(meta.prizes.breakdown)) {
      prizeBreakdown = meta.prizes.breakdown;
    }
    if (meta.prizes.notes) {
      prizeNotes = meta.prizes.notes;
    }
  } else if (meta.prize_pool_inr) {
    prizePoolDisplay = `₹${meta.prize_pool_inr.toLocaleString("en-IN")}`;
  }
  const scheduleStages: {
    stage?: string | number;
    name?: string;
    activities?: string;
    details?: string;
  }[] = meta.timeline
      ? meta.timeline
      : meta.rounds
        ? meta.rounds
        : meta.event_format ?? [];
  // Extract coordinators
  const coordinatorsList: { name?: string; phone?: string; email?: string; role?: string }[] = [];
  if (Array.isArray(meta.coordinators)) {
    coordinatorsList.push(...meta.coordinators);
  }
  if (Array.isArray(meta.leadership)) {
    coordinatorsList.push(...meta.leadership);
  }
  if (Array.isArray(meta.event_heads)) {
    meta.event_heads.forEach((head) => {
      if (typeof head === "string") {
        coordinatorsList.push({ name: head, role: "Event Head" });
      } else if (typeof head === "object" && head !== null) {
        coordinatorsList.push(head);
      }
    });
  }

  return (
    <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events Directory
        </Link>

        {/* 1. Header Hero Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
              {event.category}
            </span>
            {meta.sub_category && (
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-slate-300 border border-white/10">
                {meta.sub_category}
              </span>
            )}
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              Day {event.day_of_event}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${event.status === "OPEN"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300"
                }`}
            >
              {event.status}
            </span>
            {meta.organizer && (
              <span className="text-xs text-white/50 ml-auto">
                Organized by <strong className="text-white/80">{meta.organizer}</strong>
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {event.title}
          </h1>

          {meta.tagline && (
            <p className="mt-2 text-sm font-medium text-cyan-300 sm:text-base italic">
              &ldquo;{meta.tagline}&rdquo;
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
            {event.description || "No description provided."}
          </p>

          {/* Quick Metrics Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Venue</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-cyan-300" />
                {event.venue || "Campus Arena"}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Registration Fee</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Tag className="h-3.5 w-3.5 text-cyan-300" />
                {priceFormatted}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Format</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Users className="h-3.5 w-3.5 text-cyan-300" />
                {event.is_team_event
                  ? `Team (${event.min_team_size}–${event.max_team_size})`
                  : "Solo Event"}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40">Availability</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                {event.seats_remaining !== null
                  ? `${event.seats_remaining} seats remaining`
                  : "Seats available"}
              </p>
            </div>
          </div>

          {/* Call to Action Bar */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
            {event.is_team_event ? (
              <button
                type="button"
                onClick={() => setShowTeamModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:shadow-cyan-400/30"
              >
                <Users className="h-4 w-4" />
                Create a Team
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSoloRegister}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:shadow-cyan-400/30"
              >
                Register Now
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {event.leaderboard_public && (
              <Link
                href={`/events/${event.id}/leaderboard`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                View Leaderboard
              </Link>
            )}
          </div>
        </div>

        {/* 2. Prize Pool & Awards Section (if present) */}
        {(prizePoolDisplay || prizeBreakdown.length > 0) && (
          <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-amber-500/[0.02] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Prize Pool & Awards</h2>
                {prizePoolDisplay && (
                  <p className="text-sm font-bold text-amber-400">Total: {prizePoolDisplay}</p>
                )}
              </div>
            </div>

            {prizeBreakdown.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {prizeBreakdown.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-amber-400/40"
                  >
                    <div className="flex items-center gap-2 text-amber-400">
                      <Award className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">{p.position || `Prize ${idx + 1}`}</span>
                    </div>
                    {p.prize_inr ? (
                      <p className="mt-2 text-2xl font-black text-white">
                        ₹{p.prize_inr.toLocaleString("en-IN")}
                      </p>
                    ) : null}
                    {p.reward && <p className="mt-1 text-xs text-white/70">{p.reward}</p>}
                  </div>
                ))}
              </div>
            )}

            {prizeNotes && <p className="mt-4 text-xs text-amber-300/80 italic">{prizeNotes}</p>}
          </div>
        )}

        {/* 3. Tracks & Problem Statements Section (if present) */}
        {Array.isArray(meta.tracks) && meta.tracks.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Competition Tracks & Domains</h2>
                <p className="text-xs text-white/50">Choose a focus area for your submission</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {meta.tracks.map((track, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-cyan-300/40"
                >
                  <span className="text-[10px] font-bold uppercase text-cyan-300">Track {idx + 1}</span>
                  <h3 className="mt-1 text-base font-bold text-white">{track.name || track.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/70">
                    {track.scope || track.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Rules & Guidelines Section */}
        {rulesList.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Rules & Guidelines</h2>
                <p className="text-xs text-white/50">Official criteria and participation constraints</p>
              </div>
            </div>

            <ul className="space-y-3">
              {rulesList.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-white/80">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
                    {idx + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Schedule / Rounds Timeline (if present) */}
        {scheduleStages.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-300">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Event Timeline & Rounds</h2>
                <p className="text-xs text-white/50">Stages of evaluation and schedule progression</p>
              </div>
            </div>

            <div className="space-y-4">
              {scheduleStages.map((stage, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-purple-500/20 px-2.5 py-1 font-mono text-xs font-bold text-purple-300">
                      {stage.stage !== undefined ? `STAGE ${stage.stage}` : `ROUND ${idx + 1}`}
                    </span>
                    <div>
                      {stage.name && <h4 className="font-semibold text-white text-sm">{stage.name}</h4>}
                      <p className="text-xs text-white/70">{stage.activities || stage.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Evaluation / Judging Criteria (if present) */}
        {Array.isArray(meta.evaluation_criteria) && meta.evaluation_criteria.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Judging & Evaluation Criteria</h2>
                <p className="text-xs text-white/50">Score weights and assessment parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {meta.evaluation_criteria.map((c, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{c.criterion}</h4>
                    {c.focus && <p className="mt-1 text-xs text-white/60">{c.focus}</p>}
                  </div>
                  {c.weight_percentage !== undefined && (
                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                      {c.weight_percentage}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Eligibility & Tools / Equipment Requirements */}
        {(meta.eligibility ||
          meta.software_required ||
          meta.tools_allowed ||
          meta.device_requirement ||
          meta.materials_provided) && (
            <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Requirements & Eligibility</h2>
                  <p className="text-xs text-white/50">Prerequisites and required equipment</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                {meta.eligibility && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Eligibility</span>
                    <p className="mt-1 text-white font-medium">{meta.eligibility}</p>
                  </div>
                )}

                {meta.software_required && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Required Software</span>
                    <p className="mt-1 text-white font-medium">{meta.software_required}</p>
                  </div>
                )}

                {meta.tools_allowed && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Allowed Tools</span>
                    <p className="mt-1 text-white font-medium">{meta.tools_allowed}</p>
                  </div>
                )}

                {meta.device_requirement && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Device Requirement</span>
                    <p className="mt-1 text-white font-medium">{meta.device_requirement}</p>
                  </div>
                )}

                {meta.materials_provided && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Materials Provided by Fest</span>
                    <p className="mt-1 text-white font-medium">{meta.materials_provided}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* 8. Event Coordinators & Contacts */}
        {(coordinatorsList.length > 0 || meta.submitted_by) && (
          <div className="rounded-3xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Student Coordinators & Support</h2>
                <p className="text-xs text-white/50">Contact lead organizers for queries and assistance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {coordinatorsList.map((coord, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1.5 text-xs"
                >
                  <p className="font-bold text-white text-sm">{coord.name}</p>
                  {coord.role && <p className="text-[11px] text-cyan-300">{coord.role}</p>}
                  {coord.phone && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Phone className="h-3 w-3 text-cyan-300" />
                      <a href={`tel:${coord.phone}`} className="hover:text-white">
                        {coord.phone}
                      </a>
                    </div>
                  )}
                  {coord.email && (
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail className="h-3 w-3 text-cyan-300" />
                      <a href={`mailto:${coord.email}`} className="hover:text-white">
                        {coord.email}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {meta.submitted_by && (
              <p className="mt-4 font-mono text-[11px] text-white/40">
                Submitted by: {meta.submitted_by}
              </p>
            )}
          </div>
        )}

        {/* Create Team Modal */}
        {showTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c121d] p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white">Create Team for {event.title}</h3>
              <p className="mt-2 text-xs text-white/60">
                You will be assigned as the Team Leader. You can invite {event.min_team_size - 1} to{" "}
                {event.max_team_size - 1} additional members.
              </p>

              {teamError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  {teamError}
                </div>
              )}

              <form onSubmit={handleCreateTeamSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/80">
                    Team Name <span className="text-cyan-300">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. CyberKnights"
                    minLength={2}
                    maxLength={50}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTeamModal(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam}
                    className="rounded-xl bg-cyan-300 px-5 py-2 text-xs font-semibold text-black hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {creatingTeam ? "Creating..." : "Confirm & Continue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
