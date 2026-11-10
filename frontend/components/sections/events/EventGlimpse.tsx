"use client";

import SectionTitle from "@/components/ui/SectionTitle";
import React, { useEffect, useRef, useState } from "react";

type Poster = {
  src: string;
  alt?: string;
};

type Props = {
  posters?: Poster[];
  background?: string;
  speed?: number;
  href?: string;
  buttonText?: string;
};

const DEFAULT_POSTERS: Poster[] = Array.from({ length: 6 }, (_, i) => ({
  src: `https://picsum.photos/seed/event-glimpse-${i + 1}/600/800`,
  alt: `Event image ${i + 1}`,
}));

type Layout = {
  w: number;
  cardW: number;
  cardH: number;
  g: number;
  step: number;
  stageH: number;
  count: number;
  total: number;
  mobile: boolean;
};

const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, v));

function Constellation({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 220"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="#75DFFF"
        strokeWidth="0.9"
        strokeOpacity="0.55"
      >
        <path d="M35 155L82 112L128 133L170 75L225 96L268 35" />
        <path d="M82 112L105 45L170 75" />
        <path d="M128 133L155 190L225 96" />
        <path d="M170 75L190 20" />
      </g>

      <g fill="#B5F0FF">
        <circle cx="35" cy="155" r="2.2" />
        <circle cx="82" cy="112" r="2.8" />
        <circle cx="128" cy="133" r="2.1" />
        <circle cx="170" cy="75" r="3" />
        <circle cx="225" cy="96" r="2.5" />
        <circle cx="268" cy="35" r="2.2" />
        <circle cx="105" cy="45" r="1.8" />
        <circle cx="155" cy="190" r="1.8" />
        <circle cx="190" cy="20" r="1.7" />
      </g>

      <g fill="#75DFFF">
        <circle cx="35" cy="155" r="8" opacity="0.16" />
        <circle cx="82" cy="112" r="9" opacity="0.18" />
        <circle cx="170" cy="75" r="10" opacity="0.2" />
        <circle cx="225" cy="96" r="8" opacity="0.17" />
        <circle cx="268" cy="35" r="8" opacity="0.16" />
      </g>
    </svg>
  );
}

