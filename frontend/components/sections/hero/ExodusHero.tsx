"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import BackGround from "@/components/animations/BackGround";

gsap.registerPlugin(ScrollTrigger);
// Stops mobile address-bar show/hide from triggering expensive refreshes mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true });

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Phones, tablets and any touch-first device get the lightweight rendering path. */
const LITE_QUERY = "(max-width: 1023px), (pointer: coarse)";

/** Change the font classes here once; they are used across the whole section. */
const FONT = {
  display: "font-roboto",
  body: "font-roboto",
  accent: "font-pixel",
} as const;

const COPY = {
  tagline: "Leave the known. Chase the North Star.",
  cover: "A new dimension",
} as const;

/** Same artwork as before. Stories point at these by index, so each image is decoded once. */
const PAGES = [
  "/assets/exodus/world.webp",
  "/assets/exodus/departure.webp",
  "/assets/exodus/ascent.webp",
  "/assets/exodus/arrival.webp",
] as const;

const stories = [
  {
    page: 0,
    title: "Every world has its limits.",
    body: "Every great journey begins when the familiar is no longer enough.",
    position: "left",
  },
  {
    page: 0,
    title: "A new beginning was only the start.",
    body: "In 2024, TechXetra was reborn. Not an ending, but the beginning of becoming more.",
    position: "right",
  },
  {
    page: 1,
    title: "Leave what you know.",
    body: "Growth asks us to step beyond what we understand and move towards what we have yet to discover.",
    position: "top",
  },
  {
    page: 1,
    title: "The path is unwritten.",
    body: "Uncertainty is not the end. It is where new ideas, courage and possibility begin.",
    position: "left",
  },
  {
    page: 2,
    title: "Chase the North Star.",
    body: "Look beyond today's boundaries. Follow the ideas that lead us towards something greater.",
    position: "top",
  },
  {
    page: 2,
    title: "Become more than before.",
    body: "Technology moves us forward. Imagination takes us beyond. Together, we shape what comes next.",
    position: "right",
  },
  {
    page: 3,
    title: "EXODUS",
    body: "Leave the known. Chase the North Star.",
    position: "center",
  },
] as const;

type StoryPosition = (typeof stories)[number]["position"];

const positionClasses: Record<StoryPosition, string> = {
  left: "items-center justify-start text-left",
  top: "items-start justify-start pt-[15svh] text-left",
  right: "items-center justify-end text-right",
  center: "items-center justify-center text-center",
};

/** Directional scrims keep text readable without darkening the whole artwork. */
const scrimClasses: Record<StoryPosition, string> = {
  left: "bg-[linear-gradient(90deg,rgba(3,4,10,0.8)_0%,rgba(3,4,10,0.45)_42%,transparent_80%)]",
  right:
    "bg-[linear-gradient(270deg,rgba(3,4,10,0.8)_0%,rgba(3,4,10,0.45)_42%,transparent_80%)]",
  top: "bg-[linear-gradient(180deg,rgba(3,4,10,0.8)_0%,rgba(3,4,10,0.4)_40%,transparent_74%)]",
  center:
    "bg-[radial-gradient(ellipse_at_center,rgba(3,4,10,0.62)_0%,rgba(3,4,10,0.28)_50%,transparent_82%)]",
};

/* ------------------------------------------------------------------ */
/* The constellation: the Little Dipper, ending on Polaris.            */
/* Stars light up in story order; the last one is the North Star.      */
/* ------------------------------------------------------------------ */
const CONSTELLATION = [
  { x: 96, y: 44 },
  { x: 92, y: 63 },
  { x: 68, y: 65 },
  { x: 66, y: 46 },
  { x: 52, y: 39 },
  { x: 36, y: 31 },
  { x: 18, y: 22 }, // Polaris
] as const;

/** Line i joins two stars. The last one closes the bowl when the journey completes. */
const LINKS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [3, 0],
];

const STARLIGHT = "#cfd9ff";
const POLARIS = "#f2d58a";

/* ------------------------------------------------------------------ */
/* Static star fields. Generated once, painted once, no DOM per star.  */
/* ------------------------------------------------------------------ */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function field(
  count: number,
  seed: number,
  blur: number,
  spread: number,
  minA: number,
  maxA: number
) {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (r() * 100).toFixed(2);
    const y = (r() * 118).toFixed(2);
    const a = (minA + r() * (maxA - minA)).toFixed(2);
    const tint = r() > 0.82 ? "255,226,170" : "214,226,255";
    out.push(`${x}vw ${y}svh ${blur}px ${spread}px rgba(${tint},${a})`);
  }
  return out.join(",");
}

