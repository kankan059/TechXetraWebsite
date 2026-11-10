"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { events } from "@/data/info/event";

gsap.registerPlugin(ScrollTrigger);

/* Angle between neighbouring items on the side wheel. */
const STEP = 15;

/* ------------------------------------------------------------------ */
/* Static helpers                                                      */
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

/* A small hand-placed-looking star figure that sits behind each poster. */
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
/* Scoped styles                                                       */
/* ------------------------------------------------------------------ */

const css = `
.evx-rail{--R:230px;--rail-x:34px;--item:38px}
@media (min-width:600px){.evx-rail{--R:330px;--rail-x:50px;--item:52px}}
@media (min-width:1000px){.evx-rail{--R:430px;--rail-x:72px;--item:64px}}

.evx-item{-webkit-tap-highlight-color:transparent}
.evx-item::after{content:"";position:absolute;inset:-8px;border-radius:9999px}
.evx-item:focus-visible{outline:2px solid var(--accent);outline-offset:6px}
.evx-thumb{
  transform:scale(.74);opacity:.55;filter:saturate(.55) brightness(.8);
  border-color:rgba(200,215,255,.25);
  transition:transform .6s cubic-bezier(.22,1,.36,1),opacity .5s ease,filter .5s ease,border-color .5s ease,box-shadow .5s ease;
}
.evx-item:hover .evx-thumb{opacity:.85;filter:saturate(.9) brightness(.95)}
.evx-item[data-active="true"] .evx-thumb{
  transform:scale(1.2);opacity:1;filter:none;border-color:var(--accent);
  box-shadow:0 0 0 4px rgba(0,0,0,.5),0 0 34px -4px var(--accent);
}
.evx-pulse{position:absolute;inset:-6px;border-radius:9999px;border:1px solid var(--accent);opacity:0;pointer-events:none}
.evx-item[data-active="true"] .evx-pulse{animation:evx-pulse 2.8s ease-out infinite}

.evx-cta-fill{transform:scaleX(0);transform-origin:left;transition:transform .5s cubic-bezier(.22,1,.36,1)}
.evx-cta:hover .evx-cta-fill,.evx-cta:focus-visible .evx-cta-fill{transform:scaleX(1)}

.evx-float{animation:evx-float 9s ease-in-out infinite}
.evx-orbit{animation:evx-orbit 140s linear infinite}
.evx-cue-dot{animation:evx-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}

@keyframes evx-pulse{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.6);opacity:0}}
@keyframes evx-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-10px,0)}}
@keyframes evx-orbit{to{transform:rotate(360deg)}}
@keyframes evx-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}

@media (prefers-reduced-motion:reduce){
  .evx-float,.evx-orbit,.evx-cue-dot,.evx-item[data-active="true"] .evx-pulse{animation:none!important}
  .evx-thumb,.evx-cta-fill{transition:none!important}
}
`;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Events() {
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const figures = useMemo(() => events.map((_, index) => makeFigure(index)), []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    const wheel = wheelRef.current;
    if (!root || !rail || !wheel) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const eventSections = Array.from(root.querySelectorAll<HTMLElement>("[data-event-section]"));
    const worldEls = Array.from(root.querySelectorAll<HTMLElement>("[data-event-world]"));
    const itemEls = Array.from(root.querySelectorAll<HTMLElement>("[data-rail-item]"));

    /* ---------- scroll driven colour blend and side wheel ---------- */

    let tops: number[] = [];
    let vh = window.innerHeight;
    let activeIndex = -1;
    let lastRotation = Number.NaN;
    let lastRail = -1;
    const lastWorld: number[] = worldEls.map(() => -1);
    const smooth = { y: window.scrollY };

    const measure = () => {
      vh = window.innerHeight;
      const scrollY = window.scrollY;
      tops = eventSections.map((section) => section.getBoundingClientRect().top + scrollY);
    };

    const setActive = (index: number) => {
      if (index === activeIndex) return;
      activeIndex = index;
      itemEls.forEach((item, i) => {
        const on = i === index;
        item.dataset.active = on ? "true" : "false";
        if (on) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      const accent = events[index]?.accent;
      if (accent) root.style.setProperty("--accent", accent);
    };

    const render = () => {
      if (!tops.length) return;
      const y = smooth.y;
      let total = 0;
      let first = 0;

      for (let j = 0; j < tops.length; j += 1) {
        const start = tops[j] - vh * 0.95;
        const end = tops[j] - vh * 0.18;
        const p = Math.min(1, Math.max(0, (y - start) / Math.max(end - start, 1)));
        const blend = p * p * (3 - 2 * p);
        total += blend;
        if (j === 0) first = blend;

        if (Math.abs(blend - lastWorld[j]) > 0.002) {
          lastWorld[j] = blend;
          worldEls[j].style.opacity = blend.toFixed(3);
        }
      }

      const position = Math.max(total - 1, 0);

      if (!(Math.abs(position - lastRotation) < 0.0005)) {
        lastRotation = position;
        wheel.style.setProperty("--rot", `${(-position * STEP).toFixed(3)}deg`);
      }

      if (Math.abs(first - lastRail) > 0.003) {
        lastRail = first;
        rail.style.setProperty("--rail", first.toFixed(3));
        rail.style.visibility = first < 0.02 ? "hidden" : "visible";
      }

      setActive(Math.min(events.length - 1, Math.max(0, Math.round(position))));
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
    eventSections.forEach((section) => sizeObserver.observe(section));
    void document.fonts.ready.then(onResize);

    /* ---------- section choreography ---------- */

    const media = gsap.matchMedia();

    media.add(
      {
        desktop: "(min-width: 900px)",
        fine: "(hover: hover) and (pointer: fine)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const desktop = Boolean(context.conditions?.desktop);
        const fine = Boolean(context.conditions?.fine);
        const reduced = Boolean(context.conditions?.reduced);
        const cleanups: Array<() => void> = [];

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

        eventSections.forEach((section) => {
          const copy = section.querySelector<HTMLElement>("[data-event-copy]");
          const poster = section.querySelector<HTMLElement>("[data-event-poster]");
          if (!copy || !poster) return;

          const parts = Array.from(copy.children) as HTMLElement[];

          gsap.fromTo(
            parts,
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
                end: "top 28%",
                scrub: desktop ? 1.1 : 0.7,
                invalidateOnRefresh: true,
              },
            },
          );

          gsap.fromTo(
            poster,
            {
              x: desktop ? 150 : 60,
              y: desktop ? 60 : 36,
              scale: desktop ? 0.84 : 0.9,
              rotationY: desktop ? -34 : -18,
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
                trigger: section,
                start: "top 90%",
                end: "top 26%",
                scrub: desktop ? 1.2 : 0.8,
                invalidateOnRefresh: true,
              },
            },
          );

          const lines = Array.from(section.querySelectorAll<SVGPathElement>("[data-figure-line]"));
          const nodes = Array.from(section.querySelectorAll<SVGCircleElement>("[data-figure-node]"));

          if (lines.length) {
            gsap.fromTo(
              lines,
              { strokeDashoffset: 1 },
              {
                strokeDashoffset: 0,
                ease: "none",
                stagger: 0.15,
                scrollTrigger: {
                  trigger: section,
                  start: "top 80%",
                  end: "top 20%",
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
                  trigger: section,
                  start: "top 80%",
                  end: "top 24%",
                  scrub: 1,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          const tilt = section.querySelector<HTMLElement>("[data-tilt]");
          const stage = section.querySelector<HTMLElement>("[data-tilt-stage]");

          if (fine && tilt && stage) {
            const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.8, ease: "power3.out" });
            const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.8, ease: "power3.out" });

            const onMove = (event: PointerEvent) => {
              const rect = stage.getBoundingClientRect();
              const px = (event.clientX - rect.left) / rect.width - 0.5;
              const py = (event.clientY - rect.top) / rect.height - 0.5;
              ry(Math.max(-1, Math.min(1, px)) * 14);
              rx(Math.max(-1, Math.min(1, py)) * -12);
            };

            const onLeave = () => {
              rx(0);
              ry(0);
            };

            section.addEventListener("pointermove", onMove, { passive: true });
            section.addEventListener("pointerleave", onLeave);

            cleanups.push(() => {
              section.removeEventListener("pointermove", onMove);
              section.removeEventListener("pointerleave", onLeave);
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

    const refreshObserver = new ResizeObserver(scheduleRefresh);
    eventSections.forEach((section) => refreshObserver.observe(section));

    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      refreshObserver.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
      media.revert();
    };
  }, []);

  const goTo = (id: string) => {
    const target = rootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const rootStyle = { "--accent": events[0]?.accent ?? "#A9C9F5" } as CSSProperties;

  return (
    <main
      ref={rootRef}
      style={rootStyle}
      className="relative isolate min-h-svh overflow-x-clip bg-black text-[#F5F0DE] [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop: black hero field, event colour worlds, dark grade, stars */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 36%, #0a1228 0%, #04060f 52%, #000000 100%)",
            }}
          />

          {events.map((event) => (
            <div
              key={event.id}
              data-event-world
              className="absolute inset-0 will-change-[opacity]"
              style={{
                opacity: 0,
                backgroundColor: event.background,
                backgroundImage: `radial-gradient(ellipse at 74% 46%, ${event.accentSoft} 0%, transparent 70%)`,
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

      {/* Side wheel: rotates with scroll, active item sits on the right edge of the arc */}
      <nav
        aria-label="Event navigator"
        className="pointer-events-none absolute inset-0 z-20"
      >
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            ref={railRef}
            className="evx-rail absolute inset-0"
            style={{
              opacity: "var(--rail, 0)",
              visibility: "hidden",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)",
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
                  background:
                    "radial-gradient(circle, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%)",
                }}
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(190,214,255,0.5) 0deg 0.35deg, transparent 0.35deg 3deg)",
                  WebkitMaskImage:
                    "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px), #000 calc(100% - 9px), transparent calc(100% - 9px))",
                  maskImage:
                    "radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px), #000 calc(100% - 9px), transparent calc(100% - 9px))",
                }}
              />
              <span
                className="absolute rounded-full"
                style={{
                  inset: "calc(var(--item) * 1.05)",
                  border: "1px dashed rgba(190,210,255,0.1)",
                }}
              />

              {events.map((event, index) => (
                <span
                  key={`${event.id}-fan`}
                  className="absolute h-px"
                  style={{
                    width: "clamp(120px, 22vw, 320px)",
                    left: "50%",
                    top: "50%",
                    transformOrigin: "0 50%",
                    transform: `rotate(${index * STEP}deg) translateX(calc(var(--R) + var(--item) * 0.8))`,
                    background:
                      "linear-gradient(90deg, rgba(190,214,255,0.28), rgba(190,214,255,0))",
                  }}
                />
              ))}

              {events.map((event, index) => {
                const angle = index * STEP;
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-rail-item
                    data-active={index === 0 ? "true" : "false"}
                    aria-label={`Go to ${event.name}`}
                    onClick={() => goTo(event.id)}
                    className="evx-item pointer-events-auto absolute cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none"
                    style={{
                      width: "var(--item)",
                      height: "var(--item)",
                      left: "calc(50% - var(--item) / 2)",
                      top: "calc(50% - var(--item) / 2)",
                      transform: `rotate(${angle}deg) translateX(var(--R)) rotate(${-angle}deg) rotate(calc(var(--rot, 0deg) * -1))`,
                    }}
                  >
                    <span className="evx-pulse" />
                    <span className="evx-thumb relative block h-full w-full overflow-hidden rounded-full border bg-black/80">
                      {event.image ? (
                        <Image
                          src={event.image}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[13px] text-white/80 [font-family:var(--font-gotham-bold)]">
                          {event.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        {/* Hero: black field with the constellation as the main subject */}
        <section
          data-hero
          aria-labelledby="events-page-title"
          className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-40 text-center sm:px-8 sm:pt-32"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="evx-orbit" style={{ width: "min(120vw, 980px)", height: "min(120vw, 980px)" }}>
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
                className="pointer-events-none absolute inset-0 select-none bg-gradient-to-b from-white via-[#C9C9D2] to-[#626574] bg-clip-text text-[clamp(4.2rem,19vw,16rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent opacity-30 blur-[18px]"
              >
                EVENTS
              </span>
              <h1
                id="events-page-title"
                className="relative m-0 bg-gradient-to-b from-[#FFFFFF] via-[#D4D5DE] to-[#5E6272] bg-clip-text text-[clamp(4.2rem,19vw,16rem)] font-normal leading-[0.8] tracking-[-0.085em] text-transparent font-roboto"
              >
                EVENTS
              </h1>
            </div>

            <p className="mt-9 max-w-[560px] font-pixel text-[10px] leading-[2] tracking-[0.14em] text-[#A9B5E8]/75 sm:mt-11 sm:text-xs min-[900px]:text-sm">
              EVERY WORLD IS A DIFFERENT WAY INTO TECHXETRA.
            </p>

            <div className="mt-14 flex flex-col items-center gap-3 sm:mt-16">
              <span className="font-pixel text-[9px] tracking-[0.26em] text-white/40">SCROLL TO EXPLORE</span>
              <span className="relative block h-12 w-px overflow-hidden bg-white/15">
                <span className="evx-cue-dot absolute inset-x-0 top-0 block h-5 bg-gradient-to-b from-transparent via-[#BFD4FF] to-transparent" />
              </span>
            </div>
          </div>
        </section>

        {events.map((event, index) => {
          const figure = figures[index];

          return (
            <section
              key={event.id}
              id={event.id}
              data-event-section
              aria-labelledby={`${event.id}-title`}
              className="relative flex min-h-svh flex-col pb-[calc(88px+env(safe-area-inset-bottom))] pl-[76px] pr-5 pt-28 min-[600px]:pl-[116px] min-[600px]:pr-8 min-[900px]:justify-center min-[900px]:pb-12 min-[900px]:pr-12 min-[1000px]:pl-[156px] min-[1200px]:pr-16"
              style={{ color: event.foreground }}
            >
              <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col gap-8 min-[900px]:grid min-[900px]:max-w-[1280px] min-[900px]:flex-none min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-[900px]:items-center min-[900px]:gap-[clamp(40px,7vw,112px)]">
                <div data-event-copy className="min-w-0 shrink-0">
                  <p
                    className="mb-5 flex items-center gap-3 text-[8px] leading-relaxed tracking-[0.2em] [font-family:var(--font-pixel)] min-[900px]:mb-7 min-[900px]:text-[10px]"
                    style={{ color: event.accent }}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor">
                      <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
                    </svg>
                    <span>{event.categoryLabel.toUpperCase()}</span>
                    <span
                      aria-hidden="true"
                      className="h-px w-10 min-[900px]:w-16"
                      style={{ background: `linear-gradient(90deg, ${event.accent}, transparent)` }}
                    />
                  </p>

                  <h2
                    id={`${event.id}-title`}
                    className="m-0 text-[clamp(2.2rem,10vw,3.6rem)] font-normal leading-[1.02] tracking-[-0.04em] text-balance [font-family:var(--font-gotham-bold)] [overflow-wrap:anywhere] min-[900px]:text-[clamp(3rem,5.6vw,5.6rem)]"
                    style={{ textShadow: `0 0 70px ${event.accentSoft}` }}
                  >
                    {event.name}
                  </h2>

                  <p className="mt-4 max-w-[52ch] text-[13px] italic leading-[1.65] text-[#F5F0DE]/65 min-[900px]:mt-6 min-[900px]:text-[14px]">
                    {event.tagline}
                  </p>

                  <div className="mt-4 max-w-[52ch] space-y-2 text-[13px] leading-[1.7] text-[#F5F0DE]/85 [overflow-wrap:anywhere] min-[900px]:mt-5 min-[900px]:space-y-4 min-[900px]:text-[15px] min-[900px]:leading-[1.85]">
                    {event.description.split(/\n\s*\n/).map((paragraph, paragraphIndex) => (
                      <p key={`${event.id}-${paragraphIndex}`} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <Link
                    href={event.href ?? `/event/${event.id}`}
                    aria-label={`Explore ${event.categoryLabel.toLowerCase()}`}
                    className="evx-cta group relative mt-7 inline-flex min-h-11 items-center justify-center gap-7 overflow-hidden border px-5 py-2.5 text-[11px] [font-family:var(--font-gotham-bold)] transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current min-[900px]:mt-9 min-[900px]:min-h-12 min-[900px]:px-6 min-[900px]:text-xs"
                    style={{ borderColor: `${event.accent}88` }}
                  >
                    <span
                      aria-hidden="true"
                      className="evx-cta-fill absolute inset-0"
                      style={{ background: `linear-gradient(90deg, ${event.accentSoft}, transparent)` }}
                    />
                    <span className="relative">Explore events</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>

                <figure
                  data-event-poster
                  className="m-0 mt-auto w-[86%] max-w-[350px] shrink-0 self-center min-[900px]:mt-0 min-[900px]:w-full min-[900px]:max-w-[min(430px,52svh)] min-[900px]:justify-self-end"
                >
                  <div className="evx-float relative">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 400 400"
                      fill="none"
                      className="pointer-events-none absolute -inset-[22%] h-[144%] w-[144%] overflow-visible"
                    >
                      {figure.segments.map((d, i) => (
                        <path
                          key={`${event.id}-seg-${i}`}
                          data-figure-line
                          d={d}
                          pathLength={1}
                          stroke={event.accent}
                          strokeOpacity="0.5"
                          strokeWidth="1"
                          strokeDasharray="1"
                          strokeDashoffset="0"
                        />
                      ))}
                      {figure.pts.map((p, i) => (
                        <circle
                          key={`${event.id}-pt-${i}`}
                          data-figure-node
                          cx={p.x}
                          cy={p.y}
                          r={p.r}
                          fill="#EAF2FF"
                        />
                      ))}
                    </svg>

                    <div
                      data-tilt-stage
                      className="relative aspect-[4/5] w-full"
                      style={{ perspective: "1100px" }}
                    >
                      <div
                        data-tilt
                        className="absolute inset-0 will-change-transform"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-[10%] top-[14%] h-[78%] w-[80%] rounded-full blur-[60px]"
                          style={{ background: event.accentSoft, transform: "translateZ(-120px)" }}
                        />

                        <div
                          className="absolute inset-0"
                          style={{
                            transform: "translateZ(0)",
                            filter: "drop-shadow(0 38px 46px rgba(0,0,0,0.55))",
                          }}
                        >
                          {event.image ? (
                            <Image
                              src={event.image}
                              alt={`${event.name} ${event.categoryLabel} poster`}
                              fill
                              priority={index === 0}
                              sizes="(min-width: 900px) 430px, (min-width: 440px) 350px, 80vw"
                              className="object-contain"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full flex-col justify-between border p-6 min-[900px]:p-8"
                              style={{
                                borderColor: `${event.accent}55`,
                                background: `linear-gradient(145deg, ${event.accentSoft}, rgba(0,0,0,0.38))`,
                              }}
                            >
                              <span
                                className="text-[9px] leading-relaxed tracking-[0.14em] [font-family:var(--font-pixel)] min-[900px]:text-[10px]"
                                style={{ color: event.accent }}
                              >
                                TECHXETRA 12th Edition
                              </span>
                              <span className="text-[clamp(1.8rem,7vw,2.8rem)] leading-[1.05] [font-family:var(--font-gotham-bold)] [overflow-wrap:anywhere] min-[900px]:text-[clamp(2rem,3.5vw,3.4rem)]">
                                {event.name}
                              </span>
                              <span
                                className="text-[9px] leading-relaxed tracking-[0.14em] [font-family:var(--font-pixel)] min-[900px]:text-[10px]"
                                style={{ color: event.accent }}
                              >
                                EVENT POSTER
                              </span>
                            </div>
                          )}
                        </div>

                        <span
                          aria-hidden="true"
                          className="absolute -right-3 top-[12%] h-2 w-2 rounded-full bg-[#EAF2FF]"
                          style={{ transform: "translateZ(80px)", boxShadow: `0 0 18px 3px ${event.accent}` }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -left-4 bottom-[20%] h-1.5 w-1.5 rounded-full bg-[#EAF2FF]"
                          style={{ transform: "translateZ(60px)", boxShadow: `0 0 14px 2px ${event.accent}` }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute bottom-[6%] right-[8%] h-1 w-1 rounded-full bg-[#EAF2FF]"
                          style={{ transform: "translateZ(110px)", boxShadow: `0 0 12px 2px ${event.accent}` }}
                        />
                      </div>
                    </div>
                  </div>
                </figure>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}