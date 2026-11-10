"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { schedule } from "@/data/schedule";

gsap.registerPlugin(ScrollTrigger);

/* Angle between neighbouring nodes on the side wheel. */
const STEP = 11;

/* Each day gets its own accent and tint. */
const DAY_THEMES = [
  { accent: "#55DFFF", soft: "rgba(85,223,255,0.16)", bg: "#050b1c", glow: "rgba(85,223,255,0.2)" },
  { accent: "#B3A4FF", soft: "rgba(179,164,255,0.16)", bg: "#0b0719", glow: "rgba(179,164,255,0.2)" },
  { accent: "#6FF0C8", soft: "rgba(111,240,200,0.14)", bg: "#04110f", glow: "rgba(111,240,200,0.18)" },
];

/* ------------------------------------------------------------------ */
/* Constellation field (canvas, depth parallax, pointer links)         */
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
          ctx.strokeStyle = `rgba(160,200,255,${alpha.toFixed(3)})`;
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
          ctx.strokeStyle = `rgba(205,228,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.55 * n.z) * twinkle;
        ctx.fillStyle = `rgba(225,238,255,${alpha.toFixed(3)})`;
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
      if (reduce || raf) return;
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
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const STAR_PATH = "M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z";

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

const css = `
.sch-rail{--R:230px;--rail-x:28px;--item:14px}
@media (min-width:600px){.sch-rail{--R:330px;--rail-x:46px;--item:18px}}
@media (min-width:1000px){.sch-rail{--R:430px;--rail-x:56px;--item:22px}}

.sch-item{-webkit-tap-highlight-color:transparent}
.sch-item::after{content:"";position:absolute;inset:-12px;border-radius:9999px}
.sch-item:focus-visible{outline:2px solid var(--accent);outline-offset:8px;border-radius:9999px}
.sch-dot{display:block;width:100%;height:100%;color:rgba(190,214,255,.5);transform:scale(.72);
  transition:transform .6s cubic-bezier(.22,1,.36,1),color .5s ease,filter .5s ease}
.sch-item:hover .sch-dot{color:rgba(220,235,255,.9)}
.sch-item[data-active="true"] .sch-dot{color:var(--accent);transform:scale(1.4);filter:drop-shadow(0 0 8px var(--accent))}
.sch-pulse{position:absolute;inset:-6px;border-radius:9999px;border:1px solid var(--accent);opacity:0;pointer-events:none}
.sch-item[data-active="true"] .sch-pulse{animation:sch-pulse 2.8s ease-out infinite}
.sch-label{display:none;position:absolute;left:calc(100% + 16px);top:50%;transform:translateY(-50%);white-space:nowrap;
  font-size:10px;letter-spacing:.14em;color:rgba(200,218,255,.45);transition:color .5s ease,opacity .5s ease}
@media (min-width:1000px){.sch-label{display:block}}
.sch-item[data-active="true"] .sch-label{color:var(--accent)}

.sch-marker svg{color:rgba(190,214,255,.5);transform:scale(.85);
  transition:transform .6s cubic-bezier(.22,1,.36,1),color .5s ease,filter .5s ease}
.sch-marker[data-active="true"] svg{color:var(--accent);transform:scale(1.55);filter:drop-shadow(0 0 9px var(--accent))}

.sch-card{position:relative;border:1px solid rgba(190,214,255,.12);border-radius:18px;
  background:linear-gradient(180deg,rgba(14,20,38,.86),rgba(6,9,18,.86));
  transform-style:preserve-3d;transition:border-color .5s ease,box-shadow .5s ease}
.sch-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s ease;
  background:radial-gradient(280px circle at var(--mx,70%) var(--my,0%),var(--accent-soft),transparent 70%)}
