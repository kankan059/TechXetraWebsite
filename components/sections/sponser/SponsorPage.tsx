
"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { sponsors } from "@/data/sponser";

gsap.registerPlugin(ScrollTrigger);

export default function SponsorPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const timeline = timelineRef.current;
    const progress = progressRef.current;

    if (!section || !timeline || !progress) return;

    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const cards = gsap.utils.toArray<HTMLElement>(".sponsor-card");

      if (reducedMotion) {
        gsap.set(cards, { autoAlpha: 1, x: 0, y: 0 });
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
        },
      });

      gsap.fromTo(
        ".sponsor-intro",
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".sponsor-intro",
            start: "top 85%",
            once: true,
          },
        }
      );

      cards.forEach((card, index) => {
        const image = card.querySelector<HTMLElement>(".sponsor-image");
        const content = card.querySelectorAll(".sponsor-content");
        const direction = index % 2 === 0 ? -90 : 90;

        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            x: direction,
            y: 18,
          },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          }
        );

        gsap.fromTo(
          content,
          {
            autoAlpha: 0,
            y: 18,
            filter: "blur(3px)",
          },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.65,
            stagger: 0.1,
            delay: 0.16,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 78%",
              toggleActions: "play none none reverse",
            },
          }
        );

        if (image) {
          gsap.fromTo(
            image,
            { scale: 1.1 },
            {
              scale: 1,
              duration: 1.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 82%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      });

      gsap.fromTo(
        ".sponsor-cta-item",
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".sponsor-cta",
            start: "top 85%",
            once: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-20 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="sponsor-intro mb-16 sm:mb-20 lg:mb-24">
          <SectionTitle
            title="Our Sponsors"
          />
        </div>

        <div ref={timelineRef} className="relative">
          {/* Timeline track */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-[11px] top-0 w-px  md:left-1/2 md:-translate-x-1/2"
          >
            <div
              ref={progressRef}
              className="absolute inset-0 origin-top bg-[#55DFFF] shadow-[0_0_10px_rgba(85,223,255,0.45)]"
            />
          </div>

          <div className="space-y-10 sm:space-y-14 lg:space-y-20">
            {sponsors.map((sponsor, index) => {
              const reverse = index % 2 === 1;

              return (
                <div
                  key={`${sponsor.name}-${index}`}
                  className="relative grid grid-cols-[24px_minmax(0,1fr)] items-center md:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]"
                >
                  {/* Timeline marker */}
                  <div
                    aria-hidden="true"
                    className="relative z-10 col-start-1 row-start-1 flex justify-center md:col-start-2"
                  >
                    <span className="h-3 w-3 rounded-full border-2 border-[#55DFFF]  shadow-[0_0_12px_rgba(85,223,255,0.3)]" />
                  </div>

                  {/* Sponsor card */}
                  <article
                    className={`sponsor-card invisible group relative col-start-2 row-start-1 min-w-0 overflow-hidden rounded-[22px]  md:col-span-1 md:row-start-1 ${
                      reverse
                        ? "md:col-start-3"
                        : "md:col-start-1"
                    }`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[22px] ">
                      <Image
                        src={sponsor.image}
                        alt={sponsor.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 90vw, 540px"
                        draggable={false}
                        className="sponsor-image object-cover transition-transform duration-700 ease-out hover:scale-[0.6] cursor-pointer"
                      />
                    </div>

                    <div className="px-1 pb-2 pt-5 sm:pt-6 lg:pt-7">
                      <p className="sponsor-content  text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[#55DFFF] sm:text-sm font-autotech">
                        {sponsor.tier}
                      </p>

                      <h3 className="sponsor-content mt-3 break-words text-2xl font-medium leading-tight tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl font-heading">
                        {sponsor.name}
                      </h3>

                      <p className="sponsor-content mt-3 max-w-lg text-sm leading-6 text-white/50 sm:text-xl font-pixel sm:leading-7">
                        {sponsor.description}
                      </p>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sponsor-cta mt-24 text-center sm:mt-32 lg:mt-40">
          <h2 className="sponsor-cta-item font-pixel text-xl leading-relaxed text-[#55DFFF] sm:text-2xl lg:text-3xl">
            Build the future with us.
          </h2>

          <p className="sponsor-cta-item mx-auto mt-5 max-w-md text-sm leading-7 text-white/50 sm:text-base">
            Bring your brand into the next chapter of technology and
            creativity.
          </p>

          <div className="sponsor-cta-item mt-8">
            <Button href="/contact">Become a Sponsor</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
