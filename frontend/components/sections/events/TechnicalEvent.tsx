
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
import type { EventItem } from "@/types/api";
import EventCard from "@/components/sections/events/EventCard";
import { participantApi } from "@/services/participant-api";

gsap.registerPlugin(ScrollTrigger);

type EventMetadata = {
  image?: string;
  image_url?: string;
  poster?: string;
  summary?: string;
  prize?: string;
  rules?: string[];
  registration_url?: string;
  registrationUrl?: string;
};

function getMetadata(event: EventItem): EventMetadata {
  try {
    return event.metadata ? JSON.parse(event.metadata) : {};
  } catch {
    return {};
  }
}


function formatDate(timestamp: number) {
  if (!timestamp) return "To be announced";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

function formatTime(timestamp: number) {
  if (!timestamp) return "To be announced";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

function formatFee(event: EventItem) {
  const priceModel = event.price_model ?? event.priceModel ?? "FREE";
  const pricePaise = event.price_paise ?? event.pricePaise ?? 0;

  if (priceModel === "FREE" || pricePaise === 0) {
    return "Free";
  }

  return `₹${(pricePaise / 100).toLocaleString("en-IN")}${priceModel === "PER_TEAM" ? " / team" : " / person"
    }`;
}

function getTeamSize(event: EventItem) {
  const isTeam = event.is_team_event ?? event.isTeamEvent ?? event.isTeam;
  if (!isTeam) return "Individual";

  const min = event.min_team_size ?? event.minTeamSize ?? 1;
  const max = event.max_team_size ?? event.maxTeamSize ?? 1;

  if (min === max) {
    return `${min} members`;
  }

  return `${min}–${max} members`;
}

export default function TechnicalEvents() {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const dialogTweenRef = useRef<gsap.core.Tween | null>(null);
  const closingRef = useRef(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await participantApi.events.list({
        category: "TECHNICAL",
        limit: 50,
      });

      const fetchedEvents: EventItem[] = data.events;

      setEvents(
        fetchedEvents.filter(
          (event) =>
            event.status !== "DRAFT" &&
            event.status !== "CANCELLED"
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    queueMicrotask(() => {
      if (!signal.aborted) void loadEvents(signal);
    });

    return () => controller.abort();
  }, [loadEvents]);

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
        const heading = root.querySelectorAll("[data-heading-part]");
        const cards = Array.from(
          root.querySelectorAll<HTMLElement>("[data-event-card]")
        );

        const firstRowCount = desktop ? 3 : tablet ? 2 : 1;

        gsap.fromTo(
          heading,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
          }
        );

        gsap.fromTo(
          cards.slice(0, firstRowCount),
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: 0.15,
            stagger: 0.1,
            ease: "power3.out",
          }
        );

        cards.slice(firstRowCount).forEach((card) => {
          gsap.fromTo(
            card,
            { y: 35, opacity: 0.2 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 98%",
                end: "top 72%",
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

  const openEvent = (
    event: EventItem,
    trigger: HTMLButtonElement
  ) => {
    returnFocusRef.current = trigger;
    closingRef.current = false;
    setSelectedEvent(event);
  };

  const finishClose = () => {
    dialogRef.current?.close();
    setSelectedEvent(null);
    closingRef.current = false;

    requestAnimationFrame(() => {
      returnFocusRef.current?.focus({ preventScroll: true });
    });
  };

  const closeEvent = () => {
    const panel = panelRef.current;

    if (!panel || closingRef.current) return;

    closingRef.current = true;
    dialogTweenRef.current?.kill();

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finishClose();
      return;
    }

    dialogTweenRef.current = gsap.to(panel, {
      y: 20,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: finishClose,
    });
  };

  useEffect(() => {
    if (!selectedEvent) return;

    const dialog = dialogRef.current;
    const panel = panelRef.current;

    if (!dialog || !panel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!dialog.open) dialog.showModal();

    panel.scrollTop = 0;
    closeButtonRef.current?.focus({ preventScroll: true });

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const mobile = window.matchMedia("(max-width: 639.98px)").matches;

    dialogTweenRef.current = gsap.fromTo(
      panel,
      { y: reduced ? 0 : mobile ? 55 : 25, opacity: reduced ? 1 : 0 },
      {
        y: 0,
        opacity: 1,
        duration: reduced ? 0 : 0.4,
        ease: "power3.out",
      }
    );

    return () => {
      dialogTweenRef.current?.kill();
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedEvent]);

  const selectedMetadata = selectedEvent
    ? getMetadata(selectedEvent)
    : {};
  const selectedTone = { accent: "#55DFFF", poster: "#15313B" };

  return (
    <main
      ref={rootRef}
      className="min-h-svh overflow-x-clip  px-5 pb-[calc(110px+env(safe-area-inset-bottom))] pt-9 text-[#F5F0DE] [font-family:var(--font-gotham-book)] min-[640px]:px-8 min-[900px]:px-12 min-[900px]:pb-24 min-[900px]:pt-32"
    >
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-9 border-b border-white/15 pb-8 min-[900px]:mb-12 min-[900px]:pb-10">
          <Link
            data-heading-part
            href="/events"
            className="mb-7 inline-flex min-h-11 items-center gap-3 text-xs text-[#F5F0DE]/65 transition-colors hover:text-[#F5F0DE] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
          >
            <span aria-hidden="true">←</span>
            All categories
          </Link>

          <p
            data-heading-part
            className="mb-4 text-[9px] uppercase tracking-[0.18em] text-[#55DFFF] [font-family:var(--font-pixel)]"
          >
            TECHNICAL
          </p>

          <h1
            data-heading-part
            className="max-w-[900px] text-[clamp(2.4rem,6.8vw,5.6rem)] leading-[1.04] tracking-[-0.045em] [font-family:var(--font-gotham-bold)]"
          >
            Ideas into action.
          </h1>

          <p
            data-heading-part
            className="mt-5 max-w-[52ch] text-sm leading-[1.8] text-[#F5F0DE]/70 min-[900px]:text-base"
          >
            Find your event. Read the details, bring your skills and take
            part.
          </p>
        </header>

        {loading && (
          <div
            role="status"
            className="grid grid-cols-1 gap-7 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-[#101F26]"
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
            className="border border-rose-300/25 bg-rose-300/[0.05] p-6"
          >
            <h2 className="text-lg [font-family:var(--font-gotham-bold)]">
              Could not load events
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#F5F0DE]/70">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="mt-5 min-h-11 border border-white/20 px-5 text-sm transition-colors hover:border-white/50"
            >
              Try again
            </button>
          </section>
        )}

        {!loading && !error && events.length === 0 && (
          <section className="border border-white/10 bg-[#101F26] px-6 py-16 text-center">
            <h2 className="text-xl [font-family:var(--font-gotham-bold)]">
              No technical events yet
            </h2>
            <p className="mt-3 text-sm text-[#F5F0DE]/65">
              Check back later for event announcements.
            </p>
          </section>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 gap-7 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {events.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onSelect={openEvent}
              />
            ))}
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="technical-event-title"
        data-lenis-prevent
        onCancel={(event) => {
          event.preventDefault();
          closeEvent();
        }}
        onClose={() => {
          setSelectedEvent(null);
          closingRef.current = false;
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeEvent();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-[#F5F0DE] backdrop:bg-black/80"
      >
        {selectedEvent && (
          <div className="pointer-events-none flex h-full items-end justify-center min-[640px]:items-center min-[640px]:p-6">
            <div
              ref={panelRef}
              data-lenis-prevent
              className="pointer-events-auto flex max-h-[94dvh] w-full max-w-[920px] flex-col overflow-y-auto overscroll-contain rounded-t-2xl border border-white/15 bg-[#101F26] min-[640px]:max-h-[88dvh] min-[640px]:rounded-xl"
            >
              <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#101F26] px-5 py-2 min-[640px]:px-7">
                <span
                  className="text-[9px] uppercase tracking-[0.15em] [font-family:var(--font-pixel)]"
                  style={{ color: selectedTone.accent }}
                >
                  {selectedEvent.category.replaceAll("_", " ")}
                </span>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeEvent}
                  aria-label="Close event details"
                  className="flex h-11 w-11 items-center justify-center text-2xl focus-visible:outline-2 focus-visible:outline-[#55DFFF]"
                >
                  ×
                </button>
              </div>

              <div className="p-5 min-[640px]:p-7">
                <div className="grid items-start gap-6 min-[760px]:grid-cols-[1fr_0.8fr]">
                  <div>
                    <h2
                      id="technical-event-title"
                      className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em] [font-family:var(--font-gotham-bold)]"
                    >
                      {selectedEvent.title}
                    </h2>

                    <div className="mt-5 space-y-4 text-sm leading-[1.85] text-[#F5F0DE]/75">
                      {selectedEvent.description ? (
                        selectedEvent.description
                          .split(/\n{2,}/)
                          .map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))
                      ) : (
                        <p>
                          More information about this event will be announced
                          soon.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg">
                    {(() => {
                      const image =
                        selectedEvent.imageURL ||
                        selectedMetadata.image ||
                        selectedMetadata.image_url ||
                        selectedMetadata.poster;

                      return image ? (
                        <div className="relative aspect-[16/10]">
                          <img
                            src={image}
                            alt={`${selectedEvent.title} event artwork`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex aspect-[16/10] items-center justify-center p-6"
                          style={{ backgroundColor: selectedTone.poster }}
                        >
                          <span className="text-center text-2xl text-[#F5F0DE] [font-family:var(--font-gotham-bold)]">
                            {selectedEvent.title}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-white/10 py-6 min-[640px]:grid-cols-3">
                  {[
                    [
                      "Date",
                      selectedEvent.starts_at
                        ? formatDate(selectedEvent.starts_at)
                        : `Day 0${selectedEvent.festDay || selectedEvent.day_of_event || 1}`,
                    ],
                    [
                      "Time",
                      selectedEvent.starts_at
                        ? formatTime(selectedEvent.starts_at)
                        : "Event Day Schedule",
                    ],
                    ["Venue", selectedEvent.venue || "To be announced"],
                    ["Team size", getTeamSize(selectedEvent)],
                    ["Entry fee", formatFee(selectedEvent)],
                    [
                      "Prize",
                      selectedMetadata.prize ||
                      (Array.isArray(selectedEvent.prizes) && (selectedEvent.prizes[0] as any)?.total_prize_pool_inr
                        ? `₹${(selectedEvent.prizes[0] as any).total_prize_pool_inr.toLocaleString("en-IN")}`
                        : "Trophies & Medals"),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt
                        className="text-[9px] uppercase tracking-[0.12em] [font-family:var(--font-pixel)]"
                        style={{ color: selectedTone.accent }}
                      >
                        {label}
                      </dt>
                      <dd className="mt-2 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7">
                  <h3 className="text-base [font-family:var(--font-gotham-bold)]">
                    Before you register
                  </h3>

                  {(() => {
                    const rules = selectedMetadata.rules?.length
                      ? selectedMetadata.rules
                      : typeof selectedEvent.rules === "string" && selectedEvent.rules.trim()
                        ? selectedEvent.rules.split("\n").map((r) => r.trim()).filter(Boolean)
                        : Array.isArray(selectedEvent.rules) && selectedEvent.rules.length
                          ? (selectedEvent.rules as string[])
                          : null;

                    return rules && rules.length > 0 ? (
                      <ul className="mt-4 list-disc space-y-3 pl-5 text-[13px] leading-[1.8] text-[#F5F0DE]/75">
                        {rules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[13px] leading-[1.8] text-[#F5F0DE]/65">
                        Participation rules and eligibility details will be announced by the organizers at {selectedEvent.venue || "the event desk"}.
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="sticky bottom-0 z-20 mt-auto shrink-0 border-t border-white/15 bg-[#101F26] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 min-[640px]:px-7">
                {selectedMetadata.registration_url ||
                  selectedMetadata.registrationUrl ? (
                  <a
                    href={
                      selectedMetadata.registration_url ||
                      selectedMetadata.registrationUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center justify-center gap-5 bg-[#55DFFF] px-5 py-3 text-sm text-[#09151B] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-[#8BEAFF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
                  >
                    Register for this event
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only">, opens in a new tab</span>
                  </a>
                ) : (
                  <Link
                    href={`/events/${selectedEvent.slug || selectedEvent.id}`}
                    className="flex min-h-12 items-center justify-center gap-5 bg-[#55DFFF] px-5 py-3 text-sm text-[#09151B] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-[#8BEAFF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#55DFFF]"
                  >
                    Register on TechXetra
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
