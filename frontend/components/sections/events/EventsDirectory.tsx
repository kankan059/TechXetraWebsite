"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Users,
  User,
  Ticket,
  Trophy,
  Tag,
  Clock,
  MapPin,
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { EventItem, FestCatalog, EventCategory } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "ALL" },
  { label: "Technical", value: "TECHNICAL" },
  { label: "Cultural", value: "CULTURAL" },
  { label: "E-Sports", value: "E_SPORTS" },
  { label: "Sports", value: "SPORTS" },
  { label: "Management", value: "MANAGEMENT" },
  { label: "Literary", value: "LITERARY" },
  { label: "Workshops", value: "WORKSHOP" },
  { label: "Other", value: "OTHER" },
];

export default function EventsDirectory() {
  const [catalog, setCatalog] = useState<FestCatalog | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<"ALL" | "SOLO" | "TEAM">("ALL");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch catalog passes (public)
      fetch(`${API_BASE}/api/catalog/passes`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setCatalog(d.data);
        })
        .catch(() => null);

      // 2. Build events query params
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (selectedDay !== "ALL") params.set("day", selectedDay);
      if (teamFilter === "SOLO") params.set("is_team", "false");
      if (teamFilter === "TEAM") params.set("is_team", "true");
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "50");

      const res = await fetch(`${API_BASE}/api/events?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load events directory");
      }

      setEvents(data.data?.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading events directory");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedDay, teamFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Fest Gate Pass Banner */}
      {catalog && (
        <section className="mb-10 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-950/40 via-[#0a1524] to-[#07090e] p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  ALL-ACCESS PASS
                </span>
                <span className="text-xs text-white/50">{catalog.gate_pass.validity}</span>
              </div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                TechXetra 2026 Festival Gate Pass
              </h2>
              <p className="max-w-xl text-xs text-white/70">
                Grants general entry to grounds, tech exhibitions, arenas, and cultural night pro-shows across all fest dates.
              </p>

              {/* Fest Days Schedule Timeline */}
              {catalog.fest_days?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2">
                  {catalog.fest_days.map((fd) => (
                    <span
                      key={fd.day_number}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/80"
                    >
                      Day {fd.day_number}: {fd.date}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center md:flex-col md:items-end">
              <div className="text-left md:text-right">
                <p className="text-xs text-white/50">From</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-cyan-300">
                    ₹{(catalog.gate_pass.student_price_paise / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-white/50">Student</span>
                  <span className="text-xs text-white/30">/</span>
                  <span className="text-sm font-semibold text-white/70">
                    ₹{(catalog.gate_pass.price_paise / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-white/50">General</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-xs font-bold text-black transition hover:bg-cyan-200"
              >
                <Ticket className="h-4 w-4" />
                Reserve Gate Pass
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Directory Title & Quick Links */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            DISCOVER & COMPETE
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Live Events Directory
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Browse technical hackathons, cultural contests, gaming tournaments, and workshops.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/leaderboards"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-amber-400/40 hover:text-amber-300"
          >
            <Trophy className="h-4 w-4 text-amber-400" />
            Tournament Leaderboards
          </Link>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Instant Search Bar */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by title or keyword..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-cyan-300/50 focus:bg-white/[0.07]"
            />
          </div>

          {/* Fest Day Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto md:col-span-3">
            {[
              { label: "All Days", value: "ALL" },
              { label: "Day 1", value: "1" },
              { label: "Day 2", value: "2" },
              { label: "Day 3", value: "3" },
            ].map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDay(d.value)}
                className={`shrink-0 rounded-xl px-3.5 py-3 text-xs font-semibold transition ${
                  selectedDay === d.value
                    ? "bg-cyan-300 text-black"
                    : "border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Team vs Solo Filter */}
          <div className="flex items-center gap-1.5 md:col-span-3">
            {[
              { label: "All", value: "ALL" },
              { label: "Solo", value: "SOLO" },
              { label: "Team", value: "TEAM" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTeamFilter(t.value as "ALL" | "SOLO" | "TEAM")}
                className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold transition ${
                  teamFilter === t.value
                    ? "bg-cyan-300 text-black"
                    : "border border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat.value
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/[0.02] text-white/60 hover:border-white/25 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Directory Grid */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-sm text-white/40">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
          Loading events catalog...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-white/40">
          <Filter className="mx-auto mb-3 h-10 w-10 text-white/20" />
          <p className="text-base font-semibold text-white">No matching events found</p>
          <p className="mt-1 text-xs text-white/40">
            Try adjusting your search criteria, category pill, or day filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory("ALL");
              setSelectedDay("ALL");
              setTeamFilter("ALL");
            }}
            className="mt-5 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs text-cyan-300 hover:bg-white/10"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => {
            const isFree = evt.price_model === "FREE";
            const priceLabel = isFree
              ? "Free Event"
              : `₹${(evt.price_paise / 100).toFixed(0)} ${
                  evt.price_model === "PER_PARTICIPANT" ? "/ person" : "/ team"
                }`;

            const seatsAvailable =
              evt.seats_remaining !== null
                ? `${evt.seats_remaining} slots left`
                : "Open Entry";

            return (
              <div
                key={evt.id}
                className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 transition duration-300 hover:border-cyan-300/40 hover:bg-white/[0.06]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                      DAY {evt.day_of_event}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-white/40">
                      {evt.category}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-white transition group-hover:text-cyan-200">
                    {evt.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/60">
                    {evt.description || "Detailed event rules and format available on detail page."}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-white/5 pt-4 text-xs text-white/50">
                    {evt.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-white/30" />
                        <span>{evt.venue}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {evt.is_team_event ? (
                        <>
                          <Users className="h-3.5 w-3.5 text-white/30" />
                          <span>
                            Team of {evt.min_team_size}–{evt.max_team_size} members
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="h-3.5 w-3.5 text-white/30" />
                          <span>Solo Participation</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-white/90">{priceLabel}</span>
                      <span className="text-[11px] text-cyan-300/80">{seatsAvailable}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <Link
                    href={`/events/${evt.slug || evt.id}`}
                    className="inline-flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-300 hover:text-black"
                  >
                    <span>View & Register</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