const STARS_FAR = field(110, 7, 0, 0, 0.25, 0.7);
const STARS_NEAR = field(34, 23, 1, 0.4, 0.55, 1);

/** A handful of slow twinkles. Opacity-only, so they stay on the compositor. */
const TWINKLES = [
  { left: "12%", top: "24%", delay: "0s", dur: "3.6s" },
  { left: "31%", top: "68%", delay: "1.1s", dur: "4.4s" },
  { left: "58%", top: "14%", delay: "2.2s", dur: "3.9s" },
  { left: "76%", top: "42%", delay: "0.6s", dur: "5s" },
  { left: "90%", top: "78%", delay: "1.8s", dur: "4.1s" },
  { left: "44%", top: "86%", delay: "2.7s", dur: "3.3s" },
] as const;

/* ---- Timeline constants (timeline units, scrubbed over the full scroll distance) ---- */
const INTRO_HOLD = 0.15;
const COVER_OUT = 0.5;
const STORY_START = INTRO_HOLD + COVER_OUT;
const CHAPTER = 0.82;
const TAIL_HOLD = 0.55;

function ConstellationMark() {
  const last = CONSTELLATION.length - 1;
  return (
    <svg
      viewBox="0 0 116 84"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="A constellation that completes as the story unfolds"
    >
      {LINKS.map(([a, b], i) => (
        <line
          key={`l-${i}`}
          className="cn-line"
          x1={CONSTELLATION[a].x}
          y1={CONSTELLATION[a].y}
          x2={CONSTELLATION[b].x}
          y2={CONSTELLATION[b].y}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
          stroke={STARLIGHT}
          strokeOpacity={0.7}
          strokeWidth={0.7}
          strokeLinecap="round"
        />
      ))}

      <g className="cn-flare" opacity={0}>
        <line x1={6} y1={22} x2={30} y2={22} stroke={POLARIS} strokeOpacity={0.7} strokeWidth={0.5} />
        <line x1={18} y1={8} x2={18} y2={36} stroke={POLARIS} strokeOpacity={0.7} strokeWidth={0.5} />
      </g>

      {CONSTELLATION.map((s, i) => (
        <g key={`s-${i}`}>
          <circle
            className="cn-halo"
            cx={s.x}
            cy={s.y}
            r={i === last ? 7 : 5}
            fill="none"
            stroke={i === last ? POLARIS : STARLIGHT}
            strokeWidth={0.5}
            opacity={0}
          />
          <circle
            className="cn-star"
            cx={s.x}
            cy={s.y}
            r={1.5}
            fill={i === last ? POLARIS : "#ffffff"}
            opacity={0.35}
          />
        </g>
      ))}
    </svg>
  );
}

