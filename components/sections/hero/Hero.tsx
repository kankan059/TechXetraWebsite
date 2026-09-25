"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import LogoTech from "@/components/animations/LogoTech";

gsap.registerPlugin(ScrollTrigger);

const HERO_MOTION = {
  introDelay: 0.15,
  titleDuration: 1.15,
  titleStagger: 0.055,
  contentDuration: 0.75,
  scrollScrub: 1.15,
};

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const topLineRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const titleAreaRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;

    if (!hero) return;

    const ctx = gsap.context(() => {
      // const letters = gsap.utils.toArray<HTMLElement>(".hero-title-letter");

      gsap.set(topLineRef.current, {
        scaleX: 0,
        transformOrigin: "left center",
      });

      // gsap.set(letters, {
      //   yPercent: 115,
      //   rotateX: -65,
      //   opacity: 0,
      //   transformOrigin: "50% 100%",
      // });

      const intro = gsap.timeline({
        delay: HERO_MOTION.introDelay,
      });

      intro
        .to(topLineRef.current, {
          scaleX: 1,
          duration: 1.1,
          ease: "power3.inOut",
        })
        .fromTo(
          metaRef.current,
          { opacity: 0, y: -12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power3.out",
          },
          "-=0.65"
        )
        // .to(
        //   letters,
        //   {
        //     yPercent: 0,
        //     rotateX: 0,
        //     opacity: 1,
        //     duration: HERO_MOTION.titleDuration,
        //     stagger: HERO_MOTION.titleStagger,
        //     ease: "back.out(1.7)",
        //   },
        //   "-=0.35"
        // )
        .fromTo(
          yearRef.current,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.65"
        )
        .fromTo(
          bottomRef.current,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: HERO_MOTION.contentDuration,
            ease: "power3.out",
          },
          "-=0.5"
        )
        .fromTo(
          scrollRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.55,
            ease: "power2.out",
          },
          "-=0.3"
        );

      const scrollTimeline = gsap.timeline({
        scrollTrigger: {
          id: "TECHXTRA-HERO",
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: HERO_MOTION.scrollScrub,
        },
      });

      scrollTimeline
        // .to(
        //   letters,
        //   {
        //     y: -90,
        //     x: -40,
        //     scale: 1.3,
        //     opacity: 0.1,
        //     rotate: -45,
        //     ease: "back.out",
        //   },
        //   0
        // )
        .to(
          titleAreaRef.current,
          {
            x: -40,
            scale: 0.8,
            opacity: 0.1,
            ease: "back.inOut",
          },
          0
        )
        .to(
          metaRef.current,
          {
            y: -25,
            opacity: 0,
            ease: "none",
          },
          0
        )
        .to(
          bottomRef.current,
          {
            y: -55,
            opacity: 0,
            ease: "none",
          },
          0.08
        )
        .to(
          scrollRef.current,
          {
            opacity: 0,
            ease: "none",
          },
          0.05
        );

      gsap.to(".hero-scroll-line", {
        scaleX: 0.15,
        transformOrigin: "right center",
        ease: "none",
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "45% top",
          scrub: true,
        },
      });
    }, heroRef);

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
    
    <section ref={heroRef} id="hero" style={colorVariables} className="relative z-10 min-h-[100svh] overflow-hidden text-(--tx-cream)">
       <LogoTech />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1920px] flex-col px-5 pb-6 pt-24 sm:px-8 md:px-12 md:pb-8 lg:px-16 lg:pt-28 xl:px-20">
        <div ref={topLineRef} className="h-px w-full bg-(--tx-cream)/20" />

        <div ref={metaRef} className="mt-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-[3px]">
              <span className="h-[6px] w-4 bg-(--tx-blue)" />
              <span className="h-[6px] w-2 bg-(--tx-red)" />
              <span className="h-[6px] w-2 bg-(--tx-green)" />
            </div>

            <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-(--tx-cream)/50 sm:text-[9px]">
              TECHXTRA / {heroData.year}
            </span>
          </div>

          <div className="font-pixel text-right text-[8px] uppercase leading-[1.7] tracking-[0.16em] text-(--tx-cream)/40 sm:text-[10px]">
            <span>{heroData.uni}</span>
          </div>
        </div>

        <div className="flex flex-1 items-center">
          <div ref={titleAreaRef} className="relative w-full pt-6 md:w-[80%] lg:w-[75%] xl:w-[72%]">
            <HeroTitle />

            <div className="mt-4 flex items-center sm:mt-5">
              <div ref={yearRef} className="font-pixel text-[8vw] leading-none text-(--tx-blue) sm:text-[6vw] md:text-[5.2vw] lg:text-[3.3vw]">
                {heroData.year}
              </div>
            </div>
          </div>
        </div>

        <div ref={bottomRef} className="grid grid-cols-1 gap-6 border-t border-(--tx-cream)/15 pt-5 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5 lg:col-span-4">
            <p className="max-w-[440px] font-body text-[13px] leading-[1.65] text-(--tx-cream)/62 sm:text-[14px] lg:text-[15px]">
              {heroData.description}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
          <span className="font-pixel text-[7px] uppercase tracking-[0.28em] text-(--tx-cream)/30">
            Scroll
          </span>

          <div className="relative h-12 w-px overflow-hidden bg-(--tx-cream)/10">
            <span className="hero-scroll-line absolute left-0 top-0 h-4 w-px bg-gradient-to-b from-transparent via-(--tx-cream)/80 to-transparent" />
          </div>

          <span className="h-[3px] w-[3px] rounded-full bg-(--tx-blue) shadow-[0_0_8px_var(--tx-blue)]" />
        </div>

        <div className="pointer-events-none absolute right-5 top-[29%] flex items-center gap-2 md:hidden">
          <span className="h-[4px] w-[4px] rounded-full bg-(--tx-blue)" />
        </div>
      </div>
    </section>
  );
}