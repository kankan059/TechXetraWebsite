"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { events } from "@/data/info/event";

gsap.registerPlugin(ScrollTrigger);

export default function Events() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 900px)",
        mobile: "(max-width: 899.98px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const desktop = Boolean(context.conditions?.desktop);
        const reduced = Boolean(context.conditions?.reduced);
        const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-event-section]"));
        const worlds = Array.from(root.querySelectorAll<HTMLElement>("[data-event-world]"));

        if (!sections.length) return;

        const opacitySetters = worlds.map((world) => gsap.quickSetter(world, "opacity"));
        const colourProgress = { value: 0 };

        let sectionTops: number[] = [];
        let snapPoints: number[] = [];
        let totalDistance = 1;

        const measure = () => {
          const firstTop = sections[0].getBoundingClientRect().top;

          sectionTops = sections.map((section) => section.getBoundingClientRect().top - firstTop);
          totalDistance = Math.max(sectionTops[sectionTops.length - 1], 1);
          snapPoints = sectionTops.map((top) => top / totalDistance);
        };

        const renderColours = () => {
          const position = colourProgress.value * totalDistance;
          const viewportHeight = window.innerHeight;

          opacitySetters.forEach((setOpacity, index) => {
            if (index === 0) {
              setOpacity(1);
              return;
            }

            const start = sectionTops[index] - viewportHeight * 0.95;
            const end = sectionTops[index] - viewportHeight * 0.18;
            const progress = gsap.utils.clamp(0, 1, (position - start) / Math.max(end - start, 1));
            const blend = progress * progress * (3 - 2 * progress);

            setOpacity(blend);
          });
        };

        measure();

        if (sections.length > 1) {
          gsap.to(colourProgress, {
            value: 1,
            ease: "none",
            onUpdate: renderColours,
            scrollTrigger: {
              trigger: sections[0],
              start: "top top",
              endTrigger: sections[sections.length - 1],
              end: "top top",
              scrub: reduced ? true : desktop ? 0.9 : 0.35,
              invalidateOnRefresh: true,
              onRefresh: () => {
                measure();
                renderColours();
              },
              snap: reduced
                ? undefined
                : {
                    snapTo: (value) => {
                      const position = value * totalDistance;
                      let currentIndex = 0;

                      sectionTops.forEach((top, index) => {
                        if (position >= top - 1) currentIndex = index;
                      });

                      const currentSection = sections[currentIndex];
                      const viewportHeight = window.innerHeight;
                      const extraHeight = Math.max(0, currentSection.offsetHeight - viewportHeight);
                      const readingEnd = sectionTops[currentIndex] + extraHeight;

                      // Let long sections scroll freely.
                      if (extraHeight > 48 && position <= readingEnd) {
                        return value;
                      }

                      return gsap.utils.snap(snapPoints, value);
                    },
                    directional: false,
                    inertia: false,
                    delay: desktop ? 0.25 : 0.35,
                    duration: { min: 0.5, max: 1 },
                    ease: "power2.inOut",
                  },
            },
          });
        }

        sections.forEach((section, index) => {
          const copy = section.querySelector<HTMLElement>("[data-event-copy]");
          const poster = section.querySelector<HTMLElement>("[data-event-poster]");

          if (!copy || !poster || reduced) return;

          const textParts = Array.from(copy.children) as HTMLElement[];

          // First section only animates on entry.
          if (index === 0) {
            gsap
              .timeline({ defaults: { ease: "power3.out" } })
              .fromTo(
                textParts,
                {
                  x: desktop ? -55 : -28,
                  y: 28,
                  opacity: 0,
                },
                {
                  x: 0,
                  y: 0,
                  opacity: 1,
                  duration: 0.95,
                  stagger: 0.09,
                },
                0.08,
              )
              .fromTo(
                poster,
                {
                  x: desktop ? 110 : 65,
                  y: 36,
                  scale: 0.92,
                  opacity: 0,
                },
                {
                  x: 0,
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  duration: 1.25,
                },
                0.25,
              );

            return;
          }

          gsap.fromTo(
            textParts,
            {
              x: desktop ? -95 : -45,
              y: desktop ? 55 : 35,
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.14,
              ease: "power2.out",
              scrollTrigger: {
                trigger: copy,
                start: "top 94%",
                end: "top 22%",
                scrub: desktop ? 1.25 : 0.85,
                invalidateOnRefresh: true,
              },
            },
          );

          gsap.fromTo(
            poster,
            {
              x: desktop ? 160 : 85,
              y: desktop ? 60 : 35,
              scale: desktop ? 0.86 : 0.9,
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: poster,
                start: "top 98%",
                end: "top 55%",
                scrub: desktop ? 1.3 : 0.9,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      },
      root,
    );

    let disposed = false;
    let refreshFrame = 0;

    const scheduleRefresh = () => {
      if (disposed) return;

      cancelAnimationFrame(refreshFrame);

      refreshFrame = requestAnimationFrame(() => {
        if (!disposed) ScrollTrigger.refresh();
      });
    };

    scheduleRefresh();
    void document.fonts.ready.then(scheduleRefresh);

    const observer = new ResizeObserver(scheduleRefresh);

    root.querySelectorAll<HTMLElement>("[data-event-section]").forEach((section) => {
      observer.observe(section);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      media.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="relative isolate min-h-svh overflow-x-clip bg-[#092C40] text-[#F5F0DE] [font-family:var(--font-gotham-book)]">
      <h1 className="sr-only">TechXetra 2026 Events</h1>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        {events.map((event, index) => (
          <div
            key={event.id}
            data-event-world
            className="absolute inset-0 will-change-[opacity]"
            style={{
              opacity: index === 0 ? 1 : 0,
              backgroundColor: event.background,
              backgroundImage: `radial-gradient(ellipse at 78% 45%, ${event.accentSoft} 0%, transparent 72%)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {events.map((event, index) => (
          <section
            key={event.id}
            id={event.id}
            data-event-section
            aria-labelledby={`${event.id}-title`}
            className="relative flex min-h-svh flex-col px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-8 min-[600px]:px-8 min-[900px]:justify-center min-[900px]:px-12 min-[900px]:pb-12 min-[900px]:pt-28 min-[1200px]:px-16"
            style={{ color: event.foreground }}
          >
            <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-6 min-[900px]:grid min-[900px]:max-w-[1320px] min-[900px]:flex-none min-[900px]:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] min-[900px]:items-center min-[900px]:gap-[clamp(40px,7vw,112px)]">
              <div data-event-copy className="min-w-0 shrink-0">
                <p className="mb-4 flex items-center gap-2.5 text-[8px] leading-relaxed tracking-[0.16em] [font-family:var(--font-pixel)] min-[900px]:mb-7 min-[900px]:text-[10px]" style={{ color: event.accent }}>
                  <span aria-hidden="true" className="h-1 w-1 shrink-0 bg-current" />
                  TECHXETRA 2026 / EVENTS
                </p>

                <h2 id={`${event.id}-title`} className="m-0 text-[clamp(2rem,9vw,3.4rem)] font-normal leading-[1.05] tracking-[-0.035em] text-balance [font-family:var(--font-gotham-bold)] [overflow-wrap:anywhere] min-[900px]:text-[clamp(3rem,5.6vw,5.6rem)]">
                  {event.name}
                </h2>

                <p className="mt-3 text-[14px] leading-[1.5] [font-family:var(--font-gotham-bold)] min-[900px]:mt-6 min-[900px]:text-[clamp(1rem,1.6vw,1.4rem)]" style={{ color: event.accent }}>
                  {event.subtitle}
                </p>

                <div className="mt-3 max-w-[52ch] space-y-2 text-[13px] leading-[1.7] text-[#F5F0DE]/85 [font-family:var(--font-gotham-book)] [overflow-wrap:anywhere] min-[900px]:mt-5 min-[900px]:space-y-4 min-[900px]:text-[15px] min-[900px]:leading-[1.85]">
                  {event.description.split(/\n\s*\n/).map((paragraph, paragraphIndex) => (
                    <p key={`${event.id}-${paragraphIndex}`} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <Link
                  href={event.href ?? `/event/${event.id}`}
                  aria-label={`Explore ${event.name.toLowerCase()} events`}
                  className="group mt-5 inline-flex min-h-11 items-center justify-center gap-7 border border-[#F5F0DE]/40 px-5 py-2.5 text-[11px] [font-family:var(--font-gotham-bold)] transition-[background-color,border-color] duration-300 hover:border-[#F5F0DE]/75 hover:bg-[#F5F0DE]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current min-[900px]:mt-8 min-[900px]:min-h-12 min-[900px]:px-6 min-[900px]:text-xs"
                >
                  Explore events

                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none">
                    <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>

              <figure data-event-poster className="m-0 mt-auto w-[88%] max-w-[350px] shrink-0 self-center min-[900px]:mt-0 min-[900px]:w-full min-[900px]:max-w-[min(440px,54svh)] min-[900px]:justify-self-end">
                <div className="relative aspect-[4/5] w-full">
                  {event.image ? (
                    <Image
                      src={event.image}
                      alt={`${event.name} event poster`}
                      fill
                      priority={index === 0}
                      sizes="(min-width: 900px) 440px, (min-width: 440px) 350px, 80vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col justify-between border border-[#F5F0DE]/30 p-6 min-[900px]:p-8" style={{ background: `linear-gradient(145deg, ${event.accentSoft}, rgba(0,0,0,0.22))` }}>
                      <span className="text-[9px] leading-relaxed tracking-[0.12em] [font-family:var(--font-pixel)] min-[900px]:text-[10px]" style={{ color: event.accent }}>
                        TECHXETRA 2026
                      </span>

                      <span className="text-[clamp(1.8rem,7vw,2.8rem)] leading-[1.05] [font-family:var(--font-gotham-bold)] [overflow-wrap:anywhere] min-[900px]:text-[clamp(2rem,3.5vw,3.6rem)]">
                        {event.name}
                      </span>

                      <span className="text-[9px] leading-relaxed tracking-[0.12em] [font-family:var(--font-pixel)] min-[900px]:text-[10px]" style={{ color: event.accent }}>
                        EVENT POSTER
                      </span>
                    </div>
                  )}
                </div>
              </figure>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}