export default function Hero() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  // null = not detected yet (SSR / first paint). true = phone / tablet / touch. false = desktop.
  const [isLite, setIsLite] = useState<boolean | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const loaderBarRef = useRef<HTMLDivElement>(null);

  const colorVariables = {
    "--tx-blue": TECHXETRA_COLORS.blue,
    "--tx-red": TECHXETRA_COLORS.red,
    "--tx-green": TECHXETRA_COLORS.green,
    "--tx-cream": TECHXETRA_COLORS.cream,
  } as CSSProperties;

  // Detect phone / tablet / touch devices, and stay in sync if the viewport crosses the breakpoint.
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(LITE_QUERY);
    setIsLite(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLite(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Always start a fresh load at the top, including browser pageshow/BFCache restores.
  useIsoLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      });
    };

    resetToTop();
    window.addEventListener("pageshow", resetToTop);
    return () => window.removeEventListener("pageshow", resetToTop);
  }, []);

  // Loader bar animation.
  useEffect(() => {
    const bar = loaderBarRef.current;
    if (!bar) return;

    const tween = gsap.fromTo(
      bar,
      { xPercent: -110 },
      {
        xPercent: 210,
        duration: 1.1,
        ease: "power1.inOut",
        repeat: -1,
      }
    );

    return () => {
      tween.kill();
    };
  }, []);

  // Lock scrolling while loading so nobody scrolls into a half-built timeline.
  useEffect(() => {
    const html = document.documentElement;
    if (!assetsReady) {
      html.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      });
    }
    return () => {
      html.style.overflow = "";
    };
  }, [assetsReady]);

  // Wait for fonts and every hero image to load and decode before starting.
  useEffect(() => {
    let cancelled = false;

    const waitForImage = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          if (typeof img.decode === "function") {
            img.decode().catch(() => undefined).finally(resolve);
          } else {
            resolve();
          }
        };

        if (img.complete) {
          if (img.naturalWidth > 0) {
            finish();
          } else {
            resolve();
          }
          return;
        }

        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });

    const minLoaderTime = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 700);
    });

    const fontsReady =
      "fonts" in document
        ? document.fonts.ready.then(() => undefined).catch(() => undefined)
        : Promise.resolve();

    const imagesReady = new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const images = Array.from(
          document.querySelectorAll<HTMLImageElement>("#hero img")
        );

        Promise.all(images.map(waitForImage)).then(() => resolve());
      });
    });

    Promise.all([fontsReady, imagesReady, minLoaderTime]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Remove the loader from the DOM once it has faded out.
  useEffect(() => {
    if (!assetsReady) return;
    const id = window.setTimeout(() => setLoaderGone(true), 600);
    return () => window.clearTimeout(id);
  }, [assetsReady]);

  useIsoLayoutEffect(() => {
    if (!assetsReady || isLite === null) return;

    const lite = isLite;
    const root = rootRef.current;
    if (!root) return;

    // Keep Lenis references in the effect scope so cleanup can access them.
    let lenis: Lenis | null = null;
    let lenisTicker: ((time: number) => void) | null = null;

    const ctx = gsap.context(() => {
      const pages = gsap.utils.toArray<HTMLElement>(".exodus-page", root);
      const pageInners = gsap.utils.toArray<HTMLElement>(".exodus-page-inner", root);
      const copies = gsap.utils.toArray<HTMLElement>(".exodus-copy", root);
      const coverContent = root.querySelector<HTMLElement>(".exodus-cover-content");
      const hint = root.querySelector<HTMLElement>(".exodus-scroll-hint");
      const cueDot = root.querySelector<HTMLElement>(".exodus-cue-dot");
      const chart = root.querySelector<HTMLElement>(".exodus-chart");
      const pole = root.querySelector<HTMLElement>(".exodus-pole");
      const starsFar = root.querySelector<HTMLElement>(".exodus-stars-far");
      const starsNear = root.querySelector<HTMLElement>(".exodus-stars-near");
      const cnStars = gsap.utils.toArray<SVGElement>(".cn-star", root);
      const cnHalos = gsap.utils.toArray<SVGElement>(".cn-halo", root);
      const cnLines = gsap.utils.toArray<SVGElement>(".cn-line", root);
      const cnFlare = root.querySelector<SVGElement>(".cn-flare");

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const full = !reducedMotion;
      const lastStory = stories.length - 1;

      // Smooth wheel input on desktop; touch devices keep their native momentum.
      if (!lite && full) {
        lenis = new Lenis({
          duration: 1.35,
          easing: (t: number) => 1 - Math.pow(1 - t, 4),
          smoothWheel: true,
          wheelMultiplier: 0.55,
          touchMultiplier: 1,
          syncTouch: false,
        });
        lenis.on("scroll", ScrollTrigger.update);
        lenisTicker = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(lenisTicker);
      }

      const copyParts = copies.map((copy) => ({
        words: Array.from(copy.querySelectorAll<HTMLElement>(".tx-word")),
        body: copy.querySelector<HTMLElement>(".tx-body"),
      }));

      // Initial states.
      gsap.set(pages, { autoAlpha: 0 });
      gsap.set(copies, { autoAlpha: 0 });
      if (chart) gsap.set(chart, { autoAlpha: 0 });
      if (pole) gsap.set(pole, { autoAlpha: 0, scale: 0.4 });
      if (cnFlare) gsap.set(cnFlare, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" });
      gsap.set(cnStars, { opacity: 0.35, transformOrigin: "50% 50%" });
      gsap.set(cnHalos, { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });
      gsap.set(cnLines, { strokeDashoffset: 1 });
      copyParts.forEach(({ words, body }) => {
        if (body) gsap.set(body, { autoAlpha: 0 });
        gsap.set(words, { yPercent: full ? 115 : 0 });
      });

      // Idle cue on the cover: a small light travelling down a thread.
      if (full && cueDot) {
        gsap.fromTo(
          cueDot,
          { y: -12 },
          { y: 48, duration: 1.6, ease: "power1.inOut", repeat: -1 }
        );
      }

      const chapterAt = (i: number) => STORY_START + i * CHAPTER;
      const END_TIME = chapterAt(lastStory) + 0.5 + TAIL_HOLD;
      const TOTAL = END_TIME + 0.01;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "TECHXETRA-EXODUS",
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: lite ? 0.85 : 1.15,
          // Chapter snapping keeps fast scrolls from skipping slides. 0 lets you return to the cover.
          snap: {
            snapTo: [0, ...stories.map((_, i) => (chapterAt(i) + CHAPTER * 0.5) / TOTAL)],
            delay: lite ? 0.18 : 0.12,
            duration: lite ? { min: 0.25, max: 0.5 } : { min: 0.3, max: 0.7 },
            ease: "power2.out",
            directional: true,
          },
          invalidateOnRefresh: true,
        },
      });

      /* ---- Cover: we fly through it and leave the known behind ---- */
      tl.to({}, { duration: INTRO_HOLD });
      if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.1 }, 0);

      if (coverContent) {
        tl.to(
          coverContent,
          {
            autoAlpha: 0,
            ...(full ? { scale: 1.14 } : {}),
            duration: COVER_OUT,
            ease: "power1.in",
          },
          INTRO_HOLD
        );
      }

      // The sky behind it drifts at two speeds (desktop only).
      if (!lite && full) {
        if (starsFar) tl.to(starsFar, { y: () => -window.innerHeight * 0.05, duration: TOTAL }, 0);
        if (starsNear) tl.to(starsNear, { y: () => -window.innerHeight * 0.11, duration: TOTAL }, 0);
      }

      // The constellation chart arrives as the world appears.
      if (chart) tl.to(chart, { autoAlpha: 1, duration: 0.25 }, INTRO_HOLD + 0.3);

      // First artwork.
      const firstPageAt = INTRO_HOLD + 0.2;
      tl.to(pages[0], { autoAlpha: 1, duration: 0.4 }, firstPageAt);

      // Slow camera drift per artwork (desktop only: scaling full-screen images is costly on phones/tablets).
      if (!lite && full) {
        PAGES.forEach((_, p) => {
          const idxs = stories.map((s, i) => (s.page === p ? i : -1)).filter((i) => i >= 0);
          if (!idxs.length || !pageInners[p]) return;
          const start = p === 0 ? firstPageAt : chapterAt(idxs[0]);
          const end =
            chapterAt(idxs[idxs.length - 1]) +
            CHAPTER +
            (p === PAGES.length - 1 ? TAIL_HOLD : 0.3);
          tl.fromTo(
            pageInners[p],
            { scale: 1.04 },
            { scale: 1.15, duration: end - start, ease: "none" },
            start
          );
        });
      }

      /* ---- Chapters ---- */
      stories.forEach((story, i) => {
        const at = chapterAt(i);
        const prev = stories[i - 1];
        const parts = copyParts[i];

        if (prev) {
          tl.to(copies[i - 1], { autoAlpha: 0, duration: 0.12 }, at);
          if (prev.page !== story.page) {
            tl.to(pages[prev.page], { autoAlpha: 0, duration: 0.3 }, at);
            tl.fromTo(pages[story.page], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at);
          }
        }

        const enterAt = at + 0.08;
        tl.fromTo(copies[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, enterAt);

        if (parts.words.length) {
          if (full) {
            tl.fromTo(
              parts.words,
              { yPercent: 115 },
              { yPercent: 0, duration: 0.32, stagger: 0.05, ease: "power3.out" },
              enterAt
            );
          }
        }

        if (parts.body) {
          tl.fromTo(
            parts.body,
            { autoAlpha: 0, ...(full ? { y: 14 } : {}) },
            { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" },
            enterAt + 0.14
          );
        }

        /* The constellation: each chapter lights the next star and draws the line to it. */
        const isLast = i === lastStory;
        if (i > 0 && cnLines[i - 1]) {
          tl.to(cnLines[i - 1], { strokeDashoffset: 0, duration: 0.34, ease: "power1.inOut" }, at - 0.02);
        }
        if (cnStars[i]) {
          tl.to(cnStars[i], { opacity: 1, scale: isLast ? 2.3 : 1.7, duration: 0.2 }, at + 0.1);
        }
        if (cnHalos[i]) {
          tl.fromTo(
            cnHalos[i],
            { autoAlpha: 0, scale: 0.5 },
            { autoAlpha: 0.6, scale: 1, duration: 0.22 },
            at + 0.1
          );
          if (!isLast) tl.to(cnHalos[i], { autoAlpha: 0, duration: 0.15 }, chapterAt(i + 1));
        }
      });

      /* ---- Finale: the bowl closes and the North Star opens up behind the title ---- */
      const finale = chapterAt(lastStory);
      if (cnLines[LINKS.length - 1]) {
        tl.to(cnLines[LINKS.length - 1], { strokeDashoffset: 0, duration: 0.3, ease: "power1.inOut" }, finale + 0.2);
      }
      if (cnFlare) tl.to(cnFlare, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out" }, finale + 0.2);
      if (pole) tl.to(pole, { autoAlpha: 1, scale: 1, duration: 0.55, ease: "power2.out" }, finale);

      // Hold on the final chapter before the section unpins.
      tl.to({}, { duration: 0.01 }, END_TIME);

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => {
      ctx.revert();
      if (lenisTicker) gsap.ticker.remove(lenisTicker);
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      }
    };
  }, [assetsReady, isLite]);

  const lite = isLite === true;

  return (
    <>
      {!loaderGone && (
        <div
          aria-live="polite"
          aria-label={assetsReady ? "TechXetra ready" : "Loading TechXetra"}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-500 ${
            assetsReady
              ? "pointer-events-none opacity-0"
              : "pointer-events-auto opacity-100"
          }`}
        >
          <div className="mb-8 h-px w-28 overflow-hidden bg-white/15">
            <div
              ref={loaderBarRef}
              className="h-full w-1/2 bg-[#e8d6a5]"
            />
          </div>

          <p className={`${FONT.display} text-xl tracking-[0.24em] text-[#f3ead4] sm:text-2xl`}>
            TECHXETRA
          </p>

          <p className={`${FONT.accent} mt-3 text-[9px] uppercase tracking-[0.22em] text-white/50`}>
            {assetsReady ? "The journey begins" : "Preparing the journey"}
          </p>
        </div>
      )}

      <section
        ref={rootRef}
        id="hero"
        style={colorVariables}
        className={`relative ${lite ? "h-[680svh]" : "h-[540svh]"} text-[#e6ecff]`}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* Sky: two static star fields (one paint each) plus a few slow twinkles. */}
          {/* <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
            <div
              className="exodus-stars-far absolute left-0 top-0 h-px w-px"
              style={{ boxShadow: STARS_FAR, willChange: lite ? undefined : "transform" }}
            />
            <div
              className="exodus-stars-near absolute left-0 top-0 h-px w-px"
              style={{ boxShadow: STARS_NEAR, willChange: lite ? undefined : "transform" }}
            />
            {TWINKLES.map((t, i) => (
              <span
                key={i}
                className="absolute h-[3px] w-[3px] rounded-full bg-[#f2d58a] motion-safe:animate-pulse"
                style={{
                  left: t.left,
                  top: t.top,
                  animationDelay: t.delay,
                  animationDuration: t.dur,
                }}
              />
            ))}
          </div> */}

          {/* Story artwork. */}
          <div className="absolute inset-0 z-10">
            {PAGES.map((src, index) => (
              <div
                key={src}
                className="exodus-page absolute inset-0 overflow-hidden"
                style={{ willChange: "opacity" }}
              >
                <div
                  className="exodus-page-inner absolute inset-0"
                  style={lite ? undefined : { willChange: "transform" }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="100vw"
                    quality={lite ? 65 : 75}
                    draggable={false}
                    priority={index === 0}
                    loading="eager"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-[#03040a]/25" />
              </div>
            ))}
          </div>

          {/* North Star glow for the finale. Centered by flex so GSAP can own the transform. */}
          <div className="pointer-events-none absolute inset-0 z-[14] flex items-center justify-center" aria-hidden="true">
            <div className="exodus-pole relative h-[90vmin] w-[90vmin] bg-[radial-gradient(circle,rgba(242,213,138,0.26)_0%,rgba(242,213,138,0.08)_30%,transparent_62%)]">
              <span className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-[#f2d58a]/55 to-transparent" />
              <span className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#f2d58a]/55 to-transparent" />
            </div>
          </div>

          {/* Cover: the original hero. HeroTitle itself is untouched. */}
          <div className="exodus-cover absolute inset-0 z-20">
            <div className="exodus-cover-content flex h-full flex-col items-center justify-between px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 sm:px-10 sm:pt-28 lg:px-16">
              <div className={`${FONT.body} flex w-full max-w-[1200px] items-start justify-between gap-6 text-xs text-[#e6ecff]/60 sm:text-sm`}>
                <span className="max-w-[60%]">{heroData.uni}</span>
                <span>{heroData.year}</span>
              </div>

              <div className="w-full max-w-[1200px]">
                <HeroTitle />
                <p className={`${FONT.display} mt-5 text-center text-[clamp(1.1rem,2.6vw,2rem)] font-light tracking-[0.04em] text-[#f4f6ff]`}>
                  {COPY.cover}
                </p>
                <p className={`${FONT.body} mx-auto mt-3 max-w-md text-center text-sm leading-6 text-[#e6ecff]/65 sm:text-base`}>
                  {COPY.tagline}
                </p>
              </div>

              <div className="exodus-scroll-hint flex flex-col items-center gap-3">
                <span className="relative block h-12 w-px overflow-hidden bg-white/15">
                  <span className="exodus-cue-dot absolute left-0 top-0 block h-3 w-px bg-[#f2d58a]" />
                </span>
                <span className={`${FONT.body} text-xs text-[#e6ecff]/55`}>Scroll</span>
              </div>
            </div>
          </div>

          {/* Story copy. */}
          <div className="pointer-events-none absolute inset-0 z-30">
            {stories.map((story) => {
              const isFinal = story.position === "center";
              const align =
                story.position === "right"
                  ? "ml-auto"
                  : story.position === "center"
                    ? "mx-auto"
                    : "";
              return (
                <article
                  key={story.title}
                  className={`exodus-copy absolute inset-0 flex px-6 pb-[16svh] sm:px-12 md:px-20 lg:px-28 ${positionClasses[story.position]}`}
                >
                  {isFinal && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-[13%] top-[10%] z-20 w-6 text-[#171717] opacity-90 sm:right-[14%] sm:top-[11%] sm:w-8 md:w-9"
                    >
                      <svg
                        viewBox="0 0 40 40"
                        className="h-auto w-full overflow-visible"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 1.5L22.1 16.2L38.5 20L22.1 23.8L20 38.5L17.9 23.8L1.5 20L17.9 16.2L20 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1.15"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M20 8.5L21.2 18.8L31.5 20L21.2 21.2L20 31.5L18.8 21.2L8.5 20L18.8 18.8L20 8.5Z"
                          stroke="currentColor"
                          strokeWidth="0.8"
                          strokeLinejoin="round"
                        />
                        <circle cx="20" cy="20" r="1.25" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                  <div className={`absolute inset-0 ${scrimClasses[story.position]}`} />

                  <div className="relative w-full max-w-3xl">
                    <h2
                      className={`${isFinal ? `${FONT.accent} text-[clamp(2.75rem,12vw,9rem)] leading-none tracking-[0.1em]` : `${FONT.display} text-[clamp(2.25rem,6.2vw,5.75rem)] font-light leading-[1.04] tracking-[-0.03em]`} text-[#f7f8ff] [text-shadow:0_2px_4px_rgba(0,0,0,0.7)] lg:[text-shadow:0_3px_18px_rgba(0,0,0,0.85)]`}
                    >
                      {story.title.split(" ").map((word, i, arr) => (
                        <span
                          key={`${word}-${i}`}
                          className={`-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom ${
                            i < arr.length - 1 ? "mr-[0.24em]" : ""
                          }`}
                        >
                          <span className="tx-word inline-block">{word}</span>
                        </span>
                      ))}
                    </h2>

                    <p
                      className={`tx-body ${FONT.body} mt-5 max-w-[32rem] text-base leading-7 text-[#dfe6ff]/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)] sm:mt-7 md:text-lg md:leading-8 lg:[text-shadow:0_2px_12px_rgba(0,0,0,0.9)] ${align}`}
                    >
                      {story.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Progress is the constellation itself: it completes as you read. */}
          <div className="exodus-chart pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 w-[6.5rem] opacity-0 sm:bottom-8 sm:right-10 sm:w-36 lg:w-48">
            <ConstellationMark />
          </div>
        </div>
      </section>
    </>
  );
}