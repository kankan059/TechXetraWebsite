"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { EventItem, FestCatalog } from "@/types/api";
import EventCard from "@/components/sections/events/EventCard";
import EventDetailsModal from "@/components/sections/events/EventDetailsModal";
import { participantApi } from "@/services/participant-api";
import {
  CATEGORIES,
  DAY_FILTERS,
  TEAM_FILTERS,
  DIRECTORY_COPY,
} from "@/data/event-directory";

gsap.registerPlugin(ScrollTrigger);

function shuffleEvents<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const STAR_PATH = "M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z";

function StarGlyph({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Constellation field (canvas, viewport sized, pointer links)         */
/* ------------------------------------------------------------------ */

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

function ConstellationField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let nodes: FieldNode[] = [];
    const pointer = { x: -9999, y: -9999 };

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cap = w < 700 ? 36 : 68;
      const count = Math.round(Math.min(cap, Math.max(22, (w * h) / 21000)));

      nodes = Array.from({ length: count }, () => {
        const y = Math.random() * h;
        return {
          x: Math.random() * w,
          y,
          py: y,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          z: 0.35 + Math.random() * 0.65,
          r: 0.6 + Math.random() * 1.4,
        };
      });
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, w, h);
      const scrollY = window.scrollY;
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 160);
      const link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx * dt * n.z;
        n.y += n.vy * dt * n.z;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < 0) n.y += h;
        else if (n.y > h) n.y -= h;
        n.py = (((n.y - scrollY * 0.14 * n.z) % h) + h) % h;
      }

      ctx.lineWidth = 0.7;

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.32 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(160,200,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.py);
          ctx.lineTo(b.x, b.py);
          ctx.stroke();
        }
      }

      if (pointer.x > -999) {
        const reach = link * 1.4;
        const reach2 = reach * reach;
        for (const n of nodes) {
          const dx = n.x - pointer.x;
          const dy = n.py - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          const alpha = (1 - d2 / reach2) * 0.45;
          ctx.strokeStyle = `rgba(205,228,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.52 * n.z) * twinkle;
        ctx.fillStyle = `rgba(225,238,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.py, n.r * n.z + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 16.67, 3);
      last = ts;
      draw(dt, ts);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        setup();
        if (reduce) draw(0, 0);
      });
    });

    setup();
    if (reduce) draw(0, 0);
    else start();

    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer && !reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/* Scoped styles                                                       */
/* ------------------------------------------------------------------ */

const css = `
.ed-orbit{animation:ed-orbit 150s linear infinite}
.ed-cue-dot{animation:ed-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}
.ed-lift{transition:transform .5s cubic-bezier(.22,1,.36,1)}
@media (hover:hover) and (pointer:fine){.ed-lift:hover{transform:translateY(-4px)}}
.ed-search{transition:border-color .3s ease,box-shadow .3s ease,background .3s ease}
.ed-search:focus-within{border-color:rgba(85,223,255,.75);background:rgba(6,12,26,.92);box-shadow:0 0 0 3px rgba(85,223,255,.12)}
.ed-scroll::-webkit-scrollbar{width:6px}
.ed-scroll::-webkit-scrollbar-thumb{background:rgba(190,214,255,.18);border-radius:9999px}
@keyframes ed-orbit{to{transform:rotate(360deg)}}
@keyframes ed-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}
@media (prefers-reduced-motion:reduce){
  .ed-orbit,.ed-cue-dot{animation:none!important}
  .ed-lift,.ed-search{transition:none!important}
}
`;

const panel =
  "rounded-2xl border border-[#BED6FF]/[0.12] bg-gradient-to-b from-[#0e1630]/88 to-[#060a16]/92 shadow-[0_30px_70px_-42px_rgba(0,0,0,0.95)]";
