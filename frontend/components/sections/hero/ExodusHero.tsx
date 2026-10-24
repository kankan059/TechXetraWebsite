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
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import SilverFlight from "@/components/animations/SilverFlight";

gsap.registerPlugin(ScrollTrigger);
// Stops mobile address-bar show/hide from triggering expensive refreshes mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true });

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Phones, tablets and any touch-first device get the lightweight rendering path. */
const LITE_QUERY = "(max-width: 1023px), (pointer: coarse)";

/**
 * Change these font classes once to update typography across this section.
 * Keep the actual font-family names configured in your global CSS/Tailwind.
 */
const FONT = {
  display: "font-roboto",
  mono: "font-pixel",
  body: "font-cta",
} as const;

const COPY = {
  tagline: "Leave the known. Chase the North Star.",
  kicker: "EXODUS / THE NEXT CHAPTER",
} as const;

/** Unique artwork. Stories reference these by index, so each image is decoded and composited only once. */
const PAGES = [
  "/assets/exodus/world.webp",
  "/assets/exodus/departure.webp",
  "/assets/exodus/ascent.webp",
  "/assets/exodus/arrival.webp",
] as const;

const stories = [
  {
    page: 0,
    eyebrow: "THE WORLD WE KNOW",
    title: "Every world has its limits.",
    body: "Every great journey begins when the familiar is no longer enough.",
    position: "left",
  },
  {
    page: 0,
    eyebrow: "THE MEMORY OF REBIRTH",
    title: "A new beginning was only the start.",
    body: "In 2024, TechXetra was reborn. Not an ending — the beginning of becoming more.",
    position: "top",
  },
  {
    page: 1,
    eyebrow: "THE DEPARTURE",
    title: "Leave what you know.",
    body: "Growth asks us to step beyond what we understand and move towards what we have yet to discover.",
    position: "right",
  },
  {
    page: 1,
    eyebrow: "INTO THE UNKNOWN",
    title: "The path is unwritten.",
    body: "Uncertainty is not the end. It is where new ideas, courage and possibility begin.",
    position: "left",
  },
  {
    page: 2,
    eyebrow: "FIND YOUR NORTH",
    title: "Chase the North Star.",
    body: "Look beyond today's boundaries. Follow the ideas that lead us towards something greater.",
    position: "top",
  },
  {
    page: 2,
    eyebrow: "THE NEXT EVOLUTION",
    title: "Become more than before.",
    body: "Technology moves us forward. Imagination takes us beyond. Together, we shape what comes next.",
    position: "right",
  },
  {
    page: 3,
    eyebrow: "THE JOURNEY CONTINUES",
    title: "EXODUS",
    body: "TECHXETRA — Leave the known. Chase the North Star.",
    position: "center",
  },
] as const;

type StoryPosition = (typeof stories)[number]["position"];

const positionClasses: Record<StoryPosition, string> = {
  left: "items-center justify-start text-left",
  top: "items-start justify-start pt-[17svh] text-left",
  right: "items-center justify-end text-right",
  center: "items-center justify-center text-center",
};

