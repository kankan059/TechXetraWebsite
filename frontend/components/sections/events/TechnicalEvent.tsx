"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { technicalEvents, type TechnicalEvent } from "@/data/event";

gsap.registerPlugin(ScrollTrigger);

const posterColours = ["#173D4A", "#263C48", "#30413E"];

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EventPoster({
  event,
  index,
  priority = false,
}: {
  event: TechnicalEvent;
  index: number;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden">
      {event.image ? (
        <Image
          src={event.image}
          alt={`${event.name} event artwork`}
          fill
          priority={priority}
          sizes="(min-width: 1200px) 400px, (min-width: 640px) 46vw, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transform-none"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-6 min-[900px]:p-7" style={{ backgroundColor: posterColours[index % posterColours.length] }}>
          <span className="text-[8px] tracking-[0.18em] text-[#D7E5E7]/65 [font-family:var(--font-pixel)]">
            TECHXETRA 2026
          </span>

          <span className="max-w-[12ch] text-[clamp(1.8rem,3vw,2.7rem)] leading-[1.05] tracking-[-0.035em] text-[#F5F0DE] [font-family:var(--font-gotham-bold)]">
            {event.name}
          </span>

          <span className="text-[9px] uppercase tracking-[0.14em] text-[#D7E5E7]/70">
            {event.category}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TechnicalEvents() {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const dialogTweenRef = useRef<gsap.core.Tween | null>(null);
  const closingRef = useRef(false);

  const [selectedEvent, setSelectedEvent] = useState<TechnicalEvent | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 1100px)",
        tablet: "(min-width: 640px) and (max-width: 1099.98px)",
        mobile: "(max-width: 639.98px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const desktop = Boolean(context.conditions?.desktop);
        const tablet = Boolean(context.conditions?.tablet);
        const reduced = Boolean(context.conditions?.reduced);

        if (reduced) return;

        const headingParts = root.querySelectorAll<HTMLElement>("[data-heading-part]");
        const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-event-card]"));
        const firstRowCount = desktop ? 3 : tablet ? 2 : 1;

        gsap.fromTo(
          headingParts,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.1,
            ease: "power3.out",
          },
        );

        gsap.fromTo(
          cards.slice(0, firstRowCount),
          { y: 45, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: 0.2,
            stagger: 0.12,
            ease: "power3.out",
          },
        );

        cards.slice(firstRowCount).forEach((card) => {
          gsap.fromTo(
            card,
            { y: 55, opacity: 0.15 },
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
            },
          );
        });
      },
      root,
    );

    let disposed = false;

    const refresh = () => {
      if (!disposed) ScrollTrigger.refresh();
    };

    const frame = requestAnimationFrame(refresh);
    void document.fonts.ready.then(refresh);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      media.revert();
    };
  }, []);

  const openEvent = (
    event: TechnicalEvent,
    trigger: HTMLButtonElement,
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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishClose();
      return;
    }

    dialogTweenRef.current = gsap.to(panel, {
      y: 22,
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
    document.body.style.setProperty("overflow", "hidden");

    if (!dialog.open) dialog.showModal();

    panel.scrollTop = 0;
    closeButtonRef.current?.focus({ preventScroll: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 639.98px)").matches;

    dialogTweenRef.current = gsap.fromTo(
      panel,
      { y: reduced ? 0 : mobile ? 65 : 30, opacity: reduced ? 1 : 0 },
      { y: 0, opacity: 1, duration: reduced ? 0 : 0.45, ease: "power3.out" },
    );

    return () => {
      dialogTweenRef.current?.kill();
      document.body.style.setProperty("overflow", previousOverflow);
    };
  }, [selectedEvent]);

  const selectedIndex = selectedEvent
    ? technicalEvents.findIndex((event) => event.id === selectedEvent.id)
    : 0;

  return (
    <main ref={rootRef} className="min-h-svh overflow-x-clip bg-[#09151B] px-5 pb-[calc(110px+env(safe-area-inset-bottom))] pt-9 text-[#F5F0DE] [font-family:var(--font-gotham-book)] min-[640px]:px-8 min-[900px]:px-12 min-[900px]:pb-24 min-[900px]:pt-32">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-9 border-b border-white/15 pb-8 min-[900px]:mb-12 min-[900px]:pb-10">
          <Link data-heading-part href="/events" className="mb-7 inline-flex min-h-11 items-center gap-3 text-xs text-[#F5F0DE]/65 transition-colors hover:text-[#F5F0DE] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DDCFA]">
            <span aria-hidden="true">←</span>
            All categories
          </Link>

          <p data-heading-part className="mb-4 text-[9px] uppercase tracking-[0.18em] text-[#8DDCFA] [font-family:var(--font-pixel)]">
            TECHXETRA 2026 / TECHNICAL
          </p>

          <h1 data-heading-part className="max-w-[900px] text-[clamp(2.4rem,6.8vw,5.6rem)] leading-[1.04] tracking-[-0.045em] [font-family:var(--font-gotham-bold)]">
            Ideas into action.
          </h1>

          <p data-heading-part className="mt-5 max-w-[52ch] text-sm leading-[1.8] text-[#F5F0DE]/70 min-[900px]:text-base">
            Find your event. Read the details, bring your skills and take part.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-7 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {technicalEvents.map((event, index) => (
            <article key={event.id} data-event-card className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#101F26] transition-colors duration-300 hover:border-[#8DDCFA]/40">
              <button
                type="button"
                onClick={(click) => openEvent(event, click.currentTarget)}
                aria-label={`View ${event.name} details`}
                className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#8DDCFA]"
              >
                <EventPoster event={event} index={index} priority={index < 3} />
              </button>

              <div className="flex flex-1 flex-col p-5 min-[900px]:p-6">
                <p className="text-[9px] uppercase tracking-[0.14em] text-[#8DDCFA] [font-family:var(--font-pixel)]">
                  {event.category}
                </p>

                <h2 className="mt-3 text-[22px] leading-tight tracking-[-0.025em] [font-family:var(--font-gotham-bold)]">
                  {event.name}
                </h2>

                <p className="mt-3 text-[13px] leading-[1.8] text-[#F5F0DE]/70">
                  {event.summary}
                </p>

                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    onClick={(click) => openEvent(event, click.currentTarget)}
                    className="flex min-h-12 w-full items-center justify-between gap-4 border-t border-white/15 pt-4 text-xs [font-family:var(--font-gotham-bold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DDCFA]"
                  >
                    View event
                    <ArrowIcon className="h-5 w-5 text-[#8DDCFA] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
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
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#8DDCFA] [font-family:var(--font-pixel)]">
                  {selectedEvent.category}
                </span>

                <button ref={closeButtonRef} type="button" onClick={closeEvent} aria-label="Close event details" className="flex h-11 w-11 items-center justify-center text-2xl focus-visible:outline-2 focus-visible:outline-[#8DDCFA]">
                  ×
                </button>
              </div>

              <div className="p-5 min-[640px]:p-7">
                <div className="grid items-start gap-6 min-[760px]:grid-cols-[1fr_0.8fr]">
                  <div>
                    <h2 id="technical-event-title" className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em] [font-family:var(--font-gotham-bold)]">
                      {selectedEvent.name}
                    </h2>

                    <div className="mt-5 space-y-4 text-sm leading-[1.85] text-[#F5F0DE]/75">
                      {selectedEvent.description.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg">
                    <EventPoster event={selectedEvent} index={selectedIndex} />
                  </div>
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-y border-white/10 py-6 min-[640px]:grid-cols-3">
                  {[
                    ["Date", selectedEvent.date],
                    ["Time", selectedEvent.time],
                    ["Venue", selectedEvent.venue],
                    ["Team size", selectedEvent.teamSize],
                    ["Entry fee", selectedEvent.fee],
                    ["Prize", selectedEvent.prize],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[9px] uppercase tracking-[0.12em] text-[#8DDCFA] [font-family:var(--font-pixel)]">
                        {label}
                      </dt>

                      <dd className="mt-2 text-[13px] leading-relaxed [overflow-wrap:anywhere]">
                        {value ?? "To be announced"}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7">
                  <h3 className="text-base [font-family:var(--font-gotham-bold)]">
                    Before you register
                  </h3>

                  {selectedEvent.rules.length > 0 ? (
                    <ul className="mt-4 list-disc space-y-3 pl-5 text-[13px] leading-[1.8] text-[#F5F0DE]/75">
                      {selectedEvent.rules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] leading-[1.8] text-[#F5F0DE]/65">
                      Participation rules and eligibility details will be added here.
                    </p>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 z-20 mt-auto shrink-0 border-t border-white/15 bg-[#101F26] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 min-[640px]:px-7">
                {selectedEvent.registrationUrl ? (
                  <a
                    href={selectedEvent.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center justify-between gap-5 bg-[#D6E8E9] px-5 py-3 text-sm text-[#10242B] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DDCFA]"
                  >
                    Register for this event
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only">, opens in a new tab</span>
                  </a>
                ) : (
                  <Link
                    href={`/events/${selectedEvent.id}`}
                    className="flex min-h-12 items-center justify-between gap-5 bg-[#D6E8E9] px-5 py-3 text-sm text-[#10242B] [font-family:var(--font-gotham-bold)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8DDCFA]"
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