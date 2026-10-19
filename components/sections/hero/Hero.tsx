"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import EarthScene from "@/components/animations/EarthScene";
import SilverFlight from "@/components/animations/SilverFlight";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const heroRef = useRef<HTMLElement>(null);
  const topLineRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const titleAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: 0.15,
      });

      intro
        .fromTo(
          topLineRef.current,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 0.9,
            ease: "power3.inOut",
          }
        )
        .fromTo(
          metaRef.current,
          { opacity: 0, y: -10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
          },
          "-=0.45"
        )
        .fromTo(
          titleAreaRef.current,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
          },
          "-=0.2"
        )
        .fromTo(
          bottomRef.current,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
          },
          "-=0.3"
        )
        .fromTo(
          scrollRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.5,
          },
          "-=0.2"
        );

      const scrollTimeline = gsap.timeline({
        scrollTrigger: {
          id: "TECHXTRA-HERO",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1.15,
        },
      });

      scrollTimeline
        .to(
          titleAreaRef.current,
          { y: -35, opacity: 0.3, ease: "none" },
          0
        )
        .to(
          metaRef.current,
          { y: -15, opacity: 0.2, ease: "none" },
          0
        )
        .to(
          bottomRef.current,
          { opacity: 0, ease: "none" },
          0.15
        )
        .to(
          scrollRef.current,
          { opacity: 0, ease: "none" },
          0
        );
    }, hero);

    return () => ctx.revert();
  }, []);

  const colorVariables = {
    "--tx-blue": TECHXETRA_COLORS.blue,
    "--tx-red": TECHXETRA_COLORS.red,
    "--tx-green": TECHXETRA_COLORS.green,
    "--tx-cream": TECHXETRA_COLORS.cream,
    "--tx-black": TECHXETRA_COLORS.black,
  } as CSSProperties;

  return (
    <section
      ref={heroRef}
      id="hero"
      style={colorVariables}
      className="relative isolate min-h-[100svh] overflow-hidden text-(--tx-cream)"
    >
      {/* Nebula background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute -right-[15%] top-[5%] h-[65%] w-[90%] rounded-full opacity-25 blur-[70px] sm:opacity-30 sm:blur-[100px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(190, 65, 35, 0.32) 0%, rgba(100, 35, 45, 0.16) 38%, transparent 72%)",
          }}
        />

        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{
            backgroundImage: "url('/assets/nebula.png')",
          }}
        />
      </div>

      <EarthScene />

      <div className="hidden md:block">
        <SilverFlight />
      </div>
      {/* Side glow */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_left,rgba(0,170,255,0.32)_0%,rgba(35,90,255,0.12)_35%,transparent_70%)]" />

      {/* Bottom atmospheric glow */}
      {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[35%] bg-[radial-gradient(ellipse_at_bottom,rgba(0,170,255,0.3)_0%,rgba(25,55,160,0.12)_40%,transparent_75%)]" /> */}

      {/* Subtle sci-fi texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.12] mix-blend-screen"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(180,235,255,0.035) 0px,
              rgba(180,235,255,0.035) 1px,
              transparent 1px,
              transparent 3px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(0,170,255,0.04) 0px,
              rgba(0,170,255,0.04) 1px,
              transparent 1px,
              transparent 5px
            )
          `,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1920px] flex-col px-5 pb-6 pt-24 sm:px-8 sm:pt-28 md:px-12 lg:px-16 lg:pb-9 xl:px-20">
        <div
          ref={topLineRef}
          className="h-px w-full origin-left bg-(--tx-cream)/25"
        />

        <div
          ref={metaRef}
          className="mt-4 flex items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-[3px]">
              <span className="h-[5px] w-4 bg-(--tx-blue)" />
              <span className="h-[5px] w-2 bg-(--tx-red)" />
              <span className="h-[5px] w-2 bg-(--tx-green)" />
            </div>

            <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-(--tx-cream)/65 sm:text-[10px]">
              TECHXTRA / {heroData.year}
            </span>
          </div>

          <span className="max-w-[55%] text-right font-pixel text-[8px] uppercase leading-relaxed tracking-[0.12em] text-(--tx-cream)/55 sm:text-[10px] sm:tracking-[0.16em]">
            {heroData.uni}
          </span>
        </div>

        {/* Title positioned at the top-middle */}
        <div className="flex flex-1 items-start justify-center pt-8 sm:pt-10 md:pt-12">
          <div
            ref={titleAreaRef}
            className="mx-auto w-full min-w-0 max-w-[1200px]"
          >
            <HeroTitle />

            <div className="mt-2 flex justify-end pr-[2%] sm:mt-3">
              <span className="font-pixel text-[clamp(1rem,2.5vw,2rem)] leading-none tracking-[0.12em] text-(--tx-blue)">
                {heroData.year}
              </span>
            </div>
          </div>
        </div>

        <div
          ref={bottomRef}
          className="flex items-end justify-between gap-4 border-t border-(--tx-cream)/15 pt-4 sm:pt-5"
        >
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-(--tx-green)" />

            <span className="font-pixel text-[8px] uppercase tracking-[0.12em] text-(--tx-cream)/50 sm:text-[9px] sm:tracking-[0.18em]">
              Tezpur University · Assam, India
            </span>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="absolute bottom-24 right-6 hidden flex-col items-center gap-3 md:flex lg:right-10"
        >
          <span className="font-pixel text-[7px] uppercase tracking-[0.25em] text-(--tx-cream)/45 [writing-mode:vertical-rl]">
            Scroll
          </span>

          <span className="h-12 w-px bg-gradient-to-b from-(--tx-cream)/60 to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default Hero;