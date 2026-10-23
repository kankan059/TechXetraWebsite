
"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import CosmicJourney from "@/components/animations/CosmicJourney";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleIntroRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  const chapterOneRef = useRef<HTMLDivElement>(null);
  const chapterTwoRef = useRef<HTMLDivElement>(null);
  const chapterThreeRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef<HTMLDivElement>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);

  // Stable object: the Three.js render loop reads it without React rerenders.
  const journeyProgress = useRef({ value: 0 });

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let refreshFrame = 0;

    const ctx = gsap.context(() => {
      gsap.set(
        [
          chapterOneRef.current,
          chapterTwoRef.current,
          chapterThreeRef.current,
          endingRef.current,
        ],
        { autoAlpha: 0 }
      );

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.12,
      });

      intro
        .fromTo(
          lineRef.current,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.85, ease: "power2.inOut" }
        )
        .fromTo(
          metaRef.current,
          { autoAlpha: 0, y: -8 },
          { autoAlpha: 1, y: 0, duration: 0.55 },
          "-=0.35"
        )
        .fromTo(
          titleIntroRef.current,
          { autoAlpha: 0, y: 24, filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
          },
          "-=0.1"
        )
        .fromTo(
          footerRef.current,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.6 },
          "-=0.35"
        )
        .fromTo(
          scrollHintRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.45 },
          "-=0.2"
        );

      const story = gsap.timeline({
        scrollTrigger: {
          id: "TECHXTRA-COSMIC-JOURNEY",
          trigger: hero,
          start: "top top",
          end: () => {
            if (window.innerWidth < 640) return "+=4500";
            if (window.innerWidth < 1024) return "+=6000";
            return "+=7000";
          },
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onUpdate: (self) => {
            journeyProgress.current.value = self.progress;

            if (progressBarRef.current) {
              gsap.set(progressBarRef.current, {
                scaleX: self.progress,
              });
            }
          },

          onRefresh: (self) => {
            journeyProgress.current.value = self.progress;
          },
        },
      });

      // Opening: leave the title behind as the camera enters the galaxy.
      story
        .to(
          titleRef.current,
          {
            autoAlpha: 0,
            y: -45,
            scale: 0.94,
            duration: 0.14,
            ease: "none",
          },
          0.02
        )
        .to(
          metaRef.current,
          { autoAlpha: 0, y: -12, duration: 0.1, ease: "none" },
          0.02
        )
        .to(
          footerRef.current,
          { autoAlpha: 0, y: 12, duration: 0.08, ease: "none" },
          0.02
        )
        .to(
          scrollHintRef.current,
          { autoAlpha: 0, duration: 0.06, ease: "none" },
          0.02
        );

      // Chapter 01 — Galaxy.
      story
        .fromTo(
          chapterOneRef.current,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.08,
            ease: "none",
          },
          0.14
        )
        .to(
          chapterOneRef.current,
          {
            autoAlpha: 0,
            y: -18,
            duration: 0.06,
            ease: "none",
          },
          0.31
        );

      // Chapter 02 — Solar system.
      story
        .fromTo(
          chapterTwoRef.current,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.08,
            ease: "none",
          },
          0.36
        )
        .to(
          chapterTwoRef.current,
          {
            autoAlpha: 0,
            y: -18,
            duration: 0.06,
            ease: "none",
          },
          0.53
        );

      // Chapter 03 — Earth.
      story
        .fromTo(
          chapterThreeRef.current,
          { autoAlpha: 0, y: 32 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.08,
            ease: "none",
          },
          0.58
        )
        .to(
          chapterThreeRef.current,
          {
            autoAlpha: 0,
            y: -18,
            duration: 0.06,
            ease: "none",
          },
          0.75
        );

      // Final stop — Scorpio constellation.
      story
        .fromTo(
          endingRef.current,
          { autoAlpha: 0, y: 24, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.08,
            ease: "none",
          },
          0.79
        )
        .to(
          endingRef.current,
          { autoAlpha: 0, duration: 0.04, ease: "none" },
          1.03
        );
    }, hero);

    refreshFrame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(refreshFrame);
      ctx.revert();
    };
  }, []);

  const colorVariables = {
    "--tx-blue": TECHXETRA_COLORS.blue,
    "--tx-red": TECHXETRA_COLORS.red,
    "--tx-green": TECHXETRA_COLORS.green,
    "--tx-cream": TECHXETRA_COLORS.cream,
    "--tx-black": TECHXETRA_COLORS.black,
  } as CSSProperties;

  const chapterClass =
    "pointer-events-none absolute inset-0 flex items-center px-5 sm:px-12 md:px-20";

  const storyPanelClass =
    "w-full max-w-2xl border-l border-(--tx-blue)/70 bg-[linear-gradient(90deg,rgba(3,5,11,0.94),rgba(3,5,11,0.76)_72%,rgba(3,5,11,0.1))] py-5 pl-5 pr-3 sm:py-8 sm:pl-9 sm:pr-8";

  return (
    <section
      ref={heroRef}
      id="hero"
      style={colorVariables}
      className="relative isolate h-[100svh] min-h-[580px] overflow-hidden bg-[#03050b] text-(--tx-cream)"
    >
      {/* Static color depth behind the transparent WebGL canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 68% 36%, rgba(147,44,47,0.19), transparent 42%),
            radial-gradient(ellipse at 30% 70%, rgba(24,75,157,0.18), transparent 45%),
            linear-gradient(180deg, #03050b, #060914 52%, #03050b)
          `,
        }}
      />

      <CosmicJourney progress={journeyProgress.current} />

      {/* Soft vignette keeps text legible over the 3D scene */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(3,5,11,0.38),transparent_78%),linear-gradient(180deg,rgba(3,5,11,0.25),transparent_25%,transparent_70%,rgba(3,5,11,0.5))]"
      />

      {/* Frame details */}
      <div className="pointer-events-none absolute inset-4 z-20 sm:inset-6">
        <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-(--tx-blue)/45" />
        <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-(--tx-blue)/45" />
        <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-(--tx-blue)/45" />
        <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-(--tx-blue)/45" />
      </div>

      {/* Main interface */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1920px] flex-col px-5 pb-6 pt-20 sm:px-8 sm:pt-24 md:px-12 lg:px-16 xl:px-20">
        <div
          ref={lineRef}
          className="h-px w-full origin-left bg-linear-to-r from-(--tx-blue)/70 via-(--tx-cream)/20 to-transparent"
        />

        <div
          ref={metaRef}
          className="flex items-start justify-between gap-4 pt-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-[3px]">
              <span className="h-[5px] w-4 bg-(--tx-blue)" />
              <span className="h-[5px] w-2 bg-(--tx-red)" />
              <span className="h-[5px] w-2 bg-(--tx-green)" />
            </div>

            <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-(--tx-cream)/75 sm:text-[10px]">
              TECHXTRA / {heroData.year}
            </span>
          </div>

          <span className="max-w-[55%] text-right font-pixel text-[8px] uppercase leading-relaxed tracking-[0.12em] text-(--tx-cream)/65 sm:text-[10px]">
            {heroData.uni}
          </span>
        </div>

        {/* Opening title */}
        <div className="flex flex-1 items-center justify-center">
          <div
            ref={titleRef}
            className="w-full will-change-transform"
          >
            <div
              ref={titleIntroRef}
              className="mx-auto max-w-[1200px]"
            >
              <p className="mb-5 text-center font-pixel text-[8px] uppercase tracking-[0.3em] text-(--tx-cream)/70 sm:text-[10px] sm:tracking-[0.4em]">
                A journey beyond the familiar
              </p>

              <HeroTitle />

              <div className="mt-4 flex items-center justify-between gap-3 px-1 sm:px-4">
                <span className="font-pixel text-[8px] uppercase tracking-[0.14em] text-(--tx-cream)/55 sm:text-[10px]">
                  Tezpur University · Assam
                </span>

                <span className="font-pixel text-[clamp(1rem,2.5vw,2rem)] leading-none tracking-[0.12em] text-(--tx-blue)">
                  {heroData.year}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter 01 — Galaxy */}
        <div ref={chapterOneRef} className={chapterClass}>
          <article className={storyPanelClass}>
            <p className="mb-4 font-pixel text-[9px] uppercase tracking-[0.24em] text-(--tx-blue) sm:text-[10px]">
              01 / Beyond our world
            </p>

            <h2 className="max-w-xl text-3xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl">
              Everything begins with a question.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-(--tx-cream)/80 sm:text-base sm:leading-8">
              Billions of stars. Countless worlds. Each one a reminder of how
              much remains undiscovered. Every journey into the unknown begins
              when someone dares to ask what lies beyond.
            </p>

            <p className="mt-5 font-pixel text-[8px] uppercase tracking-[0.18em] text-(--tx-cream)/45 sm:text-[9px]">
              Keep looking closer
            </p>
          </article>
        </div>

        {/* Chapter 02 — Solar system */}
        <div ref={chapterTwoRef} className={chapterClass}>
          <article className={storyPanelClass}>
            <p className="mb-4 font-pixel text-[9px] uppercase tracking-[0.24em] text-(--tx-red) sm:text-[10px]">
              02 / A system in motion
            </p>

            <h2 className="max-w-xl text-3xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl">
              Every world follows a path.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-(--tx-cream)/80 sm:text-base sm:leading-8">
              Around one star, different worlds travel through the same
              system. The universe works through connection, movement, and
              discovery. So do the ideas that take us forward.
            </p>

            <p className="mt-5 font-pixel text-[8px] uppercase tracking-[0.18em] text-(--tx-cream)/45 sm:text-[9px]">
              Follow the journey inward
            </p>
          </article>
        </div>

        {/* Chapter 03 — Earth */}
        <div ref={chapterThreeRef} className={chapterClass}>
          <article className={storyPanelClass}>
            <p className="mb-4 font-pixel text-[9px] uppercase tracking-[0.24em] text-(--tx-blue) sm:text-[10px]">
              03 / Our pale blue dot
            </p>

            <h2 className="max-w-xl text-3xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl md:text-6xl">
              This is where ideas become real.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-(--tx-cream)/80 sm:text-base sm:leading-8">
              On this small blue planet, curiosity becomes invention. We
              imagine, experiment, build, and try again. The future is not
              something we simply watch arrive; it is something we create
              together.
            </p>

            <p className="mt-5 font-pixel text-[8px] uppercase tracking-[0.18em] text-(--tx-cream)/45 sm:text-[9px]">
              Made by curious minds
            </p>
          </article>
        </div>

        {/* Final stop — Scorpio */}
        <div
          ref={endingRef}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 text-center sm:px-10"
        >
          <article className="w-full max-w-3xl border-t border-(--tx-blue)/45 bg-[linear-gradient(180deg,rgba(3,5,11,0.04),rgba(3,5,11,0.78)_22%,rgba(3,5,11,0.78)_78%,rgba(3,5,11,0.04))] px-4 py-8 sm:px-10 sm:py-12">
            <p className="font-pixel text-[9px] uppercase tracking-[0.3em] text-(--tx-blue) sm:text-[10px]">
              04 / The stars align
            </p>

            <h2 className="mt-5 text-4xl font-medium leading-[1] tracking-[-0.055em] sm:text-6xl md:text-8xl">
              LOOK BEYOND.
              <span className="mt-2 block text-(--tx-red)">
                BUILD WHAT'S NEXT.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-(--tx-cream)/80 sm:text-base sm:leading-8">
              From the stars above to the ideas we bring to life, the next
              discovery starts with us.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-(--tx-blue)/60" />

              <span className="font-pixel text-[10px] uppercase tracking-[0.25em] text-(--tx-cream)">
                TECHXTRA / {heroData.year}
              </span>

              <span className="h-px w-10 bg-(--tx-blue)/60" />
            </div>

            <p className="mt-5 font-pixel text-[8px] uppercase tracking-[0.2em] text-(--tx-cream)/45 sm:text-[9px]">
              Scroll to continue
            </p>
          </article>
        </div>

        {/* Footer */}
        <div
          ref={footerRef}
          className="flex items-end justify-between gap-4 border-t border-(--tx-cream)/15 pt-4 sm:pt-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-(--tx-green)" />

            <span className="truncate font-pixel text-[8px] uppercase tracking-[0.12em] text-(--tx-cream)/65 sm:text-[9px] sm:tracking-[0.18em]">
              Tezpur University · Assam, India
            </span>
          </div>

          <span className="hidden font-pixel text-[8px] uppercase tracking-[0.15em] text-(--tx-cream)/45 sm:block">
            The journey continues
          </span>
        </div>

        {/* Scroll indicator */}
        <div
          ref={scrollHintRef}
          className="absolute bottom-24 right-6 hidden flex-col items-center gap-3 md:flex lg:right-10"
        >
          <span className="font-pixel text-[7px] uppercase tracking-[0.25em] text-(--tx-cream)/60 [writing-mode:vertical-rl]">
            Scroll to explore
          </span>

          <span className="h-12 w-px bg-linear-to-b from-(--tx-blue)/80 to-transparent" />
        </div>
      </div>

      {/* Scroll progress */}
      <div className="pointer-events-none absolute bottom-0 left-0 z-30 h-[2px] w-full bg-white/10">
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left scale-x-0 bg-(--tx-blue) shadow-[0_0_12px_rgba(85,223,255,0.65)]"
        />
      </div>
    </section>
  );
};

export default Hero;
