"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "@/components/ui/Button";
import { sponsors } from "@/data/sponser";
import LogoStatic from "@/components/animations/LogoStatic";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Easy customisation                                                 */
/* ------------------------------------------------------------------ */

type PastSponsor = { name: string; image?: string };
type Sponsor = (typeof sponsors)[number];

/* Replace with your real past sponsors. `image` is optional. */
const defaultPastSponsors: PastSponsor[] = [
  { name: "Past Sponsor" },
  { name: "Past Sponsor" },
  { name: "Past Sponsor" },
  { name: "Past Sponsor" },
  { name: "Past Sponsor" },
  { name: "Past Sponsor" },
];

/* Hover accent cycles through these, card by card. */
const accents = ["#B9A2FF", "#8FA0FF", "#D6A3FF", "#C4B5FD"];

/* ------------------------------------------------------------------ */
/*  Star field (canvas): depth parallax, pointer links, shooting stars */
/* ------------------------------------------------------------------ */

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

function StarField() {
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
    const streak = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, next: 4000 };

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cap = w < 700 ? 40 : 80;
      const count = Math.round(Math.min(cap, Math.max(26, (w * h) / 18000)));
      nodes = Array.from({ length: count }, () => {
        const y = Math.random() * h;
        return {
          x: Math.random() * w,
          y,
          py: y,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          z: 0.3 + Math.random() * 0.7,
          r: 0.5 + Math.random() * 1.3,
        };
      });
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, w, h);
      const scrollY = window.scrollY;
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 160);
      const link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx * dt * n.z;
        n.y += n.vy * dt * n.z;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < 0) n.y += h;
        else if (n.y > h) n.y -= h;
        n.py = (((n.y - scrollY * 0.12 * n.z) % h) + h) % h;
      }

      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.3 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(185,162,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.py);
          ctx.lineTo(b.x, b.py);
          ctx.stroke();
        }
      }

      if (pointer.x > -999) {
        const reach = link * 1.5;
        const reach2 = reach * reach;
        for (const n of nodes) {
          const dx = n.x - pointer.x;
          const dy = n.py - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          const alpha = (1 - d2 / reach2) * 0.55;
          ctx.strokeStyle = `rgba(230,214,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.25 + 0.6 * n.z) * twinkle;
        ctx.fillStyle = `rgba(240,232,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.py, n.r * n.z + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      /* an occasional shooting star */
      streak.next -= dt * 16.67;
      if (!streak.on && streak.next <= 0) {
        streak.on = true;
        streak.life = 1;
        streak.x = Math.random() * w * 0.8;
        streak.y = Math.random() * h * 0.35;
        streak.vx = 7 + Math.random() * 4;
        streak.vy = 3 + Math.random() * 2;
        streak.next = 5000 + Math.random() * 6000;
      }
      if (streak.on) {
        streak.x += streak.vx * dt;
        streak.y += streak.vy * dt;
        streak.life -= 0.016 * dt;
        if (streak.life <= 0) streak.on = false;
        else {
          const tail = 90;
          const len = Math.hypot(streak.vx, streak.vy);
          const g = ctx.createLinearGradient(
            streak.x,
            streak.y,
            streak.x - (streak.vx / len) * tail,
            streak.y - (streak.vy / len) * tail
          );
          g.addColorStop(0, `rgba(255,250,255,${(0.85 * streak.life).toFixed(3)})`);
          g.addColorStop(1, "rgba(255,250,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x - (streak.vx / len) * tail, streak.y - (streak.vy / len) * tail);
          ctx.stroke();
        }
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
    const onVisibility = () => (document.hidden ? stop() : start());
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
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
.spx-orbit{animation:spx-spin 160s linear infinite}
.spx-orbit-rev{animation:spx-spin 110s linear infinite reverse}
.spx-drip{animation:spx-drip 2.6s cubic-bezier(.6,0,.4,1) infinite}
.spx-breathe{animation:spx-breathe 3.4s ease-in-out infinite}
.spx-ping{animation:spx-ping 3.4s ease-out infinite}

.spx-card{transition:border-color .45s ease, background-color .45s ease, box-shadow .45s ease}
.spx-glare{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s;border-radius:inherit;
  background:radial-gradient(300px circle at var(--mx,50%) var(--my,50%),rgba(190,165,255,.16),transparent 65%)}
.spx-plate{transition:transform .6s cubic-bezier(.22,1,.36,1), box-shadow .6s ease}
@media (hover:hover) and (pointer:fine){
  .spx-card:hover{border-color:color-mix(in srgb,var(--acc) 55%,transparent);box-shadow:0 30px 50px -30px rgba(0,0,0,.9)}
  .spx-card:hover .spx-glare{opacity:1}
  .spx-card:hover .spx-plate{transform:translateY(-3px)}
}

.spx-node-halo{transform-box:fill-box;transform-origin:center;animation:spx-breathe 3.6s ease-in-out infinite}

.spx-marquee{-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.spx-track{display:flex;width:max-content;animation:spx-marquee 60s linear infinite;will-change:transform}
.spx-track-rev{animation-direction:reverse;animation-duration:72s}
.spx-marquee:hover .spx-track{animation-play-state:paused}

[data-spx-active="false"] .spx-orbit,
[data-spx-active="false"] .spx-orbit-rev,
[data-spx-active="false"] .spx-drip,
[data-spx-active="false"] .spx-breathe,
[data-spx-active="false"] .spx-ping,
[data-spx-active="false"] .spx-node-halo,
[data-spx-active="false"] .spx-track{animation-play-state:paused}

@keyframes spx-spin{to{transform:rotate(360deg)}}
@keyframes spx-drip{0%{transform:translateY(-110%)}100%{transform:translateY(220%)}}
@keyframes spx-breathe{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes spx-ping{0%{transform:scale(.7);opacity:.7}100%{transform:scale(1.9);opacity:0}}
@keyframes spx-marquee{to{transform:translate3d(-50%,0,0)}}

@media (prefers-reduced-motion:reduce){
  .spx-orbit,.spx-orbit-rev,.spx-drip,.spx-breathe,.spx-ping,.spx-node-halo,.spx-track{animation:none!important}
  .spx-plate{transition:none!important}
  .spx-marquee{overflow-x:auto}
}
`;

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

/* Text that rises out of a mask. */
const Rise = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`block overflow-hidden pb-[0.08em] ${className}`}>
    <span data-rise className="block will-change-transform">
      {children}
    </span>
  </span>
);

/* Small corner brackets for the partner panel. */
const Corners = ({ color = "#A78BFA" }: { color?: string }) => (
  <>
    <span className="absolute left-0 top-0 h-2 w-2 border-l border-t" style={{ borderColor: color }} />
    <span className="absolute right-0 top-0 h-2 w-2 border-r border-t" style={{ borderColor: color }} />
    <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l" style={{ borderColor: color }} />
    <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r" style={{ borderColor: color }} />
  </>
);

/* One partner category: its label, and the logos under it. */
function PartnerCard({ tier, items, accent }: { tier: string; items: Sponsor[]; accent: string }) {
  const compact = items.length > 2;

  return (
    <article
      data-partner-card
      onPointerMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      }}
      className="spx-card group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.012))] px-5 pb-8 pt-7"
      style={{ "--acc": accent } as CSSProperties}
    >
      <div className="spx-glare" />

      <h3 className="relative m-0 text-center text-[10px] leading-[1.9] tracking-[0.28em] text-[#F5F0DE]/70 uppercase [font-family:var(--font-pixel)] sm:text-[11px]">
        {tier}
      </h3>
      <span
        aria-hidden="true"
        className="relative mx-auto mt-3 block h-px w-8 transition-[width] duration-500 group-hover:w-16"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="relative mt-6 flex flex-1 flex-wrap items-center justify-center gap-3">
        {items.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className={`spx-plate relative shrink-0 overflow-hidden rounded-[10px] bg-[#F6F4FB] shadow-[0_12px_22px_-14px_rgba(0,0,0,0.85)] ${
              compact ? "h-14 w-[104px] sm:h-16 sm:w-[120px]" : "h-[72px] w-[132px] sm:h-[84px] sm:w-[156px]"
            }`}
          >
            <Image
              src={s.image}
              alt={s.name}
              fill
              unoptimized
              loading="lazy"
              draggable={false}
              sizes={compact ? "120px" : "156px"}
              className={`object-contain ${compact ? "p-2.5" : "p-3"}`}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  The constellation that threads through the partner cards           */
/* ------------------------------------------------------------------ */

type Pt = { x: number; y: number };
type Seg = { a: Pt; b: Pt };

function ConstellationLinks({ gridRef }: { gridRef: { current: HTMLDivElement | null } }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; segs: Seg[] }>({ w: 0, h: 0, segs: [] });

  /* measure the cards and chain their corners into one figure */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const build = () => {
      const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-partner-card]")).map((el) => ({
        l: el.offsetLeft,
        t: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      }));

      /* snake order: left to right, then right to left on the next row */
      const rows: (typeof cards)[] = [];
      cards.forEach((c) => {
        const row = rows.find((r) => Math.abs(r[0].t - c.t) < 20);
        if (row) row.push(c);
        else rows.push([c]);
      });
      const ordered = rows.flatMap((r, ri) => {
        const s = [...r].sort((a, b) => a.l - b.l);
        return ri % 2 ? s.reverse() : s;
      });

      const I = 15;
      const corner = (c: (typeof cards)[number], side: "l" | "r", edge: "t" | "b"): Pt => ({
        x: side === "l" ? c.l + I : c.l + c.w - I,
        y: edge === "t" ? c.t + I : c.t + c.h - I,
      });

      const segs: Seg[] = [];
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const a = ordered[i];
        const b = ordered[i + 1];
        const flip = i % 2 === 0;
        if (Math.abs(a.t - b.t) < 20) {
          const right = b.l > a.l;
          const edge = flip ? "t" : "b";
          segs.push({ a: corner(a, right ? "r" : "l", edge), b: corner(b, right ? "l" : "r", edge) });
        } else {
          const side = flip ? "l" : "r";
          segs.push({ a: corner(a, side, "b"), b: corner(b, side, "t") });
        }
      }
      setGeo({ w: grid.offsetWidth, h: grid.offsetHeight, segs });
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(grid);
    void document.fonts.ready.then(build);
    return () => ro.disconnect();
  }, [gridRef]);

  /* draw the figure as the grid scrolls through the viewport */
  useEffect(() => {
    const svg = svgRef.current;
    const grid = gridRef.current;
    if (!svg || !grid || !geo.segs.length) return;

    const lines = Array.from(svg.querySelectorAll<SVGPathElement>("[data-cl]"));
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>("[data-cn]"));
    const n = lines.length;

    const apply = (p: number) => {
      const t = p * (n + 0.6);
      lines.forEach((el, k) => {
        el.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, t - k)));
      });
      nodes.forEach((el, j) => {
        const threshold = Math.floor(j / 2) + (j % 2);
        el.style.opacity = String(Math.min(1, Math.max(0, (t - threshold) * 3)));
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(1);
      return;
    }

    apply(0);
    const st = ScrollTrigger.create({
      trigger: grid,
      start: "top 78%",
      end: "bottom 62%",
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    apply(st.progress);
    return () => st.kill();
  }, [geo, gridRef]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${Math.max(geo.w, 1)} ${Math.max(geo.h, 1)}`}
      fill="none"
      className="pointer-events-none absolute left-0 top-0 z-20 overflow-visible"
    >
      {geo.segs.map((s, i) => (
        <path
          key={`l-${i}`}
          data-cl
          d={`M${s.a.x} ${s.a.y} L${s.b.x} ${s.b.y}`}
          pathLength={1}
          stroke="#CDBBFF"
          strokeOpacity="0.6"
          strokeWidth="1"
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      ))}
      {geo.segs.flatMap((s, i) => [
        { p: s.a, key: `a-${i}` },
        { p: s.b, key: `b-${i}` },
      ]).map(({ p, key }) => (
        <g key={key} data-cn style={{ opacity: 0 }}>
          <circle className="spx-node-halo" cx={p.x} cy={p.y} r="6" fill="#A78BFA" fillOpacity="0.25" />
          <circle cx={p.x} cy={p.y} r="2.2" fill="#F4EEFF" />
        </g>
      ))}
    </svg>
  );
}

/* Past sponsors */
const PastItem = ({ item }: { item: PastSponsor }) => (
  <li className="mr-3 flex h-14 w-32 shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.03] px-4 transition-colors duration-300 hover:border-white/30 sm:h-16 sm:w-40">
    {item.image ? (
      <span className="relative block h-full w-full">
        <Image
          src={item.image}
          alt={item.name}
          fill
          unoptimized
          loading="lazy"
          sizes="160px"
          draggable={false}
          className="object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
        />
      </span>
    ) : (
      <span className="truncate text-[11px] tracking-[0.14em] text-white/45 [font-family:var(--font-gotham-bold)]">
        {item.name}
      </span>
    )}
  </li>
);

const Marquee = ({ items, reverse = false }: { items: PastSponsor[]; reverse?: boolean }) => {
  if (!items.length) return null;
  const repeat = Math.max(1, Math.ceil(10 / items.length));
  const half = Array.from({ length: repeat }).flatMap(() => items);
  return (
    <div className="spx-marquee overflow-hidden">
      <div className={`spx-track ${reverse ? "spx-track-rev" : ""}`}>
        <ul className="flex shrink-0">
          {half.map((it, i) => (
            <PastItem key={`a-${i}`} item={it} />
          ))}
        </ul>
        <ul className="flex shrink-0" aria-hidden="true">
          {half.map((it, i) => (
            <PastItem key={`b-${i}`} item={it} />
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SponsorPage({
  pastSponsors = defaultPastSponsors,
}: {
  pastSponsors?: PastSponsor[];
}) {
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /* one card per tier / category, in the order they first appear in the data */
  const groups = useMemo(() => {
    const map = new Map<string, Sponsor[]>();
    sponsors.forEach((s) => {
      const key = String(s.tier ?? "Partners");
      map.set(key, [...(map.get(key) ?? []), s]);
    });
    return Array.from(map.entries()).map(([tier, items], gi) => ({
      tier,
      items,
      accent: accents[gi % accents.length],
    }));
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* smooth scrolling: Lenis drives the page, ScrollTrigger follows it */
    const lenis = reduced
      ? null
      : new Lenis({
          duration: 1.3,
          easing: (t: number) => 1 - Math.pow(1 - t, 4),
          smoothWheel: true,
          wheelMultiplier: 0.7,
          touchMultiplier: 1,
          syncTouch: false,
        });
    const lenisTicker = lenis ? (time: number) => lenis.raf(time * 1000) : null;
    if (lenis && lenisTicker) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
    }

    /* pause looping animations when the page section is off screen */
    root.dataset.spxActive = "true";
    const io = new IntersectionObserver(
      ([e]) => {
        root.dataset.spxActive = e.isIntersecting ? "true" : "false";
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(root);

    const ctx = gsap.context(() => {
      if (reduced) return;

      /* hero reveal */
      const heroRise = gsap.utils.toArray<HTMLElement>("[data-hero] [data-rise]");
      gsap.set(heroRise, { yPercent: 115 });
      gsap.set("[data-hero-fade]", { opacity: 0, y: 18 });
      const intro = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.15 });
      intro
        .to(heroRise, { yPercent: 0, duration: 1.3, stagger: 0.12 })
        .to("[data-hero-fade]", { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, "-=0.8");

      gsap.to("[data-hero-inner]", {
        yPercent: -12,
        opacity: 0.05,
        ease: "none",
        scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: 0.6 },
      });

      /* partners heading */
      const head = root.querySelector<HTMLElement>("[data-pgrid-head]");
      if (head) {
        const rise = head.querySelectorAll<HTMLElement>("[data-rise]");
        const rules = head.querySelectorAll<HTMLElement>("[data-rule]");
        gsap.set(rise, { yPercent: 115 });
        gsap.set(rules, { scaleX: 0 });
        ScrollTrigger.create({
          trigger: head,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(rise, { yPercent: 0, duration: 1.1, ease: "power4.out" });
            gsap.to(rules, { scaleX: 1, duration: 1.4, delay: 0.2, ease: "power3.out" });
          },
        });
      }

      /* partner cards */
      const cards = gsap.utils.toArray<HTMLElement>("[data-partner-card]", root);
      gsap.set(cards, { opacity: 0, y: 44 });
      ScrollTrigger.batch(cards, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "power3.out", overwrite: true }),
      });

      /* partner panel */
      const partner = root.querySelector<HTMLElement>("[data-partner]");
      if (partner) {
        const fades = partner.querySelectorAll("[data-p-fade]");
        gsap.set(fades, { opacity: 0, y: 36 });
        ScrollTrigger.create({
          trigger: partner,
          start: "top 82%",
          once: true,
          onEnter: () => gsap.to(fades, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out" }),
        });
      }

      /* past sponsors reveal */
      const past = root.querySelector<HTMLElement>("[data-past]");
      if (past) {
        gsap.set(past.querySelectorAll("[data-late]"), { opacity: 0, y: 30 });
        ScrollTrigger.create({
          trigger: past,
          start: "top 88%",
          once: true,
          onEnter: () =>
            gsap.to(past.querySelectorAll("[data-late]"), {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.14,
              ease: "power3.out",
            }),
        });
      }

      /* page progress rail */
      const rail = root.querySelector<HTMLElement>("[data-rail]");
      const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
      if (rail && fill) {
        gsap.set(rail, { opacity: 0 });
        gsap.fromTo(
          fill,
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: true } }
        );
        ScrollTrigger.create({
          trigger: root,
          start: "top 20%",
          end: "bottom 80%",
          onToggle: (self) => gsap.to(rail, { opacity: self.isActive ? 1 : 0, duration: 0.4 }),
        });
      }
    }, root);

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
    refreshObserver.observe(root);

    return () => {
      disposed = true;
      io.disconnect();
      cancelAnimationFrame(refreshFrame);
      refreshObserver.disconnect();
      ctx.revert();
      if (lenisTicker) gsap.ticker.remove(lenisTicker);
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      }
    };
  }, [groups]);

  return (
    <section
      ref={rootRef}
      id="sponsors"
      data-spx-active="true"
      className="relative isolate min-h-svh overflow-x-clip bg-black text-[#F5F0DE] [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop: a deep night sky with a drifting star field */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 38%, #150a31 0%, #06031a 55%, #000 100%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 78% 62%, rgba(110,80,240,0.16) 0%, transparent 62%)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 36%, rgba(0,0,0,0.14) 64%, rgba(0,0,0,0.7) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }}
          />
          <StarField />
        </div>
      </div>

      {/* Scroll progress rail */}
      <div
        data-rail
        aria-hidden="true"
        className="pointer-events-none fixed right-5 top-1/2 z-20 hidden h-32 w-px -translate-y-1/2 bg-white/15 min-[1100px]:block"
      >
        <span data-rail-fill className="absolute inset-0 origin-top bg-[#C9B8FF]" />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <section
          data-hero
          aria-labelledby="sponsors-title"
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-36 text-center sm:px-8"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <div className="spx-orbit" style={{ width: "min(120vw, 960px)", height: "min(120vw, 960px)" }}>
              <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
                <circle cx="200" cy="200" r="190" stroke="#A78BFA" strokeOpacity="0.28" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="142" stroke="#A78BFA" strokeOpacity="0.18" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="2.6" fill="#E4D9FF" />
                <circle cx="58" cy="262" r="2" fill="#E4D9FF" />
              </svg>
            </div>
          </div>

          <div data-hero-inner className="relative flex flex-col items-center">
            <p
              data-hero-fade
              className="mb-7 text-[9px] tracking-[0.42em] text-[#B9A9F0]/80 [font-family:var(--font-pixel)] sm:text-[10px] min-[900px]:text-xs"
            >
              TECHXETRA 12th Edition
            </p>

            <h1
              id="sponsors-title"
              className="m-0 text-[clamp(3.2rem,15vw,12.5rem)] font-normal leading-[0.86] tracking-[-0.07em] text-white font-roboto"
            >
              <Rise>Sponsors</Rise>
            </h1>

            <p className="mt-8 max-w-[34rem] text-base leading-8 text-white/60 sm:mt-10 sm:text-lg">
              <Rise>Every star in our sky has a name behind it.</Rise>
              <Rise>These are the ones who made this edition shine.</Rise>
            </p>

            <div data-hero-fade className="mt-14 flex flex-col items-center gap-3">
              <span className="text-[9px] tracking-[0.28em] text-white/40 [font-family:var(--font-pixel)]">SCROLL</span>
              <span className="relative block h-12 w-px overflow-hidden bg-white/15">
                <span className="spx-drip absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent via-[#CDBBFF] to-transparent" />
              </span>
            </div>
          </div>
        </section>

        {/* Partners: one card per category, with a constellation threaded through */}
        <section aria-label="Partners" className="relative px-4 pb-24 pt-10 sm:px-8 lg:px-12 lg:pb-32">
          <div className="mx-auto w-full max-w-[1200px]">
            <div data-pgrid-head className="mb-12 flex items-center justify-center gap-5 sm:mb-16 sm:gap-8">
              <span
                data-rule
                aria-hidden="true"
                className="h-px w-12 origin-right bg-gradient-to-l from-[#B9A2FF]/70 to-transparent sm:w-32 lg:w-56"
              />
              <h2 className="m-0 text-[clamp(1.8rem,5vw,3.4rem)] font-normal uppercase leading-none tracking-[0.04em] text-white [font-family:var(--font-gotham-bold)]">
                <Rise>Partners</Rise>
              </h2>
              <span
                data-rule
                aria-hidden="true"
                className="h-px w-12 origin-left bg-gradient-to-r from-[#B9A2FF]/70 to-transparent sm:w-32 lg:w-56"
              />
            </div>

            <div ref={gridRef} className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <PartnerCard key={g.tier} tier={g.tier} items={g.items} accent={g.accent} />
              ))}
              <ConstellationLinks gridRef={gridRef} />
            </div>
          </div>
        </section>

        {/* Become a partner */}
        <section
          data-partner
          aria-label="Become a sponsor"
          className="relative px-5 pb-20 pt-8 min-[600px]:px-8 min-[900px]:px-12 min-[1200px]:px-16"
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <div
              data-p-fade
              className="rounded-3xl bg-gradient-to-br from-[#A78BFA]/55 via-[#6D28D9]/20 to-[#8B5CF6]/10 p-px shadow-[0_0_70px_rgba(124,58,237,0.16)]"
            >
              <div className="relative overflow-hidden rounded-[23px] bg-[linear-gradient(105deg,#190D2D_0%,#10091E_34%,#080811_66%,#000000_100%)] px-6 py-10 sm:px-12 sm:py-12 lg:px-16">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_300px_at_78%_50%,rgba(75,125,165,0.14),transparent_72%),radial-gradient(420px_240px_at_8%_100%,rgba(139,92,246,0.09),transparent_75%)]"
                />
                <Corners />

                <div className="relative z-[1] grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)] lg:gap-0">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <span className="inline-flex items-center rounded-full border border-[#A78BFA]/40 bg-[#8B5CF6]/10 px-3.5 py-1.5 text-[10px] tracking-[0.2em] text-[#C4B5FD] [font-family:var(--font-pixel)] sm:text-[11px]">
                      BECOME A PARTNER
                    </span>

                    <h3 className="m-0 mt-5 bg-gradient-to-r from-white via-[#DDD6FE] to-[#A78BFA] bg-clip-text text-[clamp(1.9rem,4.4vw,3rem)] font-normal leading-[1.06] tracking-[-0.04em] text-transparent [font-family:var(--font-gotham-bold)]">
                      Build the future with us.
                    </h3>

                    <p className="mt-3 max-w-md text-sm leading-7 text-white/60 sm:text-base">
                      Bring your brand into the next chapter of technology and creativity, and take your place in the
                      constellation.
                    </p>

                    <div className="mt-7">
                      <Button href="/contact">Become a Sponsor</Button>
                    </div>
                  </div>

                  <div aria-hidden="true" className="flex items-center justify-center">
                    <div className="relative aspect-square w-[min(170px,46vw)] lg:w-[190px]">
                      <LogoStatic />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Past sponsors, last */}
        {pastSponsors.length > 0 && (
          <section
            data-past
            aria-label="Past sponsors"
            className="relative px-5 pb-24 pt-8 min-[600px]:px-8 min-[900px]:px-12 min-[1200px]:px-16"
          >
            <div className="mx-auto w-full max-w-[1200px]">
              <div data-late className="mb-8 flex items-center gap-5">
                <h3 className="m-0 text-lg font-normal tracking-tight text-white/85 [font-family:var(--font-gotham-bold)] sm:text-xl">
                  Backed us before
                </h3>
                <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
              </div>

              <div data-late className="space-y-3">
                <Marquee items={pastSponsors} />
                <Marquee items={[...pastSponsors].reverse()} reverse />
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}