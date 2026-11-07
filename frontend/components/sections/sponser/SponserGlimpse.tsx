"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { sponsors } from "@/data/sponser";
import SectionTitle from "@/components/ui/SectionTitle";

/**
 * SponserGlimpse — Infinite Loop Showcase
 * ─────────────────────────────────────────
 * Premium auto-scrolling marquee displaying sponsor logos/names.
 * Two parallel tracks for seamless infinite loop effect.
 * GSAP drives the animation for GPU-accelerated smoothness.
 */

export default function SponserGlimpse() {
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    const track1 = track1Ref.current;
    const track2 = track2Ref.current;
    if (!track1 || !track2) return;

    // Calculate track width — ensure smooth loop
    const trackWidth = track1.scrollWidth;
    const duration = trackWidth / 60; // 60px per second for smooth scroll

    // Track 1 — slides from 0 to -100%
    gsap.fromTo(
      track1,
      { x: 0 },
      {
        x: -trackWidth,
        duration,
        ease: "none",
        repeat: -1,
      }
    );

    // Track 2 — starts at +100%, slides to 0
    gsap.fromTo(
      track2,
      { x: trackWidth },
      {
        x: 0,
        duration,
        ease: "none",
        repeat: -1,
      }
    );

    return () => {
      gsap.killTweensOf([track1, track2]);
    };
  }, []);

  // Duplicate sponsors array to fill track seamlessly
  const sponsorList = [...sponsors, ...sponsors, ...sponsors];

  return (
    <section
      className="relative w-full overflow-hidden py-16 sm:py-20 lg:py-24"
      aria-label="Our sponsors"
    >
      {/* ── Background ambience ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gradient accent */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(ellipse, #62C7E8 0%, transparent 70%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "radial-gradient(rgba(247,243,222,0.3) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative z-10 mb-10 sm:mb-12 md:mb-14 lg:mb-16 pl-16 sm:pl-20 md:pl-24">
        <SectionTitle title="our sponser" align="left" />
      </header>

      {/* ── Infinite Scroll Marquee ─────────────────────────────────── */}
      <div className="relative z-10">
        {/* Edge fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-32 lg:w-48 z-20 pointer-events-none bg-gradient-to-r from-[#080808] to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-32 lg:w-48 z-20 pointer-events-none bg-gradient-to-l from-[#080808] to-transparent" />

        {/* Marquee container */}
        <div className="relative overflow-hidden">
          {/* Track 1 */}
          <div
            ref={track1Ref}
            className="flex items-center gap-8 sm:gap-12 lg:gap-16 whitespace-nowrap will-change-transform"
            style={{ display: "inline-flex" }}
          >
            {sponsorList.map((sponsor, index) => (
              <SponsorCard key={`track1-${index}`} sponsor={sponsor} />
            ))}
          </div>

          {/* Track 2 — seamless continuation */}
          <div
            ref={track2Ref}
            className="flex items-center gap-8 sm:gap-12 lg:gap-16 whitespace-nowrap absolute top-0 left-0 will-change-transform"
            style={{ display: "inline-flex" }}
          >
            {sponsorList.map((sponsor, index) => (
              <SponsorCard key={`track2-${index}`} sponsor={sponsor} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom accent line ──────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20 mt-12">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}

// ─── Sponsor Card ─────────────────────────────────────────────────────────────

type SponsorCardProps = {
  sponsor: {
    name: string;
    tier: string;
    image: string;
  };
};

function SponsorCard({ sponsor }: SponsorCardProps) {
  return (
    <div className="group relative flex-shrink-0 rounded-4xl">
      {/* Card wrapper */}
      <div
        className="relative overflow-hidden border rounded-4xl border-white/[0.06] bg-[#0d0d0d]/40 backdrop-blur-sm transition-all duration-500 hover:border-cyan-400/30 hover:bg-[#0d0d0d]/60"
        style={{
          width: "clamp(220px, 18vw, 280px)",
          height: "clamp(140px, 12vw, 180px)",
          borderRadius: "2px",
        }}
      >
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src={sponsor.image}
            alt={sponsor.name}
            className="w-full h-full object-cover rounded-4xl opacity-[1] grayscale group-hover:opacity-[0.25] group-hover:grayscale-0 transition-all duration-700"
            loading="lazy"
            draggable={false}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
          {/* Tier badge */}
          <div className="mb-3 px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 backdrop-blur-sm">
            <p className="font-pixel text-[7px] sm:text-[8px] tracking-[0.2em] text-cyan-300/70 uppercase">
              {sponsor.tier}
            </p>
          </div>

          {/* Sponsor name */}
          <h3 className="font-pixel text-base sm:text-lg lg:text-xl uppercase text-white/90 leading-tight group-hover:text-white transition-colors duration-300">
            {sponsor.name}
          </h3>

          {/* Hover glow line */}
          <div className="absolute bottom-0 left-0 w-0 h-px rounded-4xl bg-gradient-to-r from-cyan-400/60 to-[#0972AE]/60 group-hover:w-full transition-all duration-500" />
        </div>

        {/* Corner accents (subtle premium touch) */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t rounded-4xl border-l border-cyan-400/0 group-hover:border-cyan-400/40 transition-colors duration-300" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r rounded-4xl border-cyan-400/0 group-hover:border-cyan-400/40 transition-colors duration-300" />
      </div>

      {/* Bottom reflection effect (subtle depth) */}
      <div
        className="absolute top-full left-0 right-0 h-6 opacity-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(98,199,232,0.12), transparent)",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}