.sch-card:hover::before{opacity:1}
.sch-card::after{content:"";position:absolute;left:28px;right:28px;top:0;height:1px;pointer-events:none;opacity:.55;
  background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.sch-card[data-active="true"]{border-color:color-mix(in srgb,var(--accent) 50%,transparent);
  box-shadow:0 30px 70px -32px rgba(0,0,0,.9),0 0 60px -24px var(--accent)}

.sch-tab{position:relative;border-radius:16px;text-align:left;border:1px solid rgba(190,214,255,.14);
  background:rgba(6,10,22,.72);transition:border-color .4s ease,background .4s ease,transform .5s cubic-bezier(.22,1,.36,1)}
.sch-tab:hover{border-color:rgba(190,214,255,.32);transform:translateY(-2px)}
.sch-tab:focus-visible{outline:2px solid currentColor;outline-offset:4px}

.sch-float{animation:sch-float 9s ease-in-out infinite}
.sch-orbit{animation:sch-orbit 140s linear infinite}
.sch-cue-dot{animation:sch-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}
.sch-day-enter{animation:sch-enter .6s cubic-bezier(.22,1,.36,1) both}

@keyframes sch-pulse{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.9);opacity:0}}
@keyframes sch-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}
@keyframes sch-orbit{to{transform:rotate(360deg)}}
@keyframes sch-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}
@keyframes sch-enter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}

@media (prefers-reduced-motion:reduce){
  .sch-float,.sch-orbit,.sch-cue-dot,.sch-day-enter,.sch-item[data-active="true"] .sch-pulse{animation:none!important}
  .sch-dot,.sch-marker svg,.sch-card,.sch-tab{transition:none!important}
}
`;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState(schedule[0].id);

  const rootRef = useRef<HTMLElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const switched = useRef(false);

  const dayIndex = Math.max(
    0,
    schedule.findIndex((day) => day.id === activeDay),
  );
  const currentDay = schedule[dayIndex] ?? schedule[0];
  const theme = DAY_THEMES[dayIndex % DAY_THEMES.length];

  const selectDay = (id: string) => {
    if (id === activeDay) return;
    switched.current = true;
    setActiveDay(id);
  };

  /* ---------- page level: hero, backdrop blend, closing ---------- */

  useLayoutEffect(() => {
    const root = rootRef.current;
    const tint = tintRef.current;
    if (!root || !tint) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const daysEl = root.querySelector<HTMLElement>("[data-days]");
    if (!daysEl) return;

    let top = 0;
    let vh = window.innerHeight;
    let lastBlend = -1;
    const smooth = { y: window.scrollY };

    const measure = () => {
      vh = window.innerHeight;
      top = daysEl.getBoundingClientRect().top + window.scrollY;
    };

    const render = () => {
      const p = Math.min(1, Math.max(0, (smooth.y - (top - vh * 0.95)) / (vh * 0.77)));
      const blend = p * p * (3 - 2 * p);
      if (Math.abs(blend - lastBlend) > 0.002) {
        lastBlend = blend;
        tint.style.opacity = blend.toFixed(3);
      }
    };

    const tick = (_time: number, deltaTime: number) => {
      const diff = window.scrollY - smooth.y;
      if (Math.abs(diff) < 0.05) {
        if (diff !== 0) {
          smooth.y = window.scrollY;
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
    void document.fonts.ready.then(onResize);

    const media = gsap.matchMedia();

    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
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

        const intro = root.querySelector<HTMLElement>("[data-intro]");
        if (intro) {
          gsap.fromTo(
            Array.from(intro.children),
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              stagger: 0.12,
              scrollTrigger: {
                trigger: intro,
                start: "top 92%",
                end: "top 55%",
                scrub: 0.8,
              },
            },
          );
        }

        const cta = root.querySelector<HTMLElement>("[data-cta]");
        if (cta) {
          gsap.fromTo(
            Array.from(cta.querySelectorAll("[data-cta-line]")),
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              ease: "none",
              stagger: 0.2,
              scrollTrigger: { trigger: cta, start: "top 92%", end: "top 45%", scrub: 1 },
            },
          );
          gsap.fromTo(
            Array.from(cta.querySelectorAll("[data-cta-item]")),
            { y: 28, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              stagger: 0.14,
              scrollTrigger: { trigger: cta, start: "top 90%", end: "top 50%", scrub: 0.8 },
            },
          );
        }
      },
      root,
    );

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", onResize);
      media.revert();
    };
  }, []);

  /* ---------- timeline level: wheel sync, card choreography ---------- */

  useLayoutEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    const wheel = wheelRef.current;
    const timeline = timelineRef.current;
    const progress = progressRef.current;
    if (!root || !rail || !wheel || !timeline || !progress) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-row]"));
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-card]"));
    const markers = Array.from(root.querySelectorAll<HTMLElement>("[data-marker]"));
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-rail-item]"));
    const count = rows.length;

    if (switched.current) {
      switched.current = false;
      const head = root.querySelector<HTMLElement>("[data-day-head]");
      if (head) {
        const rect = head.getBoundingClientRect();
        if (rect.top < 0) {
          window.scrollTo({ top: rect.top + window.scrollY - 96, behavior: "auto" });
        }
      }
    }

    let centers: number[] = [];
    let tTop = 0;
    let tBottom = 0;
    let vh = window.innerHeight;
    let active = -1;
    let lastPosition = Number.NaN;
    let lastRail = -1;
    const smooth = { y: window.scrollY };

    const measure = () => {
      vh = window.innerHeight;
      const scrollY = window.scrollY;
      centers = rows.map((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top + scrollY + rect.height / 2;
      });
      const tr = timeline.getBoundingClientRect();
      tTop = tr.top + scrollY;
      tBottom = tr.bottom + scrollY;
    };

    const setActive = (index: number) => {
      if (index === active) return;
      active = index;
      for (let i = 0; i < count; i += 1) {
        const on = i === index;
        const v = on ? "true" : "false";
        if (items[i]) {
          items[i].dataset.active = v;
          if (on) items[i].setAttribute("aria-current", "true");
          else items[i].removeAttribute("aria-current");
        }
        if (markers[i]) markers[i].dataset.active = v;
        if (cards[i]) cards[i].dataset.active = v;
      }
    };

    const render = () => {
      if (!count || centers.length !== count) return;
      const y = smooth.y + vh * 0.5;

      let position = 0;
      if (count > 1) {
        if (y <= centers[0]) position = 0;
        else if (y >= centers[count - 1]) position = count - 1;
        else {
          for (let i = 0; i < count - 1; i += 1) {
            if (y < centers[i + 1]) {
              position = i + (y - centers[i]) / Math.max(centers[i + 1] - centers[i], 1);
              break;
            }
          }
        }
      }

      if (!(Math.abs(position - lastPosition) < 0.0005)) {
        lastPosition = position;
        wheel.style.setProperty("--rot", `${(-position * STEP).toFixed(3)}deg`);
      }

      const fadeIn = Math.min(1, Math.max(0, (smooth.y + vh * 0.75 - tTop) / (vh * 0.3)));
      const fadeOut = Math.min(1, Math.max(0, (tBottom - (smooth.y + vh * 0.35)) / (vh * 0.3)));
      const vis = Math.min(fadeIn, fadeOut);

      if (Math.abs(vis - lastRail) > 0.003) {
        lastRail = vis;
        rail.style.setProperty("--rail", vis.toFixed(3));
        rail.style.visibility = vis < 0.02 ? "hidden" : "visible";
      }

      setActive(Math.min(count - 1, Math.max(0, Math.round(position))));
    };

    const tick = (_time: number, deltaTime: number) => {
      const diff = window.scrollY - smooth.y;
      if (Math.abs(diff) < 0.05) {
        if (diff !== 0) {
          smooth.y = window.scrollY;
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
    sizeObserver.observe(timeline);
    rows.forEach((row) => sizeObserver.observe(row));
    void document.fonts.ready.then(onResize);

    const media = gsap.matchMedia();

    media.add(
      {
        wide: "(min-width: 1024px)",
        fine: "(hover: hover) and (pointer: fine)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const wide = Boolean(context.conditions?.wide);
        const fine = Boolean(context.conditions?.fine);
        const reduced = Boolean(context.conditions?.reduced);
        const cleanups: Array<() => void> = [];

        if (reduced) {
          gsap.set(progress, { scaleY: 1, transformOrigin: "top center" });
          return;
        }

        gsap.fromTo(
          progress,
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: timeline,
              start: "top 62%",
              end: "bottom 45%",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
          },
        );

        const head = root.querySelector<HTMLElement>("[data-day-head]");
        if (head) {
          gsap.fromTo(
            Array.from(head.children),
            { y: 26, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              stagger: 0.1,
              scrollTrigger: {
                trigger: head,
                start: "top 92%",
                end: "top 58%",
                scrub: 0.7,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        rows.forEach((row, index) => {
          const wrap = row.querySelector<HTMLElement>("[data-card-wrap]");
          const card = row.querySelector<HTMLElement>("[data-card]");
          if (!wrap || !card) return;

          const parts = Array.from(card.querySelectorAll<HTMLElement>("[data-part]"));
          const fromLeft = wide ? index % 2 === 0 : true;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: row,
              start: "top 93%",
              end: "top 48%",
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          });

          tl.fromTo(
            wrap,
            {
              x: wide ? (fromLeft ? -90 : 90) : -34,
              y: 54,
              rotationY: wide ? (fromLeft ? 18 : -18) : 0,
              rotationX: 8,
              transformPerspective: 1100,
              opacity: 0,
            },
            { x: 0, y: 0, rotationY: 0, rotationX: 0, opacity: 1, ease: "power2.out" },
            0,
          ).fromTo(
            parts,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, ease: "power2.out", stagger: 0.08 },
            0.12,
          );

          if (fine) {
            gsap.set(card, { transformPerspective: 1000 });
            const rx = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
            const ry = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });

            const onMove = (event: PointerEvent) => {
              const rect = card.getBoundingClientRect();
              const px = (event.clientX - rect.left) / rect.width;
              const py = (event.clientY - rect.top) / rect.height;
              card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
              card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
              ry((Math.max(0, Math.min(1, px)) - 0.5) * 9);
              rx((Math.max(0, Math.min(1, py)) - 0.5) * -8);
            };

            const onLeave = () => {
              rx(0);
              ry(0);
            };

            card.addEventListener("pointermove", onMove, { passive: true });
            card.addEventListener("pointerleave", onLeave);
            cleanups.push(() => {
              card.removeEventListener("pointermove", onMove);
              card.removeEventListener("pointerleave", onLeave);
            });
          }
        });

        return () => cleanups.forEach((fn) => fn());
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

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      sizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
      media.revert();
    };
  }, [activeDay]);

  const goToEvent = (index: number) => {
    const row = rootRef.current?.querySelectorAll<HTMLElement>("[data-row]")[index];
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: rect.top + window.scrollY + rect.height / 2 - window.innerHeight / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const rootStyle = {
    "--accent": theme.accent,
    "--accent-soft": theme.soft,
  } as CSSProperties;

  return (
    <section
      ref={rootRef}
      style={rootStyle}
      className="relative isolate overflow-x-clip bg-black text-[#F2F5FF] [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 36%, #0a1228 0%, #04060f 52%, #000000 100%)",
            }}
          />

          <div ref={tintRef} className="absolute inset-0" style={{ opacity: 0 }}>
            {schedule.map((day, i) => {
              const t = DAY_THEMES[i % DAY_THEMES.length];
              return (
                <div
                  key={day.id}
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{
                    opacity: day.id === activeDay ? 1 : 0,
                    backgroundColor: t.bg,
                    backgroundImage: `radial-gradient(ellipse at 72% 40%, ${t.glow} 0%, transparent 68%)`,
                  }}
                />
              );
            })}
          </div>

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 36%, rgba(0,0,0,0.18) 64%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)",
            }}
          />

          <ConstellationField />
        </div>
      </div>

      {/* Side wheel */}
      <nav aria-label="Schedule position" className="pointer-events-none absolute inset-0 z-20">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            ref={railRef}
            className="sch-rail absolute inset-0"
            style={{
              opacity: "var(--rail, 0)",
              visibility: "hidden",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
            }}
          >
            <div
              ref={wheelRef}
              className="absolute will-change-transform"
              style={{
                width: "calc(var(--R) * 2)",
                height: "calc(var(--R) * 2)",
                left: "calc(var(--rail-x) - var(--R) * 2)",
                top: "calc(50% - var(--R))",
                transform: "rotate(var(--rot, 0deg))",
              }}
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px solid rgba(190,210,255,0.16)",
                  background: "radial-gradient(circle, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)",
                }}
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(190,214,255,0.5) 0deg 0.3deg, transparent 0.3deg 2.2deg)",
                  WebkitMaskImage:
                    "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px), #000 calc(100% - 9px), transparent calc(100% - 9px))",
                  maskImage:
                    "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px), #000 calc(100% - 9px), transparent calc(100% - 9px))",
                }}
              />
              <span
                className="absolute rounded-full"
                style={{
                  inset: "calc(var(--item) * 2)",
                  border: "1px dashed rgba(190,210,255,0.1)",
                }}
              />

              {currentDay.events.map((event, index) => (
                <span
                  key={`${event.id}-fan`}
                  className="absolute h-px"
                  style={{
                    width: "clamp(100px, 18vw, 260px)",
                    left: "50%",
                    top: "50%",
                    transformOrigin: "0 50%",
                    transform: `rotate(${index * STEP}deg) translateX(calc(var(--R) + var(--item) * 1.4))`,
                    background: "linear-gradient(90deg, rgba(190,214,255,0.22), rgba(190,214,255,0))",
                  }}
                />
              ))}

              {currentDay.events.map((event, index) => {
                const angle = index * STEP;
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-rail-item
                    data-active={index === 0 ? "true" : "false"}
                    aria-label={`Go to ${event.title}`}
                    onClick={() => goToEvent(index)}
                    className="sch-item pointer-events-auto absolute cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none"
                    style={{
                      width: "var(--item)",
                      height: "var(--item)",
                      left: "calc(50% - var(--item) / 2)",
                      top: "calc(50% - var(--item) / 2)",
                      transform: `rotate(${angle}deg) translateX(var(--R)) rotate(${-angle}deg) rotate(calc(var(--rot, 0deg) * -1))`,
                    }}
                  >
                    <span className="sch-pulse" />
                    <StarGlyph className="sch-dot" />
                    <span className="sch-label font-pixel">{event.time}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        {/* Hero */}
        <header
          data-hero
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-40 text-center sm:px-8 sm:pt-32"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="sch-orbit" style={{ width: "min(120vw, 980px)", height: "min(120vw, 980px)" }}>
              <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
                <circle cx="200" cy="200" r="190" stroke="#8FB4FF" strokeOpacity="0.28" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="142" stroke="#8FB4FF" strokeOpacity="0.2" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="3" fill="#CFE0FF" />
                <circle cx="58" cy="262" r="2.2" fill="#CFE0FF" />
              </svg>
            </div>
          </div>

          <div data-hero-inner className="relative flex flex-col items-center">
            <p className="mb-6 font-pixel text-[8px] tracking-[0.42em] text-[#A9B5E8]/75 sm:mb-8 sm:text-[10px] min-[900px]:text-xs">
              TECHXETRA 12th Edition
            </p>

            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 select-none bg-gradient-to-b from-white via-[#C9C9D2] to-[#626574] bg-clip-text text-[clamp(3.4rem,16vw,14rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent opacity-30 blur-[18px]"
              >
                SCHEDULE
              </span>
              <h1 className="relative m-0 bg-gradient-to-b from-[#FFFFFF] via-[#D4D5DE] to-[#5E6272] bg-clip-text text-[clamp(3.4rem,16vw,14rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent [font-family:var(--font-gotham-bold)]">
                SCHEDULE
              </h1>
            </div>

            <p className="mt-9 max-w-[560px] font-pixel text-[10px] leading-[2] tracking-[0.14em] text-[#A9B5E8]/80 sm:mt-11 sm:text-xs min-[900px]:text-sm">
              THREE DAYS OF TECHNOLOGY, CREATIVITY AND INNOVATION.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
              {schedule.map((day, i) => (
                <Fragment key={day.id}>
                  <span className="font-pixel text-[10px] tracking-[0.2em] text-[#BFD4FF]/85">{day.date}</span>
                  {i < schedule.length - 1 && (
                    <StarGlyph className="h-2.5 w-2.5 text-[#8FB4FF]/60" />
                  )}
                </Fragment>
              ))}
            </div>

            <div className="mt-12 flex flex-col items-center gap-3 sm:mt-14">
              <span className="font-pixel text-[9px] tracking-[0.26em] text-white/45">SCROLL TO EXPLORE</span>
              <span className="relative block h-12 w-px overflow-hidden bg-white/15">
                <span className="sch-cue-dot absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent via-[#BFD4FF] to-transparent" />
              </span>
            </div>
          </div>
        </header>

        {/* Days and timeline */}
        <div
          data-days
          className="mx-auto w-full max-w-[1320px] pb-16 pl-[60px] pr-4 pt-10 min-[600px]:pl-[104px] min-[600px]:pr-8 min-[1000px]:pl-[176px] min-[1000px]:pr-12 sm:pt-16"
        >
          <div data-intro className="mb-10 sm:mb-14">
            <p className="flex items-center gap-3 font-pixel text-[9px] tracking-[0.24em] text-[var(--accent)] sm:text-[10px]">
              <StarGlyph className="h-3 w-3" />
              CHOOSE A DAY
            </p>
            <div
              role="group"
              aria-label="Select day"
              className="mt-5 grid gap-2 sm:gap-4"
              style={{ gridTemplateColumns: `repeat(${schedule.length}, minmax(0, 1fr))` }}
            >
              {schedule.map((day, i) => {
                const selected = activeDay === day.id;
                const t = DAY_THEMES[i % DAY_THEMES.length];

                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => selectDay(day.id)}
                    aria-pressed={selected}
                    className="sch-tab px-3 py-4 sm:px-6 sm:py-5"
                    style={{
                      color: t.accent,
                      borderColor: selected ? t.accent : undefined,
                      background: selected
                        ? `linear-gradient(160deg, ${t.soft}, rgba(6,10,22,0.85))`
                        : undefined,
                      boxShadow: selected ? `0 0 48px -22px ${t.accent}` : undefined,
                    }}
                  >
                    <span className="block font-pixel text-[10px] uppercase tracking-[0.16em] sm:text-xs">
                      {day.date}
                    </span>
                    <span className="mt-2 block text-base text-white [font-family:var(--font-gotham-bold)] sm:text-lg lg:text-xl">
                      {day.label}
                    </span>
                    <span
                      className={`mt-2 hidden text-xs leading-5 sm:block ${selected ? "text-white/75" : "text-white/50"}`}
                    >
                      {day.theme}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div key={currentDay.id} className="sch-day-enter">
            <div data-day-head className="mb-12 sm:mb-16">
              <p className="flex items-center gap-3 font-pixel text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] sm:text-xs">
                <StarGlyph className="h-3 w-3" />
                {currentDay.date}
              </p>
              <h2
                className="mt-4 max-w-[18ch] text-balance text-[clamp(2.2rem,8vw,4.6rem)] font-normal leading-[1.04] tracking-[-0.035em] text-white [font-family:var(--font-gotham-bold)]"
                style={{ textShadow: "0 0 70px var(--accent-soft)" }}
              >
                {currentDay.theme}
              </h2>
              <p className="mt-4 max-w-[48ch] text-sm leading-7 text-white/65 sm:text-base">
                Follow the line through the day. Each star is a session.
              </p>
            </div>

            <div ref={timelineRef} className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-[0.625rem] top-0 w-px bg-white/12 lg:left-1/2 lg:-translate-x-1/2"
              >
                <div
                  ref={progressRef}
                  className="absolute inset-0 origin-top"
                  style={{
                    background: "linear-gradient(to bottom, var(--accent), rgba(255,255,255,0.45))",
                    boxShadow: "0 0 12px var(--accent-soft)",
                  }}
                />
              </div>

              <div className="space-y-8 sm:space-y-10 lg:space-y-14">
                {currentDay.events.map((event, index) => {
                  const reverse = index % 2 === 1;

                  return (
                    <div
                      key={event.id}
                      data-row
                      className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] lg:gap-x-0"
                    >
                      <div
                        data-marker
                        data-active="false"
                        aria-hidden="true"
                        className="sch-marker relative z-10 col-start-1 row-start-1 flex justify-center pt-[26px] lg:col-start-2"
                      >
                        <StarGlyph className="h-4 w-4" />
                        <span
                          className="absolute top-[34px] hidden h-px lg:block"
                          style={
                            reverse
                              ? { left: "50%", width: "50%", background: "linear-gradient(90deg, var(--accent), transparent)", opacity: 0.5 }
                              : { left: 0, width: "50%", background: "linear-gradient(90deg, transparent, var(--accent))", opacity: 0.5 }
                          }
                        />
                      </div>

                      <div
                        data-card-wrap
                        className={`col-start-2 row-start-1 min-w-0 ${
                          reverse ? "lg:col-start-3 lg:pl-8" : "lg:col-start-1 lg:pr-8"
                        }`}
                      >
                        <article data-card data-active="false" className="sch-card p-5 sm:p-7 lg:p-8">
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-5 top-5 text-[var(--accent)] opacity-60"
                            style={{ transform: "translateZ(40px)" }}
                          >
                            <StarGlyph className="sch-float h-3 w-3" />
                          </span>

                          <div data-part className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-8">
                            <span className="font-pixel text-xl leading-none text-white sm:text-2xl">{event.time}</span>
                            <span className="font-pixel text-[11px] tracking-[0.12em] text-white/55 sm:text-xs">
                              TO {event.endTime}
                            </span>
                          </div>

                          <p
                            data-part
                            className="mt-4 inline-block border px-2.5 py-1 font-pixel text-[9px] uppercase tracking-[0.18em] text-[var(--accent)] sm:text-[10px]"
                            style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)" }}
                          >
                            {event.category}
                          </p>

                          <h3
                            data-part
                            className="mt-4 break-words text-[1.35rem] leading-[1.2] tracking-[-0.02em] text-white [font-family:var(--font-gotham-bold)] sm:text-2xl lg:text-[1.75rem]"
                          >
                            {event.title}
                          </h3>

                          <p data-part className="mt-3 max-w-[58ch] text-[14px] leading-[1.75] text-white/75 sm:text-[15px]">
                            {event.description}
                          </p>

                          <div
                            data-part
                            className="mt-5 flex items-start gap-2.5 border-t border-white/10 pt-4 text-[13px] leading-6 text-white/80 sm:text-sm"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                            >
                              <path
                                d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            <span className="min-w-0 break-words">{event.venue}</span>
                          </div>
                        </article>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Closing */}
          <div data-cta className="mt-28 text-center sm:mt-36 lg:mt-44">
            <svg
              aria-hidden="true"
              viewBox="0 0 320 70"
              fill="none"
              className="mx-auto mb-8 h-14 w-64 overflow-visible sm:w-80"
            >
              <path data-cta-line d="M10 52 L90 20 L170 44 L250 14 L310 36" pathLength={1} stroke="var(--accent)" strokeOpacity="0.6" strokeDasharray="1" strokeDashoffset="1" />
              {[
                [10, 52],
                [90, 20],
                [170, 44],
                [250, 14],
                [310, 36],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.8" fill="#EAF2FF" />
              ))}
            </svg>

            <h2
              data-cta-item
              className="font-pixel text-2xl leading-relaxed text-[var(--accent)] sm:text-3xl lg:text-4xl"
            >
              See you at TechXetra.
            </h2>
            <p
              data-cta-item
              className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/65 sm:text-base"
            >
              Three days. New ideas. One shared future.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}