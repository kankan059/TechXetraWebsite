"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { EventCategory, EventItem } from "@/types/api";
import EventCard from "@/components/sections/events/EventCard";
import EventDetailsModal from "@/components/sections/events/EventDetailsModal";
import { participantApi } from "@/services/participant-api";
import { events as eventThemes } from "@/data/info/event";

gsap.registerPlugin(ScrollTrigger);

const eventCategoryByThemeId: Record<string, EventCategory | undefined> = {
  technical: "TECHNICAL",
  interactive: "INTERACTIVE",
  recreational: "RECREATIONAL",
  cultural: "CULTURAL",
  esports: "E_SPORTS",
};

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

const STAR_PATH = "M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z";

function StarGlyph({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Constellation field (canvas, viewport sized, pointer links)        */
/* ------------------------------------------------------------------ */

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

function hexToRgb(hex: string) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Invalid event theme color: ${hex}`);
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function ConstellationField({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const accentRgb = hexToRgb(accent);

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

      ctx.lineWidth = 0.8;

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.45 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(${accentRgb}, ${alpha.toFixed(3)})`;
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
          const alpha = (1 - d2 / reach2) * 0.6;
          ctx.strokeStyle = `rgba(${accentRgb}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.4 + 0.6 * n.z) * twinkle;
        ctx.fillStyle = `rgba(${accentRgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.py, n.r * n.z + 0.5, 0, Math.PI * 2);
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
  }, [accent]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/* Scoped styles                                                      */
/* ------------------------------------------------------------------ */

const css = `
.te-orbit{animation:te-orbit 150s linear infinite}
.te-cue-dot{animation:te-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}
@keyframes te-orbit{to{transform:rotate(360deg)}}
@keyframes te-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}
@media (prefers-reduced-motion:reduce){
  .te-orbit,.te-cue-dot{animation:none!important}
}
`;

const panel =
  "rounded-2xl border bg-gradient-to-b from-black/50 to-black/80 shadow-[0_30px_70px_-42px_rgba(0,0,0,0.95)]";

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function TechnicalEvents({
  categoryId = "technical",
}: {
  categoryId?: string;
}) {
  const theme = eventThemes.find((candidate) => candidate.id === categoryId);
  if (!theme) throw new Error(`No event theme configured for "${categoryId}".`);

  const apiCategory = eventCategoryByThemeId[theme.id];
  const rootRef = useRef<HTMLElement>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(Boolean(apiCategory));
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    if (!apiCategory) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await participantApi.events.list({
        category: apiCategory,
        limit: 50,
      });

      if (signal?.aborted) return;
      const fetchedEvents: EventItem[] = data.events;

      setEvents(
        fetchedEvents.filter(
          (event) =>
            event.status !== "DRAFT" &&
            event.status !== "CANCELLED",
        )
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading events."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiCategory]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    queueMicrotask(() => {
      if (!signal.aborted) void loadEvents(signal);
    });

    return () => controller.abort();
  }, [loadEvents]);

  /* Hero entrance and scroll-scrubbed exit */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const hero = root.querySelector<HTMLElement>("[data-hero]");
        const inner = root.querySelector<HTMLElement>("[data-hero-inner]");
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
      root
    );

    return () => media.revert();
  }, []);

  /* Cards appear as they scroll into view */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || loading || events.length === 0) return;

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 1100px)",
        tablet: "(min-width: 640px) and (max-width: 1099.98px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions?.reduced) return;

        const desktop = Boolean(context.conditions?.desktop);
        const tablet = Boolean(context.conditions?.tablet);
        const cards = Array.from(
          root.querySelectorAll<HTMLElement>("[data-tech-card]")
        );

        const firstRowCount = desktop ? 3 : tablet ? 2 : 1;

        gsap.fromTo(
          cards.slice(0, firstRowCount),
          { y: 44, opacity: 0, rotationX: 8, transformPerspective: 1100 },
          {
            y: 0,
            opacity: 1,
            rotationX: 0,
            duration: 0.9,
            delay: 0.1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cards[0],
              start: "top 96%",
              once: true,
            },
          }
        );

        cards.slice(firstRowCount).forEach((card, i) => {
          const fromX = desktop ? ((i % 3) - 1) * 26 : 0;

          gsap.fromTo(
            card,
            {
              y: 56,
              x: fromX,
              opacity: 0,
              rotationX: 10,
              scale: 0.96,
              transformPerspective: 1100,
            },
            {
              y: 0,
              x: 0,
              opacity: 1,
              rotationX: 0,
              scale: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 98%",
                end: "top 66%",
                scrub: desktop ? 1 : 0.65,
                invalidateOnRefresh: true,
              },
            }
          );
        });
      },
      root
    );

    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(frame);
      media.revert();
    };
  }, [loading, events]);

  const openEvent = (event: EventItem) => {
    setSelectedEvent(event);
  };

  return (
    <main
      ref={rootRef}
      className="relative isolate min-h-svh overflow-x-clip [font-family:var(--font-roboto)]"
      style={{ backgroundColor: theme.background, color: theme.foreground }}
    >
      <style>{css}</style>

      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 30%, ${theme.background} 0%, ${theme.background} 54%, #000000 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 82% 60%, ${theme.accentSoft} 0%, transparent 58%)`,
              opacity: 0.45,
            }}
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
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.62) 100%)" }}
          />
          <ConstellationField accent={theme.accent} />
        </div>
      </div>

      {/* Hero */}
      <header
        data-hero
        className="relative flex min-h-[68svh] flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-36 text-center min-[640px]:px-8 min-[900px]:pt-32"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="te-orbit" style={{ width: "min(120vw, 960px)", height: "min(120vw, 960px)" }}>
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
              <circle cx="200" cy="200" r="190" stroke={theme.accent} strokeOpacity="0.3" strokeDasharray="1 7" />
              <circle cx="200" cy="200" r="142" stroke={theme.accent} strokeOpacity="0.2" strokeDasharray="2 11" />
              <circle cx="390" cy="200" r="3" fill={theme.foreground} />
              <circle cx="58" cy="262" r="2.2" fill={theme.foreground} />
            </svg>
          </div>
        </div>

        <div data-hero-inner className="relative flex w-full max-w-3xl flex-col items-center">
          <Link
            href="/events"
            className="mb-8 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full border px-5 text-xs transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              borderColor: `${theme.accent}40`,
              color: theme.foreground,
              outlineColor: theme.accent,
            }}
          >
            <BackArrow className="h-4 w-4" />
            All categories
          </Link>

          <p
            className="mb-5 flex items-center gap-3 text-[9px] uppercase tracking-[0.34em] min-[900px]:text-[10px] [font-family:var(--font-pixel)]"
            style={{ color: theme.accent }}
          >
            <StarGlyph className="h-2.5 w-2.5" />
            {theme.categoryLabel}
            <StarGlyph className="h-2.5 w-2.5" />
          </p>

          <h1 className="m-0 max-w-[900px] text-[clamp(2.6rem,8.6vw,6.2rem)] font-normal leading-[1] tracking-[-0.055em] [font-family:var(--font-roboto)]">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(100deg, ${theme.foreground}, ${theme.accent})`,
              }}
            >
              {theme.name}
            </span>
          </h1>

          <p className="mt-6 max-w-[52ch] text-sm leading-[1.8] text-white/75 min-[900px]:text-base">
            {theme.tagline}
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <span className="text-[9px] tracking-[0.26em] text-white/45 [font-family:var(--font-pixel)]">SCROLL TO EXPLORE</span>
            <span className="relative block h-11 w-px overflow-hidden bg-white/15">
              <span
                className="te-cue-dot absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent to-transparent"
                style={{ backgroundImage: `linear-gradient(transparent, ${theme.accent}, transparent)` }}
              />
            </span>
          </div>
        </div>
      </header>

      {/* Listing */}
      <div className="mx-auto max-w-[1280px] px-5 pb-[calc(110px+env(safe-area-inset-bottom))] pt-6 min-[640px]:px-8 min-[900px]:px-12 min-[900px]:pb-28">
        {loading && (
          <div
            role="status"
            aria-label="Loading events"
            className="grid grid-cols-1 gap-7 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border bg-black/30"
                style={{ borderColor: `${theme.accent}24` }}
              >
                <div className="aspect-[16/10] bg-white/[0.06]" />
                <div className="space-y-4 p-6">
                  <div className="h-2 w-20 rounded bg-white/10" />
                  <div className="h-6 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/[0.06]" />
                  <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <section
            role="alert"
            className={`${panel} p-6 min-[640px]:p-8`}
            style={{ borderColor: `${theme.accent}60` }}
          >
            <h2 className="text-lg [font-family:var(--font-gotham-bold)]">
              Could not load events
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#F5F0DE]/75">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="mt-5 min-h-11 cursor-pointer rounded-xl px-6 text-sm text-black transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 [font-family:var(--font-gotham-bold)]"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentSoft})`, outlineColor: theme.accent }}
            >
              Try again
            </button>
          </section>
        )}

        {!loading && !error && events.length === 0 && (
          <section
            className={`${panel} px-6 py-16 text-center`}
            style={{ borderColor: `${theme.accent}40` }}
          >
            <div
              className="mx-auto flex size-12 items-center justify-center rounded-full border"
              style={{
                borderColor: `${theme.accent}60`,
                backgroundColor: `${theme.accent}18`,
                color: theme.accent,
              }}
            >
              <StarGlyph className="h-4 w-4" />
            </div>
            <h2 className="mt-5 text-xl [font-family:var(--font-gotham-bold)]">
              {apiCategory
                ? `No ${theme.categoryLabel.toLowerCase()} yet`
                : `${theme.name} events are not available yet`}
            </h2>
            <p className="mt-3 text-sm text-[#F5F0DE]/70">
              {apiCategory
                ? "Check back later for event announcements."
                : "The backend does not yet provide a robotics event identifier. No technical events are shown here."}
            </p>
          </section>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            <div className="mb-7 flex items-center gap-4">
              <p
                className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.2em] [font-family:var(--font-pixel)]"
                style={{ color: theme.accent }}
              >
                <StarGlyph className="h-2.5 w-2.5" />
                {theme.categoryLabel}
              </p>
              <span
                className="h-px flex-1"
                style={{ background: `linear-gradient(90deg, ${theme.accent}50, transparent)` }}
              />
              <span className="hidden text-[9px] tracking-[0.2em] text-white/40 min-[640px]:block [font-family:var(--font-pixel)]">
                TECHXETRA 2026
              </span>
            </div>

            <div className="grid grid-cols-1 gap-7 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
              {events.map((event, index) => (
                <div key={event.id} data-tech-card className="min-w-0">
                  <EventCard
                    event={event}
                    index={index}
                    onSelect={openEvent}
                    theme={theme}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          theme={theme}
        />
      )}
    </main>
  );
}