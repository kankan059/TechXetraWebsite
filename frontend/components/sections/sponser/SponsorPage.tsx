"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Button from "@/components/ui/Button";
import { sponsors } from "@/data/sponser";
import LogoStatic from "@/components/animations/LogoStatic";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  PAST SPONSORS: replace with your real data.                        */
/*  `image` is optional; without it the name is shown as text.         */
/* ------------------------------------------------------------------ */
type PastSponsor = { name: string; image?: string; year?: string };
type Sponsor = (typeof sponsors)[number];

const defaultPastSponsors: PastSponsor[] = [
  {
    name: "Past Sponsor 1",
    image:
      "https://th.bing.com/th/id/OIP.DSCdfIzIRvofpoFHZ6xJxQHaEK?w=279&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
    year: "2025",
  },
  { name: "Past Sponsor 2", year: "2025" },
  { name: "Past Sponsor 3", year: "2024" },
  { name: "Past Sponsor 4", year: "2024" },
  { name: "Past Sponsor 5", year: "2023" },
  { name: "Past Sponsor 6", year: "2023" },
];

/* One colour world per tier. The page background blends between them on scroll. */
const worlds = [
  { background: "#12062b", accent: "#B79CFF", soft: "rgba(139,92,246,0.34)" },
  { background: "#0d0828", accent: "#9DA6FF", soft: "rgba(99,102,241,0.30)" },
  { background: "#1a0a30", accent: "#D49CFF", soft: "rgba(192,132,252,0.30)" },
  { background: "#100622", accent: "#C4B5FD", soft: "rgba(167,139,250,0.30)" },
];

/* ------------------------------------------------------------------ */
/*  Static helpers                                                     */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A small hand-placed-looking star figure that sits behind each card. */
function makeFigure(index: number) {
  const rnd = seeded((index + 1) * 7919);
  const count = 7;
  const pts = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rnd() * 0.6 + index * 0.7;
    const radius = 150 + rnd() * 48;
    return {
      x: Number((200 + Math.cos(angle) * radius).toFixed(1)),
      y: Number((200 + Math.sin(angle) * radius).toFixed(1)),
      r: Number((1.8 + rnd() * 2.2).toFixed(1)),
    };
  });

  const segments: string[] = [];
  for (let i = 0; i < count - 1; i += 1) {
    segments.push(`M${pts[i].x} ${pts[i].y} L${pts[i + 1].x} ${pts[i + 1].y}`);
  }
  segments.push(`M${pts[1].x} ${pts[1].y} L${pts[4].x} ${pts[4].y}`);

  return { pts, segments };
}

/* ------------------------------------------------------------------ */
/*  Constellation field (canvas, depth parallax, pointer links)        */
/* ------------------------------------------------------------------ */

type FieldNode = {
  x: number;
  y: number;
  py: number;
  vx: number;
  vy: number;
  z: number;
  r: number;
};

function ConstellationField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let nodes: FieldNode[] = [];
    const pointer = { x: -9999, y: -9999 };

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cap = w < 700 ? 38 : 72;
      const count = Math.round(Math.min(cap, Math.max(24, (w * h) / 20000)));

      nodes = Array.from({ length: count }, () => {
        const y = Math.random() * h;
        return {
          x: Math.random() * w,
          y,
          py: y,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          z: 0.35 + Math.random() * 0.65,
          r: 0.6 + Math.random() * 1.4,
        };
      });
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, w, h);
      const scrollY = window.scrollY;
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 165);
      const link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx * dt * n.z;
        n.y += n.vy * dt * n.z;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < 0) n.y += h;
        else if (n.y > h) n.y -= h;
        n.py = (((n.y - scrollY * 0.14 * n.z) % h) + h) % h;
      }

      ctx.lineWidth = 0.7;

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.34 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(185,160,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.py);
          ctx.lineTo(b.x, b.py);
          ctx.stroke();
        }
      }

      if (pointer.x > -999) {
        const reach = link * 1.4;
        const reach2 = reach * reach;
        for (const n of nodes) {
          const dx = n.x - pointer.x;
          const dy = n.py - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          const alpha = (1 - d2 / reach2) * 0.5;
          ctx.strokeStyle = `rgba(225,208,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.55 * n.z) * twinkle;
        ctx.fillStyle = `rgba(238,230,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.py, n.r * n.z + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 16.67, 3);
      last = ts;
      draw(dt, ts);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce || raf || !onScreen || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        setup();
        if (reduce) draw(0, 0);
      });
    });

    /* stop drawing when the whole section is scrolled away */
    const host = canvas.closest("section");
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { rootMargin: "80px 0px" }
    );
    if (host) io.observe(host);

    setup();
    if (reduce) draw(0, 0);
    else start();

    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer && !reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      io.disconnect();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */

const css = `
.spx-float{animation:spx-float 9s ease-in-out infinite}
.spx-orbit{animation:spx-orbit 140s linear infinite}
.spx-cue-dot{animation:spx-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}
.spx-pulse{animation:spx-pulse 2.8s ease-in-out infinite}

.spx-face{background:linear-gradient(150deg,var(--soft),rgba(0,0,0,.42) 70%);transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .45s ease,border-color .45s ease}\n.spx-card{transition:filter .45s ease}\n@media (hover:hover) and (pointer:fine){.spx-card:hover{filter:drop-shadow(0 16px 22px rgba(0,0,0,.28))}.spx-card:hover .spx-face{transform:translateY(-5px);box-shadow:0 42px 58px -22px rgba(0,0,0,.78)}}
.spx-img{transition:transform .9s cubic-bezier(.22,1,.36,1)}
.spx-glare{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s;
  background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%),rgba(235,225,255,.20),transparent 62%)}
@media (hover:hover) and (pointer:fine){
  .spx-card:hover .spx-glare{opacity:1}
  .spx-card:hover .spx-img{transform:scale(1.06)}
}

/* logo ribbon on a tilted plane */
.spx-plane{perspective:1300px}
.spx-plane-in{transform:rotateX(14deg);transform-origin:50% 100%}
.spx-marquee{-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.spx-track{display:flex;width:max-content;animation:spx-marquee 52s linear infinite;will-change:transform}
.spx-track-rev{animation-direction:reverse;animation-duration:60s}
.spx-marquee:hover .spx-track{animation-play-state:paused}

/* orbital object in the closing panel */
.spx-stage{perspective:900px}
.spx-gyro{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:spx-gyro 26s linear infinite}
.spx-ring{position:absolute;inset:0;transform-style:preserve-3d}
.spx-ring-spin{position:absolute;inset:0;border-radius:9999px;border:1px solid rgba(196,181,253,.38);animation:spx-roll 14s linear infinite}
.spx-ring-spin::after{content:"";position:absolute;top:-4px;left:50%;width:7px;height:7px;margin-left:-3.5px;border-radius:9999px;
  background:#ede9fe;box-shadow:0 0 14px 3px rgba(167,139,250,.9)}
.spx-core{background:radial-gradient(circle at 34% 28%,#ede9fe 0%,#a78bfa 22%,#6d28d9 56%,#2e1065 100%);
  box-shadow:0 0 70px 10px rgba(124,58,237,.55),inset -14px -18px 30px rgba(15,5,40,.7)}
.spx-halo{animation:spx-halo 6s ease-in-out infinite alternate}

[data-spx-active="false"] .spx-float,
[data-spx-active="false"] .spx-orbit,
[data-spx-active="false"] .spx-cue-dot,
[data-spx-active="false"] .spx-pulse,
[data-spx-active="false"] .spx-track,
[data-spx-active="false"] .spx-gyro,
[data-spx-active="false"] .spx-ring-spin,
[data-spx-active="false"] .spx-halo{animation-play-state:paused}

@keyframes spx-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}
@keyframes spx-orbit{to{transform:rotate(360deg)}}
@keyframes spx-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}
@keyframes spx-pulse{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.2)}}
@keyframes spx-marquee{to{transform:translate3d(-50%,0,0)}}
@keyframes spx-gyro{to{transform:rotateY(360deg)}}
@keyframes spx-roll{to{transform:rotate(360deg)}}
@keyframes spx-halo{from{opacity:.55;transform:scale(.94)}to{opacity:1;transform:scale(1.08)}}

@media (prefers-reduced-motion:reduce){
  .spx-float,.spx-orbit,.spx-cue-dot,.spx-pulse,.spx-track,.spx-gyro,.spx-ring-spin,.spx-halo{animation:none!important}
  .spx-img{transition:none!important}
  .spx-marquee{overflow-x:auto}
}
`;

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