/** Directional scrims keep text legible without darkening the whole artwork. */
const scrimClasses: Record<StoryPosition, string> = {
  left: "bg-[linear-gradient(90deg,rgba(3,3,3,0.78)_0%,rgba(3,3,3,0.42)_42%,transparent_78%)]",
  right: "bg-[linear-gradient(270deg,rgba(3,3,3,0.78)_0%,rgba(3,3,3,0.42)_42%,transparent_78%)]",
  top: "bg-[linear-gradient(180deg,rgba(3,3,3,0.78)_0%,rgba(3,3,3,0.38)_38%,transparent_72%)]",
  center: "bg-[radial-gradient(ellipse_at_center,rgba(3,3,3,0.7)_0%,rgba(3,3,3,0.3)_48%,transparent_80%)]",
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/* ---- Timeline constants (in timeline units, scrubbed across the full scroll distance) ---- */
const INTRO_HOLD = 0.12;
const ZOOM = INTRO_HOLD; // label position for "bookZoom"
const STORY_START = 1.06; // first page appears exactly when the cover has swung out of view
const CHAPTER = 0.7;
const TAIL_HOLD = 0.45;

/** Lite mode: the cover shrinks with a cheap transform scale instead of animating width/height (which forces layout every frame). */
const LITE_BOOK_SCALE = 0.9;

const pad = (n: number) => String(n).padStart(2, "0");

export default function Hero() {
  const [assetsReady, setAssetsReady] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  // null = not detected yet (SSR / first paint). true = phone / tablet / touch. false = desktop.
  const [isLite, setIsLite] = useState<boolean | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const loaderBarRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const railCountRef = useRef<HTMLSpanElement>(null);

  const colorVariables = {
    "--tx-blue": TECHXETRA_COLORS.blue,
    "--tx-red": TECHXETRA_COLORS.red,
    "--tx-green": TECHXETRA_COLORS.green,
    "--tx-cream": TECHXETRA_COLORS.cream,
    "--tx-black": "#060606",
  } as CSSProperties;

  // Detect phone / tablet / touch devices once, and keep it in sync if the viewport crosses the breakpoint.
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

      // Refresh measurements after the browser has applied the new layout.
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      });
    };

    resetToTop();
    window.addEventListener("pageshow", resetToTop);

    return () => {
      window.removeEventListener("pageshow", resetToTop);
    };
  }, []);

  // Loader bar animation (GSAP, so no styled-jsx keyframes needed).
  useEffect(() => {
    const bar = loaderBarRef.current;
    if (!bar) return;
    const tween = gsap.fromTo(
      bar,
      { xPercent: -110 },
      { xPercent: 210, duration: 1.1, ease: "power1.inOut", repeat: -1 }
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
      // The loader can change layout timing; begin the GSAP story from its first frame.
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

  // Wait for fonts + every story image (decoded) before starting. Never hangs: 6s safety net.
  useEffect(() => {
    let cancelled = false;

    const waitForImage = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          if (typeof img.decode === "function") {
            img.decode().catch(() => undefined).finally(() => resolve());
          } else {
            resolve();
          }
        };

        if (img.complete && img.naturalWidth > 0) {
          finish();
          return;
        }

        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });

    const minLoaderTime = new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    const safety = new Promise<void>((resolve) => window.setTimeout(resolve, 6000));
    const fontsReady =
      "fonts" in document ? document.fonts.ready.then(() => undefined).catch(() => undefined) : Promise.resolve();

    const imagesReady = new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>("#hero img"));
        Promise.all(images.map(waitForImage)).then(() => resolve());
      });
    });

    Promise.race([Promise.all([fontsReady, imagesReady, minLoaderTime]), safety]).then(() => {
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
    const cover = coverRef.current;
    const spread = spreadRef.current;
    if (!root || !cover || !spread) return;

    const ctx = gsap.context(() => {
      const pages = gsap.utils.toArray<HTMLElement>(".exodus-page", root);
      const pageInners = gsap.utils.toArray<HTMLElement>(".exodus-page-inner", root);
      const copies = gsap.utils.toArray<HTMLElement>(".exodus-copy", root);
      const chrome = gsap.utils.toArray<HTMLElement>(".exodus-chrome", root);
      const coverContent = cover.querySelector<HTMLElement>(".exodus-cover-content");
      const hint = cover.querySelector<HTMLElement>(".exodus-scroll-hint");
      const bookDetails = cover.querySelector<HTMLElement>(".exodus-book-details");
      const railFill = railFillRef.current;
      const railCount = railCountRef.current;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.set(pages, { autoAlpha: 0 });
      gsap.set(copies, { autoAlpha: 0 });
      gsap.set(spread, { autoAlpha: 0 });
      gsap.set(chrome, { autoAlpha: 0 });
      if (railFill) gsap.set(railFill, { scaleY: 0, transformOrigin: "top center" });

      /* ------------------------------------------------------------------ */
      /* Reduced motion: no zoom / rotate / drifting — just clean crossfades. */
      /* ------------------------------------------------------------------ */
      if (reducedMotion) {
        const rm = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        rm.to({}, { duration: 0.3 });
        rm.to(cover, { autoAlpha: 0, duration: 0.2 });
        rm.to([spread, ...chrome], { autoAlpha: 1, duration: 0.2 }, "<");
        rm.to(pages[0], { autoAlpha: 1, duration: 0.2 }, "<");

        const len = 0.8;
        stories.forEach((story, i) => {
          const at = 0.7 + i * len;
          const prev = stories[i - 1];
          if (prev) {
            rm.to(copies[i - 1], { autoAlpha: 0, duration: 0.2 }, at);
            if (prev.page !== story.page) {
              rm.to(pages[prev.page], { autoAlpha: 0, duration: 0.3 }, at);
              rm.to(pages[story.page], { autoAlpha: 1, duration: 0.3 }, at);
            }
          }
          rm.fromTo(copies[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, at + 0.1);
          gsap.set(copies[i].querySelectorAll(".tx-eyebrow, .tx-body"), { autoAlpha: 1 });
        });
        rm.to({}, { duration: 0.4 });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* Full motion                                                         */
      /* ------------------------------------------------------------------ */
      const copyParts = copies.map((copy) => ({
        eyebrow: copy.querySelector<HTMLElement>(".tx-eyebrow"),
        words: Array.from(copy.querySelectorAll<HTMLElement>(".tx-word")),
        body: copy.querySelector<HTMLElement>(".tx-body"),
      }));

      copyParts.forEach(({ eyebrow, words, body }) => {
        if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0 });
        if (body) gsap.set(body, { autoAlpha: 0 });
        gsap.set(words, { yPercent: 115 });
      });

      // 3D perspective lives on the cover itself, so the page-turn actually has depth.
      gsap.set(cover, {
        transformOrigin: "left center",
        transformPerspective: 1600,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        backgroundColor: "transparent",
        backgroundImage: "none",
        force3D: true,
      });

      const chapterAt = (i: number) => STORY_START + i * CHAPTER;
      const END_TIME = chapterAt(stories.length - 1) + 0.5 + TAIL_HOLD;

      // Cheap HUD updates: runs on timeline update, touches the DOM only when something changed.
      const setFill = railFill ? gsap.quickSetter(railFill, "scaleY") : null;
      let lastIdx = -2;
      let lastFill = -1;
      const updateHud = (t: number) => {
        const span = CHAPTER * (stories.length - 1);
        const fill = gsap.utils.clamp(0, 1, (t - STORY_START) / span);
        if (Math.abs(fill - lastFill) > 0.002) {
          lastFill = fill;
          setFill?.(fill);
        }
        const idx =
          t < STORY_START - 0.1
            ? -1
            : Math.min(stories.length - 1, Math.floor((t - STORY_START + 0.1) / CHAPTER));
        if (idx !== lastIdx) {
          lastIdx = idx;
          if (railCount) railCount.textContent = `${pad(Math.max(idx, 0) + 1)} / ${pad(stories.length)}`;
        }
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: () => updateHud(tl.time()),
        scrollTrigger: {
          id: "TECHXETRA-EXODUS-BOOK",
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          // Touch scrolling already has native momentum; extra smoothing only adds lag + extra frames on phones.
          scrub: lite ? true : 0.5,
          invalidateOnRefresh: true,
        },
      });

      // Short intro hold, with the "scroll" hint fading as soon as the user starts.
      tl.to({}, { duration: INTRO_HOLD });
      if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.1 }, 0);

      tl.addLabel("bookZoom", ZOOM);

      // Cover shrinks into a book.
      if (lite) {
        // Transform-only (GPU) shrink: no layout, no re-wrapping of the cover text on every frame.
        tl.to(
          cover,
          {
            scale: LITE_BOOK_SCALE,
            x: () => (root.clientWidth * (1 - LITE_BOOK_SCALE)) / 2,
            duration: 0.58,
          },
          "bookZoom"
        );
      } else {
        // Desktop: true resize of the cover.
        tl.to(
          cover,
          {
            left: "50%",
            top: "50%",
            xPercent: -50,
            yPercent: -50,
            width: () => Math.min(window.innerWidth * 0.86, 1040),
            height: () => Math.min(window.innerHeight * 0.7, 660),
            rotateX: 1.5,
            rotateY: -5,
            duration: 0.58,
          },
          "bookZoom"
        );

        if (coverContent) {
          tl.to(coverContent, { scale: 0.98, duration: 0.58 }, "bookZoom");
        }
      }

      // Transparent hero at first; the shrinking cover turns black during the transition.
      tl.to(cover, { backgroundColor: "#050505", duration: 0.42 }, "bookZoom+=0.12");
      if (bookDetails) tl.to(bookDetails, { autoAlpha: 1, duration: 0.25 }, "bookZoom+=0.32");

      // The persistent header / footer / progress rail arrive with the book.
      tl.to(chrome, { autoAlpha: 1, duration: 0.2 }, "bookZoom+=0.42");
      tl.to(spread, { autoAlpha: 1, duration: 0.1 }, "bookZoom+=0.42");

      // Cover swings open and leaves the frame completely before any story art shows.
      tl.to(cover, { rotateY: -158, duration: 0.48, ease: "power1.inOut" }, "bookZoom+=0.46");

      // First page artwork.
      tl.to(pages[0], { autoAlpha: 1, duration: 0.18 }, STORY_START);

      // Slow, scroll-linked camera drift per artwork (desktop only: scaling full-screen images is costly on phones/tablets).
      if (!lite) {
        PAGES.forEach((_, p) => {
          const idxs = stories.map((s, i) => (s.page === p ? i : -1)).filter((i) => i >= 0);
          if (!idxs.length || !pageInners[p]) return;
          const start = chapterAt(idxs[0]);
          const end = chapterAt(idxs[idxs.length - 1]) + CHAPTER + (p === PAGES.length - 1 ? TAIL_HOLD : 0.3);
          tl.fromTo(
            pageInners[p],
            { scale: 1.04 },
            { scale: 1.15, duration: end - start, ease: "none" },
            start
          );
        });
      }

      // Chapters.
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

        const entrance =
          story.position === "top"
            ? { x: 0, y: -18 }
            : story.position === "right"
              ? { x: 22, y: 0 }
              : story.position === "center"
                ? { x: 0, y: 12 }
                : { x: -22, y: 0 };

        const enterAt = at + 0.08;

        tl.fromTo(copies[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, enterAt);

        if (parts.eyebrow) {
          tl.fromTo(
            parts.eyebrow,
            { autoAlpha: 0, ...entrance },
            { autoAlpha: 1, x: 0, y: 0, duration: 0.22, ease: "power2.out" },
            enterAt
          );
        }

        if (parts.words.length) {
          tl.fromTo(
            parts.words,
            { yPercent: 115 },
            { yPercent: 0, duration: 0.3, stagger: 0.05, ease: "power3.out" },
            enterAt + 0.04
          );
        }

        if (parts.body) {
          tl.fromTo(
            parts.body,
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" },
            enterAt + 0.16
          );
        }
      });

      // Make sure the timeline holds on the final chapter before the section unpins.
      tl.to({}, { duration: 0.01 }, END_TIME);

      updateHud(0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => ctx.revert();
  }, [assetsReady, isLite]);

  const lite = isLite === true;

  return (
    <>
      {!loaderGone && (
        <div
          aria-live="polite"
          aria-label={assetsReady ? "TechXetra ready" : "Loading TechXetra"}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-500 ${
            assetsReady ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="mb-8 h-px w-28 overflow-hidden bg-white/15">
            <div ref={loaderBarRef} className="h-full w-1/2 bg-[#e8d6a5]" />
          </div>
          <p className={`${FONT.display} text-xl tracking-[0.24em] text-[#f3ead4] sm:text-2xl`}>
            TECHXETRA
          </p>
          <p className={`${FONT.mono} mt-3 text-[9px] uppercase tracking-[0.22em] text-white/50`}>
            {assetsReady ? "The journey begins" : "Preparing the journey"}
          </p>
        </div>
      )}

      <section
        ref={rootRef}
        id="hero"
        style={colorVariables}
        className="relative h-[420svh] text-[#f3ead4]"
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden bg-transparent">
          {/* Heavy background animation is desktop-only; phones/tablets skip it entirely. */}
          {isLite === false && (
            <div className="pointer-events-none absolute inset-0 z-[1]">
              <SilverFlight />
            </div>
          )}

          {/* The original hero becomes the book cover. HeroTitle itself is untouched. */}
          <div
            ref={coverRef}
            className="exodus-cover absolute inset-0 z-20 border border-white/[0.08]"
            style={{
              backgroundColor: "transparent",
              backgroundImage: "none",
              boxShadow: lite
                ? "0 10px 28px rgba(0,0,0,0.5)"
                : "0 24px 70px rgba(0,0,0,0.55)",
              willChange: "transform",
            }}
          >
            {/* Physical-cover details live OUTSIDE the clip so the page edges are actually visible. */}
            <div className="exodus-book-details pointer-events-none absolute inset-0 z-10 opacity-0">
              <div className="absolute inset-[10px] rounded-[2px] border border-[#c8b58a]/50 sm:inset-[14px]" />
              <div className="absolute inset-[16px] rounded-[1px] border border-white/10 sm:inset-[22px]" />
              <div className="absolute bottom-0 left-0 top-0 w-[12px] bg-gradient-to-r from-black/80 via-[#9b835c]/25 to-transparent sm:w-[18px]" />
              <div className="absolute bottom-0 left-[12px] top-0 w-px bg-[#e8d4a7]/45 sm:left-[18px]" />
              <div className="absolute bottom-0 right-[-8px] top-[8px] w-[8px] bg-[#cfc4ad] shadow-[3px_0_5px_rgba(0,0,0,0.4)] sm:right-[-11px] sm:w-[11px]" />
              <div className="absolute bottom-0 right-[-8px] top-[12px] w-[5px] bg-[repeating-linear-gradient(to_bottom,#8d826d_0px,#8d826d_1px,#e7decb_1px,#e7decb_3px)] sm:right-[-11px] sm:w-[7px]" />
              {/* Gilded corner marks */}
              <span className="absolute left-[22px] top-[22px] hidden h-4 w-4 border-l border-t border-[#e8d4a7]/70 sm:block" />
              <span className="absolute right-[22px] top-[22px] hidden h-4 w-4 border-r border-t border-[#e8d4a7]/70 sm:block" />
              <span className="absolute bottom-[22px] left-[30px] hidden h-4 w-4 border-b border-l border-[#e8d4a7]/70 sm:block" />
              <span className="absolute bottom-[22px] right-[22px] hidden h-4 w-4 border-b border-r border-[#e8d4a7]/70 sm:block" />
            </div>

            <div className="absolute inset-0 overflow-hidden">
              <div className="exodus-cover-content relative z-20 flex h-full flex-col px-5 pb-6 pt-20 sm:px-8 sm:pt-24 md:px-12 lg:px-16 lg:pb-9 xl:px-20">
                <div className="h-px w-full bg-[#f3ead4]/25" />

                <header className="flex items-start justify-between gap-3 pt-3 sm:gap-4">
                  <span className={`${FONT.mono} text-[8px] uppercase tracking-[0.15em] text-[#f3ead4]/75 sm:text-[10px]`}>
                    TECHXETRA / {heroData.year}
                  </span>
                  <span className={`${FONT.mono} max-w-[55%] text-right text-[7px] uppercase tracking-[0.1em] text-[#f3ead4]/65 sm:text-[10px]`}>
                    {heroData.uni}
                  </span>
                </header>

                <div className="flex flex-1 flex-col items-center justify-center py-8 sm:py-10">
                  <div className="w-full max-w-[1200px]">
                    <HeroTitle />
                    <p className={`${FONT.mono} mt-4 text-center text-[clamp(1rem,2.5vw,2rem)] uppercase tracking-[0.12em] text-[#f3ead4]`}>
                      A NEW DIMENSION
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <span className="h-px w-8 bg-[#f3ead4]/35 sm:w-14" />
                    <p className={`${FONT.mono} max-w-[520px] text-center text-[9px] uppercase leading-6 tracking-[0.16em] text-[#f3ead4]/80 sm:text-[11px]`}>
                      {COPY.tagline}
                    </p>
                    <span className="h-px w-8 bg-[#f3ead4]/35 sm:w-14" />
                  </div>
                </div>

                <footer className="flex items-center justify-between gap-4 border-t border-[#f3ead4]/20 pt-4">
                  <span className={`${FONT.mono} text-[8px] uppercase tracking-[0.1em] text-[#f3ead4]/65 sm:text-[10px]`}>
                    Tezpur University · Assam, India
                  </span>
                  <span className={`exodus-scroll-hint ${FONT.mono} animate-pulse text-[8px] uppercase tracking-[0.18em] text-[#f3ead4]/70`}>
                    Scroll to begin ↓
                  </span>
                </footer>
              </div>
            </div>
          </div>

          {/* Open-book spread: thin warm paper edge + restrained centre seam. */}
          <div
            ref={spreadRef}
            className="exodus-spread absolute inset-y-0 left-0 right-0 z-10 overflow-hidden rounded-none border-0 bg-[#050505] shadow-none sm:inset-y-[6%] sm:left-[5%] sm:right-[5%] sm:rounded-[3px] sm:border sm:border-[#c9bda5]/60 lg:inset-y-[10%] lg:left-[10%] lg:right-[10%]"
            style={{
              boxShadow: lite
                ? "0 0 0 2px rgba(75,61,42,0.5)"
                : "0 24px 70px rgba(0,0,0,0.65), inset 0 0 0 5px rgba(255,255,255,0.06), 0 0 0 2px rgba(75,61,42,0.5)",
              contain: "layout paint",
            }}
          >
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
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 92vw, 82vw"
                    quality={lite ? 65 : 75}
                    draggable={false}
                    priority={index === 0}
                    loading="eager"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/25" />
              </div>
            ))}

            {/* Static finishing layers: vignette, film grain, centre seam, paper edge. */}
            <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
            {/* Film grain (SVG turbulence) is very expensive to composite on mobile GPUs, so desktop only. */}
            {isLite === false && (
              <div
                className="pointer-events-none absolute inset-0 z-[6] opacity-[0.06]"
                style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
              />
            )}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-10 -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/35 to-black/0 sm:block" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-px -translate-x-1/2 bg-[#e8d4a7]/15 sm:block" />
            <div className="pointer-events-none absolute inset-0 z-20 border-0 shadow-none sm:inset-5 sm:border sm:border-white/20 sm:shadow-[inset_0_0_18px_rgba(0,0,0,0.12)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden h-3 bg-gradient-to-t from-black/20 to-transparent sm:block" />
          </div>

          {/* Story copy sits above the page art and changes alignment chapter by chapter. */}
          <div className="pointer-events-none absolute inset-0 z-30">
            {stories.map((story) => (
              <article
                key={story.eyebrow}
                className={`exodus-copy absolute inset-0 flex px-7 pb-[15svh] sm:px-12 md:px-20 ${positionClasses[story.position]}`}
              >
                <div className={`absolute inset-0 ${scrimClasses[story.position]}`} />

                <div className={`relative w-full max-w-5xl ${story.position === "right" ? "ml-auto" : ""}`}>
                  <p className={`tx-eyebrow ${FONT.mono} mb-4 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#f0d99d] sm:mb-5 sm:text-xs ${
                    story.position === "center" ? "justify-center" : story.position === "right" ? "justify-end" : ""
                  }`}>
                    <span className="inline-block h-px w-8 bg-[#f0d99d]/60 sm:w-12" />
                    {story.eyebrow}
                  </p>

                  {/* Big blurred text-shadows are costly while animating on phones; the scrim already handles legibility there. */}
                  <h2
                    className={`${FONT.display} max-w-5xl text-[clamp(2.5rem,7vw,6.8rem)] uppercase leading-[0.96] tracking-[-0.04em] text-[#fffdf5] [text-shadow:0_2px_4px_rgba(0,0,0,0.75)] lg:[text-shadow:0_3px_18px_rgba(0,0,0,0.9)] ${
                      story.position === "right" ? "ml-auto" : story.position === "center" ? "mx-auto" : ""
                    }`}
                  >
                    {story.title.split(" ").map((word, i, arr) => (
                      <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
                        <span className="tx-word inline-block">{word}</span>
                        {i < arr.length - 1 ? "\u00A0" : null}
                      </span>
                    ))}
                  </h2>

                  <p className={`tx-body ${FONT.body} mt-4 max-w-xl text-sm leading-7 text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] sm:mt-6 sm:text-base md:text-lg lg:[text-shadow:0_2px_12px_rgba(0,0,0,0.95)] ${
                    story.position === "right" ? "ml-auto" : story.position === "center" ? "mx-auto" : ""
                  }`}>
                    {story.body}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Persistent chrome: appears with the book so it never doubles up with the cover. */}
          <header className="exodus-chrome pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-between gap-4 border-t border-white/20 px-5 pt-4 sm:px-10 sm:pt-6">
            <span className={`${FONT.display} text-xs tracking-[0.15em] text-white sm:text-sm`}>
              TECHXETRA
            </span>
            <span className={`${FONT.mono} text-right text-[8px] uppercase tracking-[0.1em] text-white/75 sm:text-xs`}>
              {COPY.kicker} · TEZPUR UNIVERSITY
            </span>
          </header>

          {/* Chapter progress rail */}
          <div className="exodus-chrome pointer-events-none absolute right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex lg:right-5">
            <span
              ref={railCountRef}
              className={`${FONT.mono} text-[9px] tracking-[0.18em] text-[#f0d99d]`}
            >
              {`01 / ${pad(stories.length)}`}
            </span>
            <div className="relative h-32 w-px bg-white/20">
              <div ref={railFillRef} className="absolute inset-0 bg-[#f0d99d]" />
            </div>
          </div>

          <footer className="exodus-chrome pointer-events-none absolute inset-x-0 bottom-0 z-40 border-t border-white/15 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-[#060606]/60 px-5 py-3 sm:px-10 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <p className={`${FONT.mono} text-[9px] uppercase leading-5 tracking-[0.12em] text-[#f3ead4] sm:text-xs`}>
                {COPY.tagline}
              </p>
              <span className={`${FONT.mono} hidden text-[9px] uppercase tracking-[0.16em] text-white/45 sm:block`}>
                SCROLL TO EXPLORE
              </span>
            </div>
          </footer>
        </div>
      </section>
    </>
  );
}