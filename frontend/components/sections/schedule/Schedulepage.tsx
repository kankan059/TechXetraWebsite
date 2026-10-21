
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import SectionTitle from "@/components/ui/SectionTitle";
import { schedule } from "@/data/schedule";

gsap.registerPlugin(ScrollTrigger);

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState(schedule[0].id);

  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const currentDay =
    schedule.find((day) => day.id === activeDay) ?? schedule[0];

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const timeline = timelineRef.current;
    const progress = progressRef.current;

    if (!section || !timeline || !progress) return;

    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const events = gsap.utils.toArray<HTMLElement>(
        ".schedule-event"
      );

      if (reducedMotion) {
        gsap.set(events, { autoAlpha: 1, x: 0, y: 0 });
        gsap.set(progress, { scaleY: 1 });
        return;
      }

      gsap.set(progress, {
        scaleY: 0,
        transformOrigin: "top center",
      });

      gsap.to(progress, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: timeline,
          start: "top 65%",
          end: "bottom 45%",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      gsap.fromTo(
        ".schedule-intro",
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".schedule-intro",
            start: "top 85%",
            once: true,
          },
        }
      );

      events.forEach((event, index) => {
        const direction = index % 2 === 0 ? -70 : 70;
        const content = event.querySelectorAll(".schedule-content");

        gsap.fromTo(
          event,
          {
            autoAlpha: 0,
            x: direction,
            y: 18,
          },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: event,
              start: "top 84%",
              toggleActions: "play none none reverse",
            },
          }
        );

        gsap.fromTo(
          content,
          {
            autoAlpha: 0,
            y: 16,
            filter: "blur(3px)",
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.65,
            stagger: 0.1,
            delay: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: event,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      gsap.fromTo(
        ".schedule-cta-item",
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".schedule-cta",
            start: "top 85%",
            once: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, [activeDay]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-20 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <header className="schedule-intro mb-14 sm:mb-20">
          <SectionTitle title="Schedule" />

          <p className="mt-5 max-w-xl font-pixel text-sm leading-7 text-white/50 sm:text-base">
            Three days of technology, creativity and innovation.
          </p>
        </header>

        {/* Day selector */}
        <div className="mb-14 grid grid-cols-3 gap-2 sm:mb-20 sm:gap-4">
          {schedule.map((day) => {
            const selected = activeDay === day.id;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveDay(day.id)}
                aria-pressed={selected}
                className={`rounded-2xl px-3 py-4 text-left transition-colors duration-300 sm:px-6 sm:py-5 ${selected
                    ? "bg-[#55DFFF] text-black"
                    : "bg-[#0A0A0A] text-white hover:bg-[#151515]"
                  }`}
              >
                <span
                  className={`block font-hero text-xs uppercase tracking-wider sm:text-sm ${selected ? "text-black/70" : "text-[#55DFFF]"
                    }`}
                >
                  {day.date}
                </span>

                <span className="mt-2 block font-heading text-base sm:text-lg lg:text-xl">
                  {day.label}
                </span>

                <span
                  className={`mt-2 hidden font-pixel text-xs leading-6 sm:block ${selected ? "text-black/65" : "text-white/45"
                    }`}
                >
                  {day.theme}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active day heading */}
        <div key={currentDay.id} className="schedule-day-enter">
          <div className="mb-12 sm:mb-16">
            <p className="font-pixel text-sm uppercase tracking-[0.16em] text-[#55DFFF] sm:text-base">
              {currentDay.date}
            </p>

            <h2 className="mt-3 font-heading text-3xl leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {currentDay.theme}
            </h2>

            <p className="mt-3 font-pixel text-sm text-white/45 sm:text-base">
              {currentDay.events.length} scheduled events
            </p>
          </div>

          {/* Timeline */}
          <div ref={timelineRef} className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-2 top-0 w-px bg-white/15 md:left-1/2 md:-translate-x-1/2"
            >
              <div
                ref={progressRef}
                className="absolute inset-0 origin-top bg-[#55DFFF] shadow-[0_0_10px_rgba(85,223,255,0.35)]"
              />
            </div>

            <div className="space-y-8 sm:space-y-10 lg:space-y-12">
              {currentDay.events.map((event, index) => {
                const reverse = index % 2 === 1;

                return (
                  <div
                    key={event.id}
                    className="relative grid grid-cols-[1rem_minmax(0,1fr)] items-start md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]"
                  >
                    {/* Timeline marker */}
                    <div
                      aria-hidden="true"
                      className="relative z-10 col-start-1 row-start-1 flex justify-center pt-6 md:col-start-2"
                    >
                      <span className="size-5 bg-[#55DFFF] [clip-path:polygon(50%_0%,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0%_50%,38%_38%)] shadow-[0_0_12px_rgba(85,223,255,0.5)]" />
                    </div>
                    {/* Event card */}
                    <article
                      className={`schedule-event invisible col-start-2 row-start-1 min-w-0 rounded-2xl p-5 sm:p-7 lg:p-8 md:col-span-1 ${reverse
                          ? "md:col-start-3"
                          : "md:col-start-1"
                        }`}
                    >
                      <p className="schedule-content font-autotech text-xs uppercase tracking-[0.14em] text-[#55DFFF] sm:text-sm">
                        {event.category}
                      </p>

                      <h3 className="schedule-content mt-4 break-words font-heading text-xl leading-snug sm:text-2xl lg:text-3xl">
                        {event.title}
                      </h3>

                      <p className="schedule-content mt-3 font-pixel text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
                        {event.description}
                      </p>

                      <div className="schedule-content mt-6 space-y-3 text-base">
                        <p className="font-autotech text-white/70">
                          <span className="text-[#55DFFF]">Time</span>
                          <span className="px-2 text-white/70">-</span>
                          <span className="font-pixel">
                            {event.time} – {event.endTime}
                          </span>
                        </p>

                        <p className="font-autotech text-white/70">
                          <span className="text-[#55DFFF]">Venue</span>
                          <span className="px-2 text-white/70">-</span>
                          <span className="font-pixel">
                            {event.venue}
                          </span>
                        </p>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Closing section */}
        <div className="schedule-cta mt-24 text-center sm:mt-32 lg:mt-40">
          <h2 className="schedule-cta-item font-pixel text-2xl leading-relaxed text-[#55DFFF] sm:text-3xl lg:text-4xl">
            See you at TechXetra.
          </h2>

          <p className="schedule-cta-item mx-auto mt-5 max-w-md font-pixel text-sm leading-7 text-white/50 sm:text-base">
            Three days. New ideas. One shared future.
          </p>
        </div>
      </div>

      <style jsx>{`
        .schedule-day-enter {
          animation: schedule-enter 450ms ease-out both;
        }

        @keyframes schedule-enter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .schedule-day-enter {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