export default function EventGlimpse({
  posters = DEFAULT_POSTERS,
  background = "none",
  speed = 60,
  href = "/events",
  buttonText = "Explore Events",
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layoutRef = useRef<Layout | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  /* Layout */

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;

      const mobile = w < 640;
      const tablet = w >= 640 && w < 1024;

      const cardW = mobile
        ? clamp(w * 0.58, 145, 205)
        : tablet
          ? clamp(w * 0.25, 175, 225)
          : clamp(w * 0.15, 185, 270);

      const cardH = Math.round(cardW * 1.5);
      const gap = mobile ? 12 : tablet ? 18 : 22;
      const step = cardW + gap;

      const count = Math.max(
        posters.length,
        Math.ceil((w + 3 * step) / step)
      );

      const next: Layout = {
        w,
        cardW: Math.round(cardW),
        cardH,
        g: 16,
        step,
        stageH: Math.round(cardH * (mobile ? 1.2 : 1.28)),
        count,
        total: count * step,
        mobile,
      };

      layoutRef.current = next;
      setLayout(next);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, [posters.length]);

  /* Animation */

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let offset = 0;
    let boost = 0;
    let dragging = false;
    let lastX = 0;
    let lastMoveT = 0;
    let dragV = 0;
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let lastScrollY = window.scrollY;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const L = layoutRef.current;
      if (!L || !visible) return;

      const base =
        (L.mobile ? speed * 0.7 : speed) *
        (reduced ? 0.35 : 1);

      if (!dragging) {
        boost *= Math.exp(-2.6 * dt);
        offset += (base + boost) * dt;
      }

      const cards = cardRefs.current;
      const top = (L.stageH - L.cardH) / 2;
      const half = L.w / 2;

      for (let i = 0; i < L.count; i++) {
        const el = cards[i];
        if (!el) continue;

        const rel =
          (((i * L.step - offset) % L.total) + L.total) %
          L.total;

        const left = rel - L.step * 1.5;

        const t = clamp(
          (left + L.cardW / 2 - half) / half,
          -1.3,
          1.3
        );

        const ry = -t * 26;
        const z = t * t * 130 - 30;

        el.style.transform = `translate3d(${left.toFixed(
          1
        )}px, ${top.toFixed(1)}px, ${z.toFixed(
          1
        )}px) rotateY(${ry.toFixed(2)}deg)`;

        el.style.setProperty("--sk", `${(-t * 5).toFixed(2)}deg`);
      }
    };

    raf = requestAnimationFrame(tick);

    /* Interactions */

    const onScroll = () => {
      const d = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      boost = clamp(boost + d * 2.5, -900, 900);
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        boost = clamp(boost + e.deltaX * 2, -900, 900);
      }
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastMoveT = performance.now();
      dragV = 0;
      boost = 0;

      stage.setPointerCapture?.(e.pointerId);
      stage.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;

      const now = performance.now();
      const dx = e.clientX - lastX;

      offset -= dx;

      const dtm = Math.max(now - lastMoveT, 1) / 1000;
      dragV = clamp(-dx / dtm, -1500, 1500);

      lastX = e.clientX;
      lastMoveT = now;
    };

    const onUp = () => {
      if (!dragging) return;

      dragging = false;
      stage.style.cursor = "grab";
      boost = clamp(dragV * 0.6, -900, 900);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = performance.now();
      },
      { threshold: 0 }
    );

    io.observe(stage);

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    stage.addEventListener("wheel", onWheel, {
      passive: true,
    });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();

      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
  }, [speed]);

  /* Render */

  const items =
    layout && posters.length
      ? Array.from(
          { length: layout.count },
          (_, i) => posters[i % posters.length]
        )
      : [];

  const defaultBackground = `
    radial-gradient(
      ellipse at 50% 42%,
      rgba(13, 48, 65, 0.62) 0%,
      rgba(7, 18, 27, 0.38) 42%,
      transparent 75%
    ),
    linear-gradient(
      180deg,
      #030609 0%,
      #080E15 48%,
      #000000 100%
    )
  `;

  const maskEdge =
    "linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)";

  return (
    <section
      ref={rootRef}
      className="event-glimpse"
      style={{
        position: "relative",
        isolation: "isolate",
        width: "100%",
        overflow: "hidden",
        background:
          background === "none"
            ? defaultBackground
            : background,
        padding: "clamp(24px, 4vw, 40px) 0 clamp(32px, 5vw, 48px)",
        color: "#fff",
      }}
    >
      {background === "none" && (
        <>
          {/* Centre space reflection */}
          <div
            aria-hidden="true"
            className="eg-centre-glow"
          />

          {/* Constellations */}
          <Constellation className="eg-constellation eg-constellation-top" />
          <Constellation className="eg-constellation eg-constellation-bottom" />

          {/* Black side edges */}
          <div aria-hidden="true" className="eg-edge-left" />
          <div aria-hidden="true" className="eg-edge-right" />

          {/* Black top transition */}
          <div aria-hidden="true" className="eg-top-transition" />

          {/* Bottom fade */}
          <div aria-hidden="true" className="eg-bottom-vignette" />
        </>
      )}

      <style>{`
        .event-glimpse .eg-centre-glow {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 50% 45%,
              rgba(35, 116, 145, 0.13),
              transparent 58%
            );
        }

        .event-glimpse .eg-constellation {
          position: absolute;
          width: clamp(150px, 25vw, 300px);
          height: auto;
          pointer-events: none;
          z-index: 0;
          opacity: 0.8;
          filter: drop-shadow(
            0 0 6px rgba(85, 223, 255, 0.28)
          );
        }

        .event-glimpse .eg-constellation-top {
          top: 70px;
          right: 0;
          transform: translate(12%, -8%);
        }

        .event-glimpse .eg-constellation-bottom {
          bottom: 0;
          left: 0;
          transform: translate(-12%, 12%) rotate(180deg);
        }

        /* Pure black side edges */

        .event-glimpse .eg-edge-left,
        .event-glimpse .eg-edge-right {
          position: absolute;
          z-index: 5;
          top: 0;
          bottom: 0;
          width: clamp(50px, 13vw, 190px);
          pointer-events: none;
        }

        .event-glimpse .eg-edge-left {
          left: 0;
          background: linear-gradient(
            to right,
            #000 0%,
            rgba(0, 0, 0, 0.98) 25%,
            rgba(0, 0, 0, 0.75) 58%,
            transparent 100%
          );
        }

        .event-glimpse .eg-edge-right {
          right: 0;
          background: linear-gradient(
            to left,
            #000 0%,
            rgba(0, 0, 0, 0.98) 25%,
            rgba(0, 0, 0, 0.75) 58%,
            transparent 100%
          );
        }

        /* Seamless black transition from About section */

        .event-glimpse .eg-top-transition {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: clamp(100px, 15vw, 170px);
          z-index: 6;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            #000 0%,
            #000 18%,
            rgba(0, 0, 0, 0.96) 38%,
            rgba(0, 0, 0, 0.72) 65%,
            transparent 100%
          );
        }

        .event-glimpse .eg-bottom-vignette {
          position: absolute;
          inset: auto 0 0;
          height: 90px;
          z-index: 4;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(0, 0, 0, 0.65)
          );
        }

        /* Button */

        .event-glimpse .eg-btn {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 7px 8px 7px 26px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: .05em;
          text-decoration: none;
          color: #fff;
          background: rgba(0, 0, 0, .65);
          border: 1px solid rgba(85, 223, 255, .5);
          box-shadow: 0 0 22px rgba(85, 223, 255, .16);
          transition:
            transform .3s ease,
            box-shadow .3s ease,
            border-color .3s ease;
        }

        .event-glimpse .eg-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(85, 223, 255, .95);
          box-shadow: 0 0 30px rgba(85, 223, 255, .35);
        }

        .event-glimpse .eg-btn i {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #55DFFF;
          color: #001417;
          transition: transform .3s ease;
        }

        .event-glimpse .eg-btn:hover i {
          transform: translateX(3px);
        }

        /* Cards */

        .event-glimpse .eg-card {
          position: absolute;
          left: 0;
          top: 0;
          overflow: hidden;
          border-radius: 4px;
          will-change: transform;
          backface-visibility: hidden;
          box-shadow: 0 12px 38px rgba(0, 0, 0, .35);
        }

        .event-glimpse .eg-card img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }

        /* Tablet */

        @media (min-width: 641px) and (max-width: 1023px) {
          .event-glimpse .eg-constellation {
            width: 210px;
          }
        }

        /* Mobile */

        @media (max-width: 640px) {
          .event-glimpse .eg-btn {
            font-size: 13px;
            padding: 6px 7px 6px 20px;
          }

          .event-glimpse .eg-btn i {
            width: 34px;
            height: 34px;
          }

          .event-glimpse .eg-constellation {
            width: 155px;
            opacity: 0.68;
          }

          .event-glimpse .eg-constellation-top {
            top: 55px;
          }

          .event-glimpse .eg-edge-left,
          .event-glimpse .eg-edge-right {
            width: 42px;
          }

          .event-glimpse .eg-top-transition {
            height: 110px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .event-glimpse .eg-btn {
            transition: none;
          }
        }
      `}</style>

      {/* Section heading */}
      <header className="relative z-[7] mb-4 pl-5 sm:mb-6 sm:pl-10 md:pl-16 lg:pl-24">
        <SectionTitle title="Events" align="left" />
      </header>

      {/* Carousel */}
      <div
        className="relative z-[2] w-full overflow-hidden"
        style={{
          WebkitMaskImage: maskEdge,
          maskImage: maskEdge,
        }}
      >
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: "100%",
            height: layout ? layout.stageH : 420,
            perspective: 1200,
            perspectiveOrigin: "50% 50%",
            touchAction: "pan-y",
            cursor: "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {layout &&
            items.map((p, i) => (
              <div
                key={`${p.src}-${i}`}
                className="eg-card"
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                style={{
                  width: layout.cardW,
                  height: layout.cardH,
                  transform: "translate3d(-9999px,0,0)",
                }}
              >
                <img
                  src={p.src}
                  alt={p.alt || `Event image ${i + 1}`}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
        </div>
      </div>

      {/* Explore button */}
      <div className="relative z-[7] mt-4 flex justify-center sm:mt-5">
        <a href={href} className="eg-btn">
          {buttonText}
          <i>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </i>
        </a>
      </div>
    </section>
  );
}