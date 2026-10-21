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
} from "lucide-react";
import type { EventItem, UserProfile } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

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

        // Try fetching single event details first
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

        // If not a single event, check if it's a category match (e.g. non-technical, esports, cultural)
        const normalizedCategory = slug.toUpperCase().replace("-", "_");
        const catRes = await fetch(`${API_BASE}/api/events?category=${encodeURIComponent(normalizedCategory)}`, {
          credentials: "include",
        });

        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.success && Array.isArray(catData.data?.events) && catData.data.events.length > 0) {
            setCategoryEvents(catData.data.events);
            setIsCategoryView(true);
            return;
          }
        }

        // Fallback: list all events and see if slug matches title
        const listRes = await fetch(`${API_BASE}/api/events`, { credentials: "include" });
        if (listRes.ok) {
          const listData = await listRes.json();
          const matched = listData.data?.events?.find(
            (e: EventItem) => e.slug === slug || e.id === slug
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
      // Create purchase reservation
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
        // Free event auto-registered
        router.push("/dashboard");
      } else {
        // Proceed to UPI payment screen
        router.push(`/checkout/${data.data.id}/pay`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Registration error");
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }
    if (!user.profile_complete) {
      router.push("/profile-completion");
      return;
    }
    if (!event || !teamName.trim()) return;

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

      // Navigate to team roster page
      router.push(`/teams/${data.data.id}`);
    } catch (err: unknown) {
      setTeamError(err instanceof Error ? err.message : "Error creating team");
    } finally {
      setCreatingTeam(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-16 w-3/4 rounded-2xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error || (!event && !isCategoryView)) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
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

  // Category view (if slug was e.g. esports or non-technical)
  if (isCategoryView) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
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
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-300/40"
              >
                <span className="text-[10px] font-semibold uppercase text-cyan-300">
                  Day {item.day_of_event} · {item.category}
                </span>
                <h2 className="mt-2 text-xl font-bold text-white">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-xs text-white/60">{item.description}</p>

                <div className="mt-auto pt-6">
                  <Link
                    href={`/events/${item.slug || item.id}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    View details & Register
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

  const priceFormatted =
    event.price_model === "FREE"
      ? "FREE"
      : `₹${(event.price_paise / 100).toFixed(0)} (${event.price_model === "PER_PARTICIPANT" ? "Per Person" : "Per Team"})`;

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        {/* Header Banner */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
              {event.category}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
              Day {event.day_of_event}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                event.status === "OPEN"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-amber-400/10 text-amber-300"
              }`}
            >
              {event.status}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {event.title}
          </h1>

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
                View Tournament Leaderboard
              </Link>
            )}
          </div>
        </div>

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