const groupLabel =
  "mb-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/60 [font-family:var(--font-pixel)]";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function EventsDirectory() {
  const pageRef = useRef<HTMLElement>(null);

  const [catalog, setCatalog] = useState<FestCatalog | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDay, setSelectedDay] = useState("ALL");
  const [teamFilter, setTeamFilter] = useState<"ALL" | "SOLO" | "TEAM">(
    "ALL"
  );
  const [showPassModal, setShowPassModal] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  /* Hero entrance and scroll-scrubbed exit */
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const media = gsap.matchMedia();

    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const hero = page.querySelector<HTMLElement>("[data-hero]");
        const inner = page.querySelector<HTMLElement>("[data-hero-inner]");
        if (!hero || !inner) return;

        gsap.from(Array.from(inner.children), {
          y: 32,
          opacity: 0,
          duration: 1.1,
          stagger: 0.1,
          ease: "power3.out",
        });

        gsap.to(inner, {
          yPercent: -10,
          opacity: 0.1,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      },
      page,
    );

    return () => media.revert();
  }, []);

  /* Cards reveal as they scroll into view (batched, runs once per card) */
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (loading || !page) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-directory-card]");
      if (reduce || !cards.length) return;

      gsap.set(cards, { y: 34, opacity: 0 });

      ScrollTrigger.batch(cards, {
        start: "top 94%",
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.75,
            stagger: 0.08,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform,opacity",
          });
        },
      });
    }, page);

    return () => context.revert();
  }, [loading, events]);

  useEffect(() => {
    if (!showPassModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPassModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPassModal]);

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedDay("ALL");
    setTeamFilter("ALL");
  };

  const handleEventSelect = (event: EventItem) => {
    setSelectedEvent(event);
  };

  const hasFilters = Boolean(
    search || selectedCategory !== "ALL" || selectedDay !== "ALL" || teamFilter !== "ALL"
  );

  const activeFilterCount = [
    search.trim() !== "",
    selectedCategory !== "ALL",
    selectedDay !== "ALL",
    teamFilter !== "ALL",
  ].filter(Boolean).length;

  const categoryLabel = CATEGORIES.find((c) => c.value === selectedCategory)?.label;
  const dayLabel = DAY_FILTERS.find((d) => d.value === selectedDay)?.label;
  const teamLabel = TEAM_FILTERS.find((t) => t.value === teamFilter)?.label;

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) activeChips.push({ key: "search", label: `Search: ${search.trim()}`, clear: () => setSearch("") });
  if (selectedCategory !== "ALL") activeChips.push({ key: "category", label: categoryLabel ?? selectedCategory, clear: () => setSelectedCategory("ALL") });
  if (selectedDay !== "ALL") activeChips.push({ key: "day", label: dayLabel ?? selectedDay, clear: () => setSelectedDay("ALL") });
  if (teamFilter !== "ALL") activeChips.push({ key: "team", label: teamLabel ?? teamFilter, clear: () => setTeamFilter("ALL") });

  return (
    <main
      ref={pageRef}
      className="relative isolate min-h-svh overflow-x-clip bg-black text-[#F5F0DE] [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #0a1430 0%, #04060f 54%, #000000 100%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 80% 62%, rgba(179,164,255,0.1) 0%, transparent 58%)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.15) 64%, rgba(0,0,0,0.78) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)" }}
          />
          <ConstellationField />
        </div>
      </div>

      {/* Hero */}
      <header
        data-hero
        className="relative flex min-h-[78svh] flex-col items-center justify-center overflow-hidden px-5 pb-14 pt-36 text-center sm:px-8 sm:pt-32"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="ed-orbit" style={{ width: "min(120vw, 960px)", height: "min(120vw, 960px)" }}>
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
              <circle cx="200" cy="200" r="190" stroke="#8FB4FF" strokeOpacity="0.28" strokeDasharray="1 7" />
              <circle cx="200" cy="200" r="142" stroke="#8FB4FF" strokeOpacity="0.2" strokeDasharray="2 11" />
              <circle cx="390" cy="200" r="3" fill="#CFE0FF" />
              <circle cx="58" cy="262" r="2.2" fill="#CFE0FF" />
            </svg>
          </div>
        </div>

        <div data-hero-inner className="relative flex w-full max-w-3xl flex-col items-center">
          <p className="mb-6 flex items-center gap-3 text-[9px] uppercase tracking-[0.34em] text-[#A9B5E8]/85 sm:text-[10px] [font-family:var(--font-pixel)]">
            <StarGlyph className="h-2.5 w-2.5 text-[#55DFFF]" />
            {DIRECTORY_COPY.eyebrow}
            <StarGlyph className="h-2.5 w-2.5 text-[#55DFFF]" />
          </p>

          <h1 className="m-0 bg-gradient-to-b from-[#FFFFFF] via-[#D4D5DE] to-[#5E6272] bg-clip-text text-[clamp(2.6rem,9vw,6.4rem)] font-normal leading-[0.98] tracking-[-0.055em] text-transparent font-roboto">
            {DIRECTORY_COPY.title}
          </h1>

          <p className="mt-6 max-w-[54ch] text-sm leading-[1.8] text-white/70 sm:text-base">
            {DIRECTORY_COPY.description}
          </p>

          {/* Primary search */}
          <label className="mt-9 block w-full max-w-xl text-left">
            <span className="sr-only">Search events by name or keyword</span>
            <div className="ed-search group relative flex min-h-[58px] items-center rounded-2xl border border-[#BED6FF]/20 bg-[#050b18]/85">
              <SearchIcon className="ml-5 h-5 w-5 shrink-0 text-white/45 transition-colors group-focus-within:text-[#55DFFF]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by event name or keyword"
                aria-label="Search events by name or keyword"
                className="min-w-0 flex-1 bg-transparent px-3 py-4 text-base text-[#F5F0DE] outline-none placeholder:text-white/35 [font-family:var(--font-gotham-book)] [&::-webkit-search-cancel-button]:hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="mr-2.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>

          <Link
            href="/leaderboards"
            className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-[#BED6FF]/20 px-5 text-xs text-white/75 transition-colors hover:border-[#55DFFF]/60 hover:text-[#8BEAFF] focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
          >
            {DIRECTORY_COPY.leaderboardLink}
            <ArrowIcon className="h-4 w-4" />
          </Link>

          <div className="mt-10 flex flex-col items-center gap-3">
            <span className="text-[9px] tracking-[0.26em] text-white/45 [font-family:var(--font-pixel)]">SCROLL TO EXPLORE</span>
            <span className="relative block h-11 w-px overflow-hidden bg-white/15">
              <span className="ed-cue-dot absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent via-[#BFD4FF] to-transparent" />
            </span>
          </div>
        </div>
      </header>

      {/* Directory */}
      <div className="mx-auto max-w-[1320px] px-5 pb-28 pt-6 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
          {/* Filters */}
          <aside aria-label="Event filters" className="mb-8 lg:mb-0 lg:self-start">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="event-filters"
              className={`${panel} flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 text-sm text-white/85 focus-visible:outline-2 focus-visible:outline-[#55DFFF] lg:hidden`}
            >
              <span className="flex items-center gap-3">
                <SlidersIcon className="h-5 w-5 text-[#55DFFF]" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#55DFFF] px-2 py-0.5 text-[11px] font-semibold text-[#04101a]">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className={`h-4 w-4 transition-transform duration-300 ${filtersOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div
              id="event-filters"
              className={`${panel} ed-scroll mt-3 p-5 lg:sticky lg:top-28 lg:mt-0 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto ${filtersOpen ? "block" : "hidden"} lg:block`}
            >
              <div className="mb-6 hidden items-center gap-2.5 text-[#55DFFF] lg:flex">
                <StarGlyph className="h-3 w-3" />
                <p className="text-[10px] uppercase tracking-[0.22em] [font-family:var(--font-pixel)]">Refine events</p>
              </div>

              {/* Festival day */}
              <div>
                <span className={groupLabel}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF806E]" />
                  Festival day
                </span>
                <div className="flex flex-wrap gap-2">
                  {DAY_FILTERS.map((day) => {
                    const active = selectedDay === day.value;

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setSelectedDay(day.value)}
                        aria-pressed={active}
                        className={`min-h-10 cursor-pointer rounded-xl border px-4 text-[11px] uppercase tracking-wider transition-colors duration-200 font-pixel focus-visible:outline-2 focus-visible:outline-[#55DFFF] ${
                          active
                            ? "border-[#55DFFF] bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] text-[#04101a]"
                            : "border-[#BED6FF]/[0.16] bg-white/[0.025] text-white/70 hover:border-[#55DFFF]/60 hover:text-[#8BEAFF]"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Participation */}
              <div className="mt-7">
                <span className={groupLabel}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8FE388]" />
                  Participation
                </span>
                <div className="grid grid-cols-3 gap-2">
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
                        className={`min-h-10 min-w-0 cursor-pointer rounded-xl border px-2 text-[10px] uppercase tracking-wider transition-colors duration-200 [font-family:var(--font-pixel)] focus-visible:outline-2 focus-visible:outline-[#8FE388] ${
                          active
                            ? "border-[#8FE388] bg-[#8FE388] text-[#07140a]"
                            : "border-[#BED6FF]/[0.16] bg-white/[0.025] text-white/70 hover:border-[#8FE388]/60 hover:text-[#8FE388]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div className="mt-7">
                <span className={groupLabel}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B3A4FF]" />
                  Browse by category
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const active = selectedCategory === category.value;

                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setSelectedCategory(category.value)}
                        aria-pressed={active}
                        className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[11px] transition-colors duration-200 [font-family:var(--font-pixel)] focus-visible:outline-2 focus-visible:outline-[#B3A4FF] ${
                          active
                            ? "border-[#B3A4FF] bg-[#B3A4FF]/[0.16] text-[#D5CCFF]"
                            : "border-[#BED6FF]/[0.16] text-white/70 hover:border-[#B3A4FF]/60 hover:text-white"
                        }`}
                      >
                        {active && <StarGlyph className="h-2.5 w-2.5" />}
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-7 inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#FF806E]/40 text-[11px] uppercase tracking-wider text-[#FF9A8A] transition-colors hover:bg-[#FF806E]/10 hover:text-[#FFB8AC] focus-visible:outline-2 focus-visible:outline-[#FF806E] [font-family:var(--font-gotham-bold)]"
                >
                  Reset filters
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </aside>

          {/* Results */}
          <section aria-label="Events" className="min-w-0">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-rose-300/30 bg-rose-300/[0.07] p-4 text-sm leading-6 text-rose-200"
              >
                {error}
              </div>
            )}

            <div className="mb-4 flex items-center gap-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/65 [font-family:var(--font-pixel)]">
                {loading ? "Loading events" : `${events.length} events found`}
              </p>
              <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
              <span className="hidden text-[9px] tracking-[0.2em] text-white/40 sm:block [font-family:var(--font-pixel)]">
                TECHXETRA 2026
              </span>
            </div>

            {activeChips.length > 0 && (
              <ul className="mb-6 flex flex-wrap gap-2" aria-label="Active filters">
                {activeChips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      onClick={chip.clear}
                      aria-label={`Remove filter ${chip.label}`}
                      className="inline-flex min-h-9 max-w-full cursor-pointer items-center gap-2 rounded-full border border-[#55DFFF]/35 bg-[#55DFFF]/[0.08] px-3.5 text-xs text-[#BFF2FF] transition-colors hover:bg-[#55DFFF]/[0.16] focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
                    >
                      <span className="truncate">{chip.label}</span>
                      <CloseIcon className="h-3 w-3 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[360px] animate-pulse rounded-2xl border border-[#BED6FF]/10 bg-[#0e1630]/60"
                  />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#BED6FF]/25 px-6 py-20 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#55DFFF]/30 bg-[#55DFFF]/[0.07] text-[#8BEAFF]">
                  <StarGlyph className="h-4 w-4" />
                </div>
                <h2 className="mt-5 text-2xl [font-family:var(--font-gotham-bold)]">
                  No matching events.
                </h2>

                <p className="mt-3 text-sm text-white/65">
                  Try a different category, day, or search term.
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 min-h-11 cursor-pointer rounded-xl bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] px-6 text-xs text-[#04101a] transition hover:from-[#B5F2FF] hover:to-[#55DFFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] [font-family:var(--font-gotham-bold)]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    data-directory-card
                    className="ed-lift min-w-0"
                  >
                    <EventCard
                      event={event}
                      index={index}
                      onSelect={(event) => {
                        handleEventSelect(event);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showPassModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 min-[640px]:items-center min-[640px]:p-6"
          onMouseDown={(click) => {
            if (click.target === click.currentTarget) setShowPassModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-pass-title"
            className="flex max-h-[92svh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#BED6FF]/[0.16] bg-gradient-to-b from-[#101a3a] to-[#05070f] min-[640px]:rounded-3xl"
          >
            <span
              aria-hidden="true"
              className="h-[3px] w-full shrink-0"
              style={{ background: "linear-gradient(90deg, #55DFFF, #B3A4FF)" }}
            />
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3 min-[640px]:px-7">
              <span className="flex items-center gap-2.5 text-[9px] uppercase tracking-[0.18em] text-[#55DFFF] [font-family:var(--font-pixel)]">
                <StarGlyph className="h-2.5 w-2.5" />
                Festival access
              </span>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                aria-label="Close gate pass details"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 min-[640px]:p-7">
              <h2
                id="gate-pass-title"
                className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.08] tracking-[-0.035em] [font-family:var(--font-gotham-bold)]"
              >
                TechXetra 2026 gate pass
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#F5F0DE]/75">
                General entry to the festival grounds, tech exhibitions,
                arenas and cultural night pro-shows across the festival dates.
              </p>

              <div className="mt-7 grid grid-cols-1 gap-5 border-y border-white/10 py-6 sm:grid-cols-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-[#55DFFF] [font-family:var(--font-pixel)]">
                    Access
                  </p>
                  <p className="mt-2 text-sm text-white/90">Festival grounds</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-[#55DFFF] [font-family:var(--font-pixel)]">
                    Validity
                  </p>
                  <p className="mt-2 text-sm text-white/90">All festival dates</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-[#55DFFF] [font-family:var(--font-pixel)]">
                    Entry
                  </p>
                  <p className="mt-2 text-sm text-white/90">Student / General pricing</p>
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/10 px-5 pb-5 pt-4 min-[640px]:px-7">
              <Link
                href="/checkout"
                onClick={() => setShowPassModal(false)}
                className="flex min-h-12 items-center justify-between gap-5 rounded-xl bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] px-5 py-3 text-sm text-[#04101a] [font-family:var(--font-gotham-bold)] transition hover:from-[#B5F2FF] hover:to-[#55DFFF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
              >
                Continue to checkout
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}