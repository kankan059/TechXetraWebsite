"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import type { EventItem, FestCatalog } from "@/types/api";
import {
  CATEGORIES,
  DAY_FILTERS,
  TEAM_FILTERS,
  DIRECTORY_COPY,
} from "@/data/event-directory";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

function shuffleEvents<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getCategoryTone(category: string) {
  const normalized = category.toUpperCase();

  if (normalized === "E_SPORTS" || normalized === "ESPORTS") {
    return {
      background: "#142C25",
      border: "border-emerald-300/20",
      accent: "text-emerald-300",
      mutedAccent: "text-emerald-200/70",
      hover: "hover:border-emerald-300/50",
      button: "hover:text-emerald-200",
      code: "ES",
    };
  }

  if (normalized === "TECHNICAL") {
    return {
      background: "#142630",
      border: "border-sky-300/20",
      accent: "text-sky-300",
      mutedAccent: "text-sky-200/70",
      hover: "hover:border-sky-300/50",
      button: "hover:text-sky-200",
      code: "TX",
    };
  }

  return {
    background: "#301B22",
    border: "border-rose-300/20",
    accent: "text-rose-300",
    mutedAccent: "text-rose-200/70",
    hover: "hover:border-rose-300/50",
    button: "hover:text-rose-200",
    code: "NX",
  };
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPrice(event: EventItem) {
  if (event.price_model === "FREE") return "Free entry";

  const price = (event.price_paise / 100).toFixed(0);
  return `₹${price} ${
    event.price_model === "PER_PARTICIPANT" ? "/ person" : "/ team"
  }`;
}

export default function EventsDirectory() {
  const pageRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const [catalog, setCatalog] = useState<FestCatalog | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [teamFilter, setTeamFilter] = useState<"ALL" | "SOLO" | "TEAM">(
    "ALL"
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const catalogRequest = fetch(`${API_BASE}/api/catalog/passes`, {
        credentials: "include",
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json();
        })
        .then((data) => {
          if (data?.success) setCatalog(data.data);
        })
        .catch(() => null);

      const params = new URLSearchParams();

      if (selectedCategory !== "ALL") {
        params.set("category", selectedCategory);
      }

      if (selectedDay !== "ALL") {
        params.set("day", selectedDay);
      }

      if (teamFilter === "SOLO") params.set("is_team", "false");
      if (teamFilter === "TEAM") params.set("is_team", "true");
      if (search.trim()) params.set("search", search.trim());

      params.set("limit", "50");

      const response = await fetch(
        `${API_BASE}/api/events?${params.toString()}`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load events.");
      }

      const fetchedEvents: EventItem[] = data.data?.events || [];
      setEvents(shuffleEvents(fetchedEvents));

      await catalogRequest;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading events."
      );
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedDay, teamFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (loading || reduceMotion || !pageRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-directory-card]",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.07,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }, pageRef);

    return () => context.revert();
  }, [loading, reduceMotion, events]);

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedDay("ALL");
    setTeamFilter("ALL");
  };

  return (
    <main
      ref={pageRef}
      className="min-h-svh overflow-x-clip bg-[#09151B] px-5 pb-24 pt-9 text-[#F5F0DE] [font-family:var(--font-gotham-book)] sm:px-8 sm:pt-20 lg:px-12 lg:pt-28"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Gate pass */}
        {catalog && (
          <section className="mb-14 border border-white/10 bg-[#101F26] p-5 sm:p-8 lg:p-9">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-4 text-[9px] uppercase tracking-[0.18em] text-sky-300 [font-family:var(--font-pixel)]">
                  {DIRECTORY_COPY.passEyebrow}
                </p>

                <h2 className="text-3xl leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl [font-family:var(--font-gotham-bold)]">
                  TechXetra <span className="text-sky-300">2026</span>
                  <span className="mt-1 block text-white/70">
                    {DIRECTORY_COPY.passTitle}
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                  {DIRECTORY_COPY.passDescription}
                </p>

                {catalog.fest_days?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {catalog.fest_days.map((day) => (
                      <span
                        key={day.day_number}
                        className="border border-white/10 px-3 py-2 text-xs text-white/60"
                      >
                        <span className="text-sky-300">
                          DAY 0{day.day_number}
                        </span>
                        <span className="mx-2 text-white/20">/</span>
                        {day.date}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-5 lg:flex-col lg:items-start">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-white/45 [font-family:var(--font-pixel)]">
                    {DIRECTORY_COPY.passPriceLabel}
                  </p>

                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-3xl text-sky-300 [font-family:var(--font-gotham-bold)]">
                      ₹
                      {(
                        (catalog.gate_pass.student_price_paise ?? 0) / 100
                      ).toFixed(0)}
                    </span>
                    <span className="text-xs text-white/45">Student</span>
                  </div>

                  <p className="mt-1 text-xs text-white/50">
                    General: ₹
                    {(catalog.gate_pass.price_paise / 100).toFixed(0)}
                  </p>
                </div>

                <Link
                  href="/checkout"
                  className="inline-flex min-h-12 items-center justify-between gap-8 bg-[#D6E8E9] px-5 py-3 text-xs text-[#10242B] transition-colors hover:bg-white [font-family:var(--font-gotham-bold)]"
                >
                  {DIRECTORY_COPY.passButton}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Heading */}
        <header className="mb-9 border-b border-white/15 pb-8 sm:mb-12 sm:pb-10">
          <p className="mb-4 text-[9px] uppercase tracking-[0.18em] text-sky-300 [font-family:var(--font-pixel)]">
            {DIRECTORY_COPY.eyebrow}
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-[clamp(2.4rem,6.8vw,5.6rem)] leading-[1.04] tracking-[-0.045em] [font-family:var(--font-gotham-bold)]">
                {DIRECTORY_COPY.title}
              </h1>

              <p className="mt-4 max-w-[52ch] text-sm leading-[1.8] text-white/65 sm:text-base">
                {DIRECTORY_COPY.description}
              </p>
            </div>

            <Link
              href="/leaderboards"
              className="inline-flex min-h-11 w-fit items-center gap-4 text-xs text-white/65 transition-colors hover:text-sky-300"
            >
              {DIRECTORY_COPY.leaderboardLink}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Filters */}
        <section className="mb-10 border border-white/10 bg-[#101F26] p-4 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-12">
            <label className="block lg:col-span-5">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.15em] text-white/45 [font-family:var(--font-pixel)]">
                Search events
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by event name or keyword"
                className="min-h-12 w-full border border-white/10 bg-[#09151B] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/60"
              />
            </label>

            <div className="lg:col-span-4">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.15em] text-white/45 [font-family:var(--font-pixel)]">
                Festival day
              </span>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {DAY_FILTERS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setSelectedDay(day.value)}
                    className={`min-h-12 shrink-0 border px-3 text-xs transition-colors ${
                      selectedDay === day.value
                        ? "border-sky-300 bg-sky-300 text-[#09151B]"
                        : "border-white/10 text-white/60 hover:border-sky-300/50 hover:text-white"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.15em] text-white/45 [font-family:var(--font-pixel)]">
                Participation
              </span>

              <div className="flex gap-2">
                {TEAM_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setTeamFilter(item.value as "ALL" | "SOLO" | "TEAM")
                    }
                    className={`min-h-12 flex-1 border px-2 text-xs transition-colors ${
                      teamFilter === item.value
                        ? "border-sky-300 bg-sky-300 text-[#09151B]"
                        : "border-white/10 text-white/60 hover:border-sky-300/50 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setSelectedCategory(category.value)}
                className={`border px-3 py-2 text-xs transition-colors ${
                  selectedCategory === category.value
                    ? "border-sky-300 bg-sky-300 text-[#09151B]"
                    : "border-white/10 text-white/60 hover:border-sky-300/50 hover:text-white"
                }`}
              >
                {category.label}
              </button>
            ))}

            {(search ||
              selectedCategory !== "ALL" ||
              selectedDay !== "ALL" ||
              teamFilter !== "ALL") && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto px-3 py-2 text-xs text-white/60 underline underline-offset-4 transition-colors hover:text-sky-300"
              >
                Reset filters
              </button>
            )}
          </div>
        </section>

        {/* Result count and error */}
        {error && (
          <div
            role="alert"
            className="mb-6 border border-rose-300/25 bg-rose-300/[0.06] p-4 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        <div className="mb-5 flex items-center gap-4">
          <p className="text-[9px] uppercase tracking-[0.15em] text-white/50 [font-family:var(--font-pixel)]">
            {loading ? "Loading events" : `${events.length} events found`}
          </p>
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[9px] text-white/35 [font-family:var(--font-pixel)]">
            TECHXETRA / 2026
          </span>
        </div>

        {/* Event cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[360px] animate-pulse border border-white/10 bg-[#101F26]"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="border border-dashed border-white/15 px-6 py-20 text-center">
            <h2 className="text-2xl [font-family:var(--font-gotham-bold)]">
              No matching events.
            </h2>

            <p className="mt-3 text-sm text-white/55">
              Try a different category, day, or search term.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 min-h-11 border border-sky-300/40 px-5 text-xs text-sky-200 transition-colors hover:bg-sky-300 hover:text-[#09151B]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {events.map((event, index) => {
              const tone = getCategoryTone(event.category);

              const seatsAvailable =
                event.seats_remaining != null
                  ? `${event.seats_remaining} slots left`
                  : "Open entry";

              return (
                <motion.article
                  key={event.id}
                  data-directory-card
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(index * 0.035, 0.2),
                  }}
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-[#101F26] transition-colors duration-300 ${tone.border} ${tone.hover}`}
                  style={{ backgroundColor: tone.background }}
                >
                  {/* Card header */}
                  <Link
                    href={`/events/${event.slug || event.id}`}
                    aria-label={`View ${event.title}`}
                    className="block border-b border-white/10 p-5 text-left sm:p-6"
                  >
                    <div className="mb-8 flex items-center justify-between gap-3">
                      <span className="text-[9px] uppercase tracking-[0.16em] text-white/45 [font-family:var(--font-pixel)]">
                        TECHXETRA 2026
                      </span>

                      <span
                        className={`text-[9px] tracking-[0.12em] ${tone.accent} [font-family:var(--font-pixel)]`}
                      >
                        {tone.code}-{String(index + 1).padStart(3, "0")}
                      </span>
                    </div>

                    <p
                      className={`mb-3 text-[9px] uppercase tracking-[0.15em] ${tone.accent} [font-family:var(--font-pixel)]`}
                    >
                      {event.category.replaceAll("_", " ")}
                    </p>

                    <h2 className="text-[22px] leading-tight tracking-[-0.025em] text-[#F5F0DE] transition-colors duration-300 [font-family:var(--font-gotham-bold)]">
                      {event.title}
                    </h2>

                    <p className="mt-3 line-clamp-3 text-[13px] leading-[1.8] text-white/70">
                      {event.description ||
                        "Event details and participation rules are available on the event page."}
                    </p>
                  </Link>

                  {/* Event details */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.13em] text-white/45 [font-family:var(--font-pixel)]">
                          Event day
                        </p>
                        <p className={`mt-2 text-sm ${tone.mutedAccent}`}>
                          Day {event.day_of_event}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.13em] text-white/45 [font-family:var(--font-pixel)]">
                          Participation
                        </p>
                        <p className="mt-2 text-sm text-white/80">
                          {event.is_team_event
                            ? `Team · ${event.min_team_size}–${event.max_team_size}`
                            : "Solo"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.13em] text-white/45 [font-family:var(--font-pixel)]">
                          Entry fee
                        </p>
                        <p className="mt-2 text-sm text-white/85">
                          {formatPrice(event)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.13em] text-white/45 [font-family:var(--font-pixel)]">
                          Availability
                        </p>
                        <p className={`mt-2 text-sm ${tone.mutedAccent}`}>
                          {seatsAvailable}
                        </p>
                      </div>
                    </div>

                    {event.venue && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[9px] uppercase tracking-[0.13em] text-white/45 [font-family:var(--font-pixel)]">
                          Venue
                        </p>
                        <p className="mt-2 break-words text-[13px] text-white/75">
                          {event.venue}
                        </p>
                      </div>
                    )}

                    {/* Bottom action */}
                    <div className="mt-auto pt-6">
                      <Link
                        href={`/events/${event.slug || event.id}`}
                        className={`flex min-h-12 items-center justify-between gap-4 border-t border-white/15 pt-4 text-xs text-white/85 transition-colors ${tone.button} [font-family:var(--font-gotham-bold)]`}
                      >
                        View event
                        <ArrowIcon className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
    </main>
  );
}