
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import type { EventItem, FestCatalog } from "@/types/api";
import EventCard from "@/components/sections/events/EventCard";
import { participantApi } from "@/services/participant-api";
import {
  CATEGORIES,
  DAY_FILTERS,
  TEAM_FILTERS,
  DIRECTORY_COPY,
} from "@/data/event-directory";

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

  if (normalized === "INTERACTIVE") {
    return {
      background: "#282315",
      border: "border-amber-300/20",
      accent: "text-amber-300",
      mutedAccent: "text-amber-200/70",
      hover: "hover:border-amber-300/50",
      button: "hover:text-amber-200",
      code: "IX",
    };
  }

  if (normalized === "RECREATIONAL") {
    return {
      background: "#132824",
      border: "border-teal-300/20",
      accent: "text-teal-300",
      mutedAccent: "text-teal-200/70",
      hover: "hover:border-teal-300/50",
      button: "hover:text-teal-200",
      code: "RX",
    };
  }

  if (normalized === "SHOWCASE") {
    return {
      background: "#24182E",
      border: "border-purple-300/20",
      accent: "text-purple-300",
      mutedAccent: "text-purple-200/70",
      hover: "hover:border-purple-300/50",
      button: "hover:text-purple-200",
      code: "SX",
    };
  }

  if (normalized === "CULTURAL") {
    return {
      background: "#301B22",
      border: "border-rose-300/20",
      accent: "text-rose-300",
      mutedAccent: "text-rose-200/70",
      hover: "hover:border-rose-300/50",
      button: "hover:text-rose-200",
      code: "CL",
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

export default function EventsDirectory() {
  const router = useRouter();
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

      const catalogRequest = participantApi.catalog.passes()
        .then((data) => {
          if (data) setCatalog(data);
        })
        .catch(() => null);

      const queryParams: Record<string, string | number | boolean | undefined> = {};

      if (selectedCategory !== "ALL") {
        queryParams.category = selectedCategory;
      }

      if (selectedDay !== "ALL") {
        queryParams.day = Number(selectedDay);
      }

      if (teamFilter === "SOLO") {
        queryParams.is_team = false;
      }

      if (teamFilter === "TEAM") {
        queryParams.is_team = true;
      }

      if (search.trim()) {
        queryParams.search = search.trim();
      }

      queryParams.limit = 50;

      const data = await participantApi.events.list(queryParams);
      const fetchedEvents: EventItem[] = data.events;
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

  const handleEventSelect = (event: EventItem) => {
    router.push(`/events/${event.slug || event.id}`);
  };

  return (
    <main
      ref={pageRef}
      className="min-h-svh overflow-x-clip  px-5 pb-24 pt-9 text-[#F5F0DE] [font-family:var(--font-gotham-book)] sm:px-8 sm:pt-20 lg:px-12 lg:pt-28"
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

                {catalog.festDays?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {catalog.festDays.map((day) => (
                      <span
                        key={day.dayNumber}
                        className="border border-white/10 px-3 py-2 text-xs text-white/60"
                      >
                        <span className="text-sky-300">
                          DAY 0{day.dayNumber}
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
                        (catalog.gatePassStudentPricePaise ?? 0) / 100
                      ).toFixed(0)}
                    </span>
                    <span className="text-xs text-white/45">Student</span>
                  </div>

                  <p className="mt-1 text-xs text-white/50">
                    General: ₹
                    {(catalog.gatePassPricePaise / 100).toFixed(0)}
                  </p>
                </div>

                <Link
                  href="/checkout"
                  className="cursor-pointer inline-flex min-h-12 items-center justify-between gap-8 bg-[#D6E8E9] px-5 py-3 text-xs text-[#10242B] transition-colors hover:bg-white [font-family:var(--font-gotham-bold)]"
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
              className="cursor-pointer inline-flex min-h-11 w-fit items-center gap-4 text-xs text-white/65 transition-colors hover:text-sky-300"
            >
              {DIRECTORY_COPY.leaderboardLink}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Filters */}
        <section className="relative mb-10 overflow-hidden border border-white/10 bg-[#0B181E] p-4 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 border-r border-t border-[#55DFFF]/20" />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#55DFFF] [font-family:var(--font-pixel)]">
                Event database
              </p>
              <h2 className="mt-2 text-xl tracking-tight text-[#F5F0DE] sm:text-2xl [font-family:var(--font-gotham-bold)]">
                Find your event<span className="text-[#55DFFF]">.</span>
              </h2>
            </div>

            <span className="border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] uppercase tracking-wider text-white/45 [font-family:var(--font-pixel)]">
              TX / 26
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Search */}
            <label className="block lg:col-span-5">
              <span className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/50 [font-family:var(--font-pixel)]">
                <span className="h-1.5 w-1.5 bg-[#55DFFF]" />
                Search events
              </span>

              <div
                className="group relative flex min-h-[54px] items-center border border-white/10 bg-[#09151B] transition-colors duration-300 focus-within:border-[#55DFFF]/70"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)",
                }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-4 h-[18px] w-[18px] shrink-0 text-white/35 transition-colors group-focus-within:text-[#55DFFF]"
                >
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="6.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m16 16 4.2 4.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Event name, keyword..."
                  aria-label="Search events by name or keyword"
                  className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm text-[#F5F0DE] outline-none placeholder:text-white/25 [font-family:var(--font-gotham-book)]"
                />

                <span className="mr-3 hidden text-[8px] uppercase tracking-wider text-white/25 sm:block [font-family:var(--font-pixel)]">
                  Search
                </span>
              </div>
            </label>

            {/* Festival Day */}
            <div className="lg:col-span-4">
              <span className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/50 [font-family:var(--font-pixel)]">
                <span className="h-1.5 w-1.5 bg-[#FF806E]" />
                Festival day
              </span>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {DAY_FILTERS.map((day) => {
                  const active = selectedDay === day.value;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setSelectedDay(day.value)}
                      aria-pressed={active}
                      className={`cursor-pointer relative min-h-[54px] min-w-[58px] shrink-0 border px-4 text-[10px] uppercase tracking-wider transition-all duration-200 [font-family:var(--font-gotham-bold)] ${active
                          ? "border-[#55DFFF] bg-[#55DFFF] text-[#09151B]"
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-[#55DFFF]/50 hover:text-[#55DFFF]"
                        }`}
                      style={{
                        clipPath:
                          "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
                      }}
                    >
                      {day.label}
                      {active && (
                        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 bg-[#09151B]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Participation */}
            <div className="lg:col-span-3">
              <span className="mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/50 [font-family:var(--font-pixel)]">
                <span className="h-1.5 w-1.5 bg-[#8FE388]" />
                Participation
              </span>

              <div className="flex gap-2">
                {TEAM_FILTERS.map((item) => {
                  const active = teamFilter === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setTeamFilter(item.value as "ALL" | "SOLO" | "TEAM")
                      }
                      aria-pressed={active}
                      className={`cursor-pointer min-h-[54px] min-w-0 flex-1 border px-2 text-[9px] uppercase tracking-wider transition-all duration-200 [font-family:var(--font-gotham-bold)] ${active
                          ? "border-[#8FE388] bg-[#8FE388] text-[#09151B]"
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-[#8FE388]/50 hover:text-[#8FE388]"
                        }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/50 [font-family:var(--font-pixel)]">
                Browse by category
              </span>

              <span className="text-[9px] uppercase tracking-wider text-white/25 [font-family:var(--font-pixel)]">
                Select a track
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const active = selectedCategory === category.value;

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    aria-pressed={active}
                    className={`cursor-pointer group inline-flex min-h-10 items-center gap-2 border px-3.5 py-2 text-[10px] transition-all duration-200 [font-family:var(--font-gotham-bold)] ${active
                        ? "border-[#55DFFF]/60 bg-[#55DFFF]/10 text-[#55DFFF]"
                        : "border-white/10 bg-transparent text-white/55 hover:border-white/25 hover:text-[#F5F0DE]"
                      }`}
                    style={{
                      clipPath:
                        "polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%)",
                    }}
                  >
                    <span
                      className={`h-1.5 w-1.5 transition-colors ${active
                          ? "bg-[#55DFFF]"
                          : "bg-white/20 group-hover:bg-white/60"
                        }`}
                    />
                    {category.label}
                  </button>
                );
              })}

              {(search ||
                selectedCategory !== "ALL" ||
                selectedDay !== "ALL" ||
                teamFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="cursor-pointer ml-auto inline-flex min-h-10 items-center gap-2 px-3 text-[9px] uppercase tracking-wider text-[#FF806E] transition-colors hover:text-[#FFAA9E] [font-family:var(--font-gotham-bold)]"
                  >
                    Reset filters
                    <span aria-hidden="true" className="text-sm">
                      ×
                    </span>
                  </button>
                )}
            </div>
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
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))",
                }}
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
              className="cursor-pointer mt-6 min-h-11 border border-sky-300/40 px-5 text-xs text-sky-200 transition-colors hover:bg-sky-300 hover:text-[#09151B]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {events.map((event, index) => (
              <motion.div
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
                className="min-w-0"
              >
                <EventCard
                  event={event}
                  index={index}
                  onSelect={(selectedEvent, _trigger) => {
                    handleEventSelect(selectedEvent);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}