const Star = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 12 12" className={className}>
    <path
      d="M6 0 L7.3 4.7 L12 6 L7.3 7.3 L6 12 L4.7 7.3 L0 6 L4.7 4.7 Z"
      fill="currentColor"
    />
  </svg>
);

const Corners = ({ color = "#A78BFA" }: { color?: string }) => (
  <>
    <span className="absolute left-0 top-0 h-2 w-2 border-l border-t" style={{ borderColor: color }} />
    <span className="absolute right-0 top-0 h-2 w-2 border-r border-t" style={{ borderColor: color }} />
    <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l" style={{ borderColor: color }} />
    <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r" style={{ borderColor: color }} />
  </>
);

/* ---------- sponsor card: same tilt, depth, figure and float as the event poster ---------- */
function SponsorCard({
  sponsor,
  figure,
  accent,
  soft,
  featured,
  floatDelay,
}: {
  sponsor: Sponsor;
  figure: ReturnType<typeof makeFigure>;
  accent: string;
  soft: string;
  featured: boolean;
  floatDelay: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.8, ease: "power3.out" });
    const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.8, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      ry(Math.max(-1, Math.min(1, px)) * 14);
      rx(Math.max(-1, Math.min(1, py)) * -12);
      stage.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
      stage.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
    };

    const onLeave = () => {
      rx(0);
      ry(0);
    };

    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      data-card
      className="spx-card relative"
      style={{ "--soft": soft, "--acc": accent } as CSSProperties}
    >
      <div className="spx-float relative" style={{ animationDelay: `${floatDelay}s` }}>
        {/* constellation figure behind the card */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          preserveAspectRatio="none"
          fill="none"
          className="pointer-events-none absolute -inset-[16%] h-[132%] w-[132%] overflow-visible"
        >
          {figure.segments.map((d, i) => (
            <path
              key={`seg-${i}`}
              data-figure-line
              d={d}
              pathLength={1}
              stroke={accent}
              strokeOpacity="0.5"
              strokeWidth="1"
              strokeDasharray="1"
              strokeDashoffset="0"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {figure.pts.map((p, i) => (
            <circle key={`pt-${i}`} data-figure-node cx={p.x} cy={p.y} r={p.r} fill="#F1EBFF" />
          ))}
        </svg>

        <div ref={stageRef} className="relative" style={{ perspective: "1100px" }}>
          <div
            ref={tiltRef}
            className="relative will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            <span
              aria-hidden="true"
              className="absolute left-[8%] top-[12%] h-[80%] w-[84%] rounded-full blur-[50px]"
              style={{ background: soft, transform: "translateZ(-100px)" }}
            />

            <article
              className="spx-face relative overflow-hidden border"
              style={{
                borderColor: `${accent}66`,
                transform: "translateZ(0)",
                boxShadow: "0 34px 44px -18px rgba(0,0,0,0.6)",
              }}
            >
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-black px-7 py-8 sm:px-9 sm:py-10">
                <Image
                  src={sponsor.image}
                  alt={sponsor.name}
                  fill
                  unoptimized
                  loading="lazy"
                  draggable={false}
                  sizes={
                    featured
                      ? "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 380px"
                      : "(max-width: 640px) 90vw, (max-width: 1024px) 30vw, 280px"
                  }
                  className="spx-img object-contain p-3"
                />
              </div>

              {SHOW_SPONSOR_DESCRIPTIONS && (
                <div className="px-4 pb-5 pt-4 sm:px-5">
                  <h4 className="m-0 text-center text-sm text-[#F5F0DE]">{sponsor.name}</h4>
                  <p className="mt-2 text-center text-xs leading-6 text-[#F5F0DE]/65">
                    {sponsor.description}
                  </p>
                </div>
              )}
              <div className="spx-glare" />
              <Corners color={`${accent}cc`} />
            </article>

            <span
              aria-hidden="true"
              className="absolute -right-2 top-[10%] h-2 w-2 rounded-full bg-[#F1EBFF]"
              style={{ transform: "translateZ(80px)", boxShadow: `0 0 18px 3px ${accent}` }}
            />
            <span
              aria-hidden="true"
              className="absolute -left-3 bottom-[22%] h-1.5 w-1.5 rounded-full bg-[#F1EBFF]"
              style={{ transform: "translateZ(60px)", boxShadow: `0 0 14px 2px ${accent}` }}
            />
            <span
              aria-hidden="true"
              className="absolute bottom-[5%] right-[8%] h-1 w-1 rounded-full bg-[#F1EBFF]"
              style={{ transform: "translateZ(110px)", boxShadow: `0 0 12px 2px ${accent}` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- past sponsor tile ---------- */
const PastItem = ({ item }: { item: PastSponsor }) => (
  <li className="mr-2.5 w-28 shrink-0 rounded-md border border-white/10 bg-white/[0.04] p-1 transition-colors duration-300 hover:border-[#A78BFA]/60 sm:mr-3 sm:w-36">
    <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-[#0b0620]">
      {item.image ? (
        <Image
          src={item.image}
          alt={item.name}
          fill
          unoptimized
          loading="lazy"
          sizes="144px"
          draggable={false}
          className="object-cover opacity-80 transition-opacity duration-300 hover:opacity-100"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.28),transparent_65%)] px-2 text-center text-[11px] leading-tight text-white/70 [font-family:var(--font-gotham-bold)] sm:text-xs">
          {item.name}
        </span>
      )}
      {item.year && (
        <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-px text-[9px] tracking-[0.12em] text-[#C4B5FD] [font-family:var(--font-pixel)] sm:text-[10px]">
          {item.year}
        </span>
      )}
    </div>
  </li>
);

const Marquee = ({
  items,
  reverse = false,
}: {
  items: PastSponsor[];
  reverse?: boolean;
}) => {
  if (!items.length) return null;
  const repeat = Math.max(1, Math.ceil(10 / items.length));
  const half = Array.from({ length: repeat }).flatMap(() => items);

  return (
    <div className="spx-marquee overflow-hidden">
      <div className={`spx-track ${reverse ? "spx-track-rev" : ""}`}>
        <ul className="flex shrink-0">
          {half.map((it, i) => (
            <PastItem key={`a-${it.name}-${i}`} item={it} />
          ))}
        </ul>
        <ul className="flex shrink-0" aria-hidden="true">
          {half.map((it, i) => (
            <PastItem key={`b-${it.name}-${i}`} item={it} />
          ))}
        </ul>
      </div>
    </div>
  );
};

// Edit these values to customize the sponsor presentation.
const SPONSOR_WALL_ROWS = 3;
const SPONSOR_WALL_COLUMNS = 6;
const SHOW_SPONSOR_DESCRIPTIONS = false;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SponsorPage({
  pastSponsors = defaultPastSponsors,
}: {
  pastSponsors?: PastSponsor[];
}) {
  const rootRef = useRef<HTMLElement>(null);

  /* group by tier, in the order the tiers first appear in the data */
  const groups = useMemo(() => {
    const map = new Map<string, Sponsor[]>();
    sponsors.forEach((s) => {
      const key = String(s.tier ?? "Partners");
      map.set(key, [...(map.get(key) ?? []), s]);
    });
    let running = 0;
    return Array.from(map.entries()).map(([tier, items], gi) => {
      const start = running;
      running += items.length;
      return { tier, items, start, world: worlds[gi % worlds.length] };
    });
  }, []);

  const figures = useMemo(() => sponsors.map((_, index) => makeFigure(index)), []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tierSections = Array.from(root.querySelectorAll<HTMLElement>("[data-tier-section]"));
    const worldEls = Array.from(root.querySelectorAll<HTMLElement>("[data-tier-world]"));

    /* pause looping animations when the section is off screen */
    root.dataset.spxActive = "true";
    const io = new IntersectionObserver(
      ([e]) => {
        root.dataset.spxActive = e.isIntersecting ? "true" : "false";
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(root);

    /* ---------- scroll driven colour blend ---------- */

    let tops: number[] = [];
    let vh = window.innerHeight;
    let activeIndex = -1;
    const lastWorld: number[] = worldEls.map(() => -1);
    const smooth = { y: window.scrollY };

    const measure = () => {
      vh = window.innerHeight;
      const scrollY = window.scrollY;
      tops = tierSections.map((section) => section.getBoundingClientRect().top + scrollY);
    };

    const render = () => {
      if (!tops.length) return;
      const y = smooth.y;
      let total = 0;

      for (let j = 0; j < tops.length; j += 1) {
        const start = tops[j] - vh * 0.95;
        const end = tops[j] - vh * 0.18;
        const p = Math.min(1, Math.max(0, (y - start) / Math.max(end - start, 1)));
        const blend = p * p * (3 - 2 * p);
        total += blend;

        if (Math.abs(blend - lastWorld[j]) > 0.002) {
          lastWorld[j] = blend;
          worldEls[j].style.opacity = blend.toFixed(3);
        }
      }

      const index = Math.min(groups.length - 1, Math.max(0, Math.round(Math.max(total - 1, 0))));
      if (index !== activeIndex) {
        activeIndex = index;
        root.style.setProperty("--accent", groups[index].world.accent);
      }
    };

    const tick = (_time: number, deltaTime: number) => {
      const target = window.scrollY;
      const diff = target - smooth.y;
      if (Math.abs(diff) < 0.05) {
        if (diff !== 0) {
          smooth.y = target;
          render();
        }
        return;
      }
      const k = reducedMotion ? 1 : 1 - Math.exp(-Math.max(deltaTime, 8) / 110);
      smooth.y += diff * k;
      render();
    };

    measure();
    smooth.y = window.scrollY;
    render();
    gsap.ticker.add(tick);

    const onResize = () => {
      measure();
      render();
    };

    window.addEventListener("resize", onResize);
    const sizeObserver = new ResizeObserver(onResize);
    tierSections.forEach((section) => sizeObserver.observe(section));
    void document.fonts.ready.then(onResize);

    /* ---------- section choreography ---------- */

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 900px)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const desktop = Boolean(context.conditions?.desktop);
        const reduced = Boolean(context.conditions?.reduced);

        if (reduced) return;

        const hero = root.querySelector<HTMLElement>("[data-hero]");
        const heroInner = root.querySelector<HTMLElement>("[data-hero-inner]");

        if (hero && heroInner) {
          gsap.from(Array.from(heroInner.children), {
            y: 34,
            opacity: 0,
            duration: 1.2,
            stagger: 0.12,
            ease: "power3.out",
          });

          gsap.to(heroInner, {
            yPercent: -14,
            opacity: 0.05,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        tierSections.forEach((section) => {
          const head = section.querySelector<HTMLElement>("[data-tier-head]");

          if (head) {
            gsap.fromTo(
              Array.from(head.children),
              { x: desktop ? -90 : -34, y: desktop ? 50 : 30, opacity: 0 },
              {
                x: 0,
                y: 0,
                opacity: 1,
                ease: "power2.out",
                stagger: 0.12,
                scrollTrigger: {
                  trigger: section,
                  start: "top 86%",
                  end: "top 36%",
                  scrub: desktop ? 1.1 : 0.7,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-card-wrap]"));

          cards.forEach((wrap) => {
            gsap.fromTo(
              wrap,
              {
                x: desktop ? 90 : 30,
                y: desktop ? 70 : 44,
                scale: desktop ? 0.86 : 0.92,
                rotationY: desktop ? -30 : -16,
                transformPerspective: 1200,
                opacity: 0,
              },
              {
                x: 0,
                y: 0,
                scale: 1,
                rotationY: 0,
                opacity: 1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: wrap,
                  start: "top 94%",
                  end: "top 52%",
                  scrub: desktop ? 1.1 : 0.8,
                  invalidateOnRefresh: true,
                },
              },
            );

            const lines = Array.from(wrap.querySelectorAll<SVGPathElement>("[data-figure-line]"));
            const nodes = Array.from(wrap.querySelectorAll<SVGCircleElement>("[data-figure-node]"));

            if (lines.length) {
              gsap.fromTo(
                lines,
                { strokeDashoffset: 1 },
                {
                  strokeDashoffset: 0,
                  ease: "none",
                  stagger: 0.15,
                  scrollTrigger: {
                    trigger: wrap,
                    start: "top 88%",
                    end: "top 40%",
                    scrub: 1,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }

            if (nodes.length) {
              gsap.fromTo(
                nodes,
                { opacity: 0, scale: 0, transformOrigin: "50% 50%" },
                {
                  opacity: 1,
                  scale: 1,
                  ease: "power2.out",
                  stagger: 0.1,
                  scrollTrigger: {
                    trigger: wrap,
                    start: "top 88%",
                    end: "top 44%",
                    scrub: 1,
                    invalidateOnRefresh: true,
                  },
                },
              );
            }
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-late-group]").forEach((group) => {
          gsap.fromTo(
            group.querySelectorAll("[data-late]"),
            { autoAlpha: 0, y: 36 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: { trigger: group, start: "top 86%", once: true },
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

    const refreshObserver = new ResizeObserver(scheduleRefresh);
    tierSections.forEach((section) => refreshObserver.observe(section));

    return () => {
      disposed = true;
      io.disconnect();
      cancelAnimationFrame(refreshFrame);
      refreshObserver.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
      media.revert();
    };
  }, [groups]);

  const rootStyle = { "--accent": worlds[0].accent } as CSSProperties;

  return (
    <section
      ref={rootRef}
      id="sponsors"
      style={rootStyle}
      data-spx-active="true"
      className="relative isolate min-h-svh overflow-x-clip bg-black text-[#F5F0DE] [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop: black hero field, tier colour worlds, dark grade, stars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 36%, #160a33 0%, #07041a 52%, #000000 100%)",
            }}
          />

          {groups.map((group) => (
            <div
              key={group.tier}
              data-tier-world
              className="absolute inset-0 will-change-[opacity]"
              style={{
                opacity: 0,
                backgroundColor: group.world.background,
                backgroundImage: `radial-gradient(ellipse at 74% 46%, ${group.world.soft} 0%, transparent 70%)`,
              }}
            />
          ))}

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.1) 36%, rgba(0,0,0,0.16) 64%, rgba(0,0,0,0.72) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)",
            }}
          />

          <ConstellationField />
        </div>
      </div>

      <div className="relative z-10">
        {/* Hero: black field with the constellation as the main subject */}
        <section
          data-hero
          aria-labelledby="sponsors-page-title"
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-40 text-center sm:px-8 sm:pt-32"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="spx-orbit" style={{ width: "min(120vw, 980px)", height: "min(120vw, 980px)" }}>
              <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
                <circle cx="200" cy="200" r="190" stroke="#A78BFA" strokeOpacity="0.28" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="142" stroke="#A78BFA" strokeOpacity="0.2" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="3" fill="#E4D9FF" />
                <circle cx="58" cy="262" r="2.2" fill="#E4D9FF" />
              </svg>
            </div>
          </div>

          <div data-hero-inner className="relative flex flex-col items-center">
            <p className="mb-6 text-[8px] tracking-[0.42em] text-[#B9A9F0]/75 [font-family:var(--font-pixel)] sm:mb-8 sm:text-[10px] min-[900px]:text-xs">
              TECHXETRA 12th Edition
            </p>

            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 select-none bg-gradient-to-b from-white via-[#CDC6E2] to-[#5F587A] bg-clip-text text-[clamp(3.2rem,15.5vw,13rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent opacity-30 blur-[18px]"
              >
                SPONSORS
              </span>
              <h1
                id="sponsors-page-title"
                className="relative m-0 bg-gradient-to-b from-[#FFFFFF] via-[#D8D2EA] to-[#5F587A] bg-clip-text text-[clamp(3.2rem,15.5vw,13rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent font-roboto"
              >
                SPONSORS
              </h1>
            </div>

            <p className="mt-9 max-w-[560px] text-[10px] leading-[2] tracking-[0.14em] text-[#B9A9F0]/75 [font-family:var(--font-pixel)] sm:mt-11 sm:text-xs min-[900px]:text-sm">
              EVERY PARTNER IS A STAR IN THE TECHXETRA CONSTELLATION.
            </p>

            <div className="mt-14 flex flex-col items-center gap-3 sm:mt-16">
              <span className="text-[9px] tracking-[0.26em] text-white/40 [font-family:var(--font-pixel)]">SCROLL TO EXPLORE</span>
              <span className="relative block h-12 w-px overflow-hidden bg-white/15">
                <span className="spx-cue-dot absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent via-[#CDBBFF] to-transparent" />
              </span>
            </div>
          </div>
        </section>

        {/* Partner wall: logo grid inspired by a stadium sponsor backdrop */}
        <section
          aria-label="Partner logo wall"
          className="relative flex min-h-[78svh] items-center overflow-hidden px-4 py-20 sm:px-8 lg:min-h-svh lg:py-28"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.12),transparent_68%)]" />
          <div className="relative mx-auto w-full max-w-[1120px]">
            <div className="mb-8 flex items-center justify-center gap-4 sm:mb-12">
              <span className="h-px w-10 bg-violet-300/40 sm:w-20" />
              <p className="m-0 text-center text-[9px] tracking-[0.32em] text-white/55 [font-family:var(--font-pixel)] sm:text-[11px]">
                OUR PARTNERS
              </p>
              <span className="h-px w-10 bg-violet-300/40 sm:w-20" />
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-black/70 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: SPONSOR_WALL_ROWS * SPONSOR_WALL_COLUMNS }, (_, index) => {
                const sponsor = sponsors[index % Math.max(sponsors.length, 1)];
                if (!sponsor) return null;
                return (
                  <div
                    key={`wall-${index}`}
                    className="group relative flex aspect-[1.9/1] items-center justify-center overflow-hidden border-b border-r border-[#D2CBB9]/30 bg-[linear-gradient(145deg,#C8C1B2_0%,#AAA99F_48%,#898D89_100%)] p-2 transition-[background,border-color,filter] duration-300 hover:border-[#8DDCFA]/55 hover:brightness-110 sm:p-4"
                  >
                    <Image
                      src={sponsor.image}
                      alt={sponsor.name}
                      fill
                      unoptimized
                      loading="lazy"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-contain p-3 drop-shadow-[0_2px_5px_rgba(0,0,0,0.14)] transition-transform duration-500 group-hover:scale-105 sm:p-5"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tiers */}
        {groups.map((group, gi) => {
          const featured = gi === 0;
          const { accent, soft } = group.world;

          return (
            <section
              key={group.tier}
              id={`tier-${gi}`}
              data-tier-section
              aria-label={`${group.tier} sponsors`}
              className="relative px-5 py-20 min-[600px]:px-8 min-[900px]:px-12 min-[900px]:py-28 min-[1200px]:px-16"
            >
              <div className="mx-auto w-full max-w-[1240px]">
                <div data-tier-head className="mb-10 min-w-0 min-[900px]:mb-14">
                  <p
                    className="mb-5 flex items-center gap-3 text-[8px] leading-relaxed tracking-[0.2em] [font-family:var(--font-pixel)] min-[900px]:mb-7 min-[900px]:text-[10px]"
                    style={{ color: accent }}
                  >
                    <Star className="h-3 w-3" />
                    <span className="h-px w-10 min-[900px]:w-16" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                  </p>

                  <h2
                    className="m-0 text-[clamp(2.2rem,10vw,3.6rem)] font-normal leading-[1.02] tracking-[-0.04em] text-balance [font-family:var(--font-gotham-bold)] [overflow-wrap:anywhere] min-[900px]:text-[clamp(3rem,5.6vw,5.2rem)]"
                    style={{ textShadow: `0 0 70px ${soft}` }}
                  >
                    {group.tier}
                  </h2>

                  <p className="mt-4 max-w-[52ch] text-[13px] italic leading-[1.65] text-[#F5F0DE]/65 min-[900px]:mt-6 min-[900px]:text-[14px]">
                    {group.items.length} {group.items.length === 1 ? "partner" : "partners"} lighting up this edition.
                  </p>
                </div>

                <ul
                  className="mx-auto flex w-full max-w-[1080px] flex-wrap items-stretch justify-center gap-6 sm:gap-8 lg:gap-9"
                >
                  {group.items.map((s, i) => {
                    const idx = group.start + i;
                    return (
                      <li key={`${s.name}-${i}`} data-card-wrap className="w-full min-w-0 max-w-[320px] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)]">
                        <SponsorCard
                          sponsor={s}
                          figure={figures[idx]}
                          accent={accent}
                          soft={soft}
                          featured={featured}
                          floatDelay={-((idx * 1.7) % 9)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}

        {/* Past sponsors */}
        {pastSponsors.length > 0 && (
          <section
            data-late-group
            aria-label="Past sponsors"
            className="relative px-5 pb-6 pt-10 min-[600px]:px-8 min-[900px]:px-12 min-[1200px]:px-16"
          >
            <div className="mx-auto w-full max-w-[1240px]">
              <div data-late className="mb-8 flex items-center gap-4">
                <Star className="h-3 w-3 shrink-0 text-white/45" />
                <h3 className="m-0 text-lg font-normal tracking-tight text-white/85 [font-family:var(--font-gotham-bold)] sm:text-xl">
                  Backed us before
                </h3>
                <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>

              <div data-late className="spx-plane">
                <div className="spx-plane-in space-y-2.5 sm:space-y-3">
                  <Marquee items={pastSponsors} />
                  <Marquee items={[...pastSponsors].reverse()} reverse />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Become a partner */}
        <section
          data-late-group
          aria-label="Become a sponsor"
          className="relative px-5 pb-28 pt-20 min-[600px]:px-8 min-[900px]:px-12 min-[1200px]:px-16"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <div
              data-late
              className="rounded-3xl bg-gradient-to-br from-[#A78BFA]/55 via-[#6D28D9]/20 to-[#8B5CF6]/10 p-px shadow-[0_0_70px_rgba(124,58,237,0.16)]"
            >
              <div className="relative overflow-hidden rounded-[23px] bg-[linear-gradient(105deg,#190D2D_0%,#10091E_34%,#080811_66%,#000000_100%)] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_300px_at_78%_50%,rgba(75,125,165,0.14),transparent_72%),radial-gradient(420px_240px_at_8%_100%,rgba(139,92,246,0.09),transparent_75%)]"
                />
                <Corners />

                <div className="relative z-[1] grid items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-0">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#A78BFA]/40 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[10px] tracking-[0.2em] text-[#C4B5FD] [font-family:var(--font-pixel)] sm:text-[11px]">
                      <Star className="spx-pulse h-2.5 w-2.5" />
                      BECOME A PARTNER
                    </span>

                    <h3 className="m-0 mt-6 bg-gradient-to-r from-white via-[#DDD6FE] to-[#A78BFA] bg-clip-text text-[clamp(2rem,5vw,3.6rem)] font-normal leading-[1.04] tracking-[-0.04em] text-transparent [font-family:var(--font-gotham-bold)]">
                      Build the future with us.
                    </h3>

                    <p className="mt-4 max-w-md text-sm leading-7 text-white/60 sm:text-base">
                      Bring your brand into the next chapter of technology and
                      creativity, and take your place in the constellation.
                    </p>

                    <div className="mt-9">
                      <Button href="/contact">Become a Sponsor</Button>
                    </div>
                  </div>

                  <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden px-5 py-5 sm:min-h-[260px] lg:min-h-full">
                    <div
                      aria-hidden="true"
                      className="spx-stage relative mx-auto flex w-full max-w-[340px] items-center justify-center lg:max-w-[300px]"
                    >
                      <div className="relative z-[1] aspect-square w-[min(220px,58vw)] lg:w-[240px]">
                        <LogoStatic />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}