"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/*  Content. Replace with your own files and give each its real width/height   */
/*  so portrait (3:4) and landscape images are always shown in full.           */
/* -------------------------------------------------------------------------- */

interface Media {
  id: string;
  src: string; // image url, also used as poster when a video is set
  video?: string; // optional video url
  width: number;
  height: number;
  title: string; // performer name or event name
  year: number;
}

const PERFORMERS: Media[] = [
  { id: "p1", src: "https://picsum.photos/seed/artist-1/900/1200", width: 900, height: 1200, title: "Aarav Sharma", year: 2025 },
  { id: "p2", src: "https://picsum.photos/seed/artist-2/900/1200", width: 900, height: 1200, title: "Meera Iyer", year: 2025 },
  { id: "p3", src: "https://picsum.photos/seed/artist-3/1600/1000", width: 1600, height: 1000, title: "Nova Collective", year: 2024 },
  { id: "p4", src: "https://picsum.photos/seed/artist-4/900/1200", width: 900, height: 1200, title: "Kabir Mehta", year: 2024 },
  { id: "p5", src: "https://picsum.photos/seed/artist-5/900/1200", width: 900, height: 1200, title: "Sana Qureshi", year: 2024 },
  {
    id: "p6",
    src: "https://picsum.photos/seed/artist-6/1600/900",
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    width: 1600,
    height: 900,
    title: "Rhythm House",
    year: 2023,
  },
  { id: "p7", src: "https://picsum.photos/seed/artist-7/900/1200", width: 900, height: 1200, title: "Rohan Das", year: 2023 },
  { id: "p8", src: "https://picsum.photos/seed/artist-8/900/1200", width: 900, height: 1200, title: "Ishita Kapoor", year: 2023 },
  { id: "p9", src: "https://picsum.photos/seed/artist-9/900/1200", width: 900, height: 1200, title: "Dr. Neha Verma", year: 2022 },
  { id: "p10", src: "https://picsum.photos/seed/artist-10/1400/1050", width: 1400, height: 1050, title: "The Late Shift", year: 2022 },
  { id: "p11", src: "https://picsum.photos/seed/artist-11/900/1200", width: 900, height: 1200, title: "Vikram Nair", year: 2022 },
  { id: "p12", src: "https://picsum.photos/seed/artist-12/900/1200", width: 900, height: 1200, title: "Tara Bose", year: 2022 },
];

const PHOTOS: Media[] = [
  { id: "e1", src: "https://picsum.photos/seed/photo-1/1600/1000", width: 1600, height: 1000, title: "Main hall, opening session", year: 2025 },
  { id: "e2", src: "https://picsum.photos/seed/photo-2/900/1200", width: 900, height: 1200, title: "Robotics finals", year: 2025 },
  { id: "e3", src: "https://picsum.photos/seed/photo-3/1400/1050", width: 1400, height: 1050, title: "Prize distribution", year: 2024 },
  { id: "e4", src: "https://picsum.photos/seed/photo-4/900/1200", width: 900, height: 1200, title: "Workshop session", year: 2024 },
  { id: "e5", src: "https://picsum.photos/seed/photo-5/1600/900", width: 1600, height: 900, title: "Night sky session", year: 2024 },
  { id: "e6", src: "https://picsum.photos/seed/photo-6/900/1200", width: 900, height: 1200, title: "Backstage", year: 2023 },
  { id: "e7", src: "https://picsum.photos/seed/photo-7/1400/1050", width: 1400, height: 1050, title: "Panel discussion", year: 2023 },
  { id: "e8", src: "https://picsum.photos/seed/photo-8/900/1200", width: 900, height: 1200, title: "Volunteers at the gate", year: 2023 },
  { id: "e9", src: "https://picsum.photos/seed/photo-9/1600/1000", width: 1600, height: 1000, title: "The audience", year: 2022 },
  { id: "e10", src: "https://picsum.photos/seed/photo-10/900/1200", width: 900, height: 1200, title: "Organising team", year: 2022 },
  { id: "e11", src: "https://picsum.photos/seed/photo-11/1400/1050", width: 1400, height: 1050, title: "Telescope corner", year: 2022 },
  { id: "e12", src: "https://picsum.photos/seed/photo-12/900/1200", width: 900, height: 1200, title: "Closing evening", year: 2022 },
];

/* One colour world per section. The page background blends between them on scroll.
   World 0 is violet space (performers); world 1 is the lighter yellow / green / red
   sky for the photo wall. */
const WORLDS = [
  {
    background: "#12062b",
    image: "radial-gradient(ellipse at 74% 46%, rgba(139,92,246,0.36) 0%, transparent 70%)",
  },
  {
    background: "#07170f",
    image:
      "radial-gradient(ellipse 60% 55% at 16% 40%, rgba(74,222,128,0.30), transparent 70%)," +
      "radial-gradient(ellipse 55% 50% at 86% 28%, rgba(250,204,21,0.28), transparent 70%)," +
      "radial-gradient(ellipse 60% 45% at 52% 98%, rgba(248,113,113,0.24), transparent 72%)",
  },
];

const SECTION_VARS = [
  { "--accent": "#B79CFF", "--soft": "rgba(139,92,246,0.38)", "--g1": "#EFE6FF", "--g2": "#A78BFA" },
  { "--accent": "#FFD166", "--soft": "rgba(250,204,21,0.30)", "--g1": "#FFE08A", "--g2": "#6EE7A8" },
] as React.CSSProperties[];

/* -------------------------------------------------------------------------- */
/*  Constellation helpers                                                      */
/* -------------------------------------------------------------------------- */

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

/* A star figure that draws itself once its parent gets the `in` class */
const Figure: React.FC<{ seed: number; color: string; className?: string }> = ({ seed, color, className = "" }) => {
  const fig = useMemo(() => makeFigure(seed), [seed]);
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" fill="none" className={`gn-fig ${className}`}>
      {fig.segments.map((d, i) => (
        <path
          key={`s${i}`}
          d={d}
          pathLength={1}
          stroke={color}
          strokeOpacity="0.55"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          style={{ ["--i" as string]: i } as React.CSSProperties}
        />
      ))}
      {fig.pts.map((p, i) => (
        <circle
          key={`c${i}`}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="#F4EFFF"
          style={{ ["--i" as string]: i } as React.CSSProperties}
        />
      ))}
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/*  Constellation field (canvas, depth parallax, pointer links)                */
/* -------------------------------------------------------------------------- */

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

const ConstellationField: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);

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
          ctx.strokeStyle = `rgba(190,170,255,${alpha.toFixed(3)})`;
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
          ctx.strokeStyle = `rgba(230,214,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.55 * n.z) * twinkle;
        ctx.fillStyle = `rgba(240,234,255,${alpha.toFixed(3)})`;
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

  return <canvas ref={ref} className="gn-canvas" />;
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const CSS = `
.gn{--ink:#f5f0de;--mute:#a49fc0;--ease:cubic-bezier(.2,.7,.2,1);--soft-e:cubic-bezier(.16,1,.3,1);
  position:relative;isolation:isolate;min-height:100vh;min-height:100svh;overflow-x:clip;background:#000;color:var(--ink);
  font-family:"Inter","Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.gn *,.gn *::before,.gn *::after{box-sizing:border-box}
.gn button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}

/* ---------- backdrop: black field, colour worlds, dark grade, constellation ---------- */
.gn-back{position:absolute;inset:0;z-index:0;pointer-events:none}
.gn-sticky{position:sticky;top:0;height:100vh;height:100svh;width:100%;overflow:hidden}
.gn-base{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 36%,#160a33 0%,#07041a 52%,#000 100%)}
.gn-world{position:absolute;inset:0;opacity:0;will-change:opacity}
.gn-grade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.58) 0%,rgba(0,0,0,.08) 36%,rgba(0,0,0,.14) 64%,rgba(0,0,0,.7) 100%)}
.gn-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(0,0,0,.6) 100%)}
.gn-canvas{position:absolute;inset:0;width:100%;height:100%}

.gn-body{position:relative;z-index:1}

/* ---------- hero ---------- */
.hero{position:relative;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;padding:150px 20px 80px;text-align:center}
.hero-orbit{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none}
.gn-orbit{width:min(120vw,980px);height:min(120vw,980px);animation:gn-orbit 140s linear infinite}
.gn-orbit svg{display:block;width:100%;height:100%;opacity:.4}
.hero-in{position:relative;display:flex;flex-direction:column;align-items:center;will-change:transform,opacity}
.hero-in>*{animation:gn-rise 1.2s var(--soft-e) both}
.hero-in>*:nth-child(2){animation-delay:.12s}.hero-in>*:nth-child(3){animation-delay:.24s}.hero-in>*:nth-child(4){animation-delay:.36s}
.eyebrow{margin:0 0 28px;font-size:10px;letter-spacing:.42em;color:rgba(185,169,240,.78)}
.hero-t{position:relative}
.hero-t .glow,.hero-t h1{font-size:clamp(3.6rem,17vw,14rem);font-weight:400;line-height:.8;letter-spacing:-.085em;margin:0;
  background:linear-gradient(180deg,#fff 0%,#d8d2ea 45%,#5f587a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-t .glow{position:absolute;inset:0;opacity:.3;filter:blur(18px);pointer-events:none;user-select:none}
.tag{margin:38px 0 0;max-width:560px;font-size:10px;line-height:2;letter-spacing:.14em;color:rgba(185,169,240,.78)}
.cue{margin-top:56px;display:flex;flex-direction:column;align-items:center;gap:12px}
.cue span:first-child{font-size:9px;letter-spacing:.26em;color:rgba(255,255,255,.4)}
.cue-line{position:relative;display:block;width:1px;height:48px;overflow:hidden;background:rgba(255,255,255,.15)}
.cue-line i{position:absolute;left:0;right:0;top:0;height:20px;display:block;background:linear-gradient(180deg,transparent,#cdbbff,transparent);animation:gn-cue 2.4s cubic-bezier(.6,0,.4,1) infinite}
@media (min-width:600px){.eyebrow{font-size:11px}.tag{font-size:12px;margin-top:44px}}
@media (min-width:900px){.eyebrow{font-size:12px}.tag{font-size:14px}}

/* ---------- section scaffold ---------- */
.sec{position:relative;padding:clamp(70px,10vw,130px) 0 clamp(30px,5vw,70px)}
.hd{position:relative;text-align:center;padding:0 20px}
.hd small{display:inline-flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
.hd small::before,.hd small::after{content:"";width:34px;height:1px;background:linear-gradient(90deg,transparent,var(--accent))}
.hd small::after{transform:scaleX(-1)}
.hd h3{position:relative;margin:0 auto;max-width:760px;font-size:clamp(28px,4.6vw,52px);font-weight:500;letter-spacing:-.02em;line-height:1.12;
  text-shadow:0 0 60px var(--soft)}
.hd h3 em{font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;
  background:linear-gradient(90deg,var(--g1),var(--g2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hd-fig{position:absolute;left:50%;top:50%;width:min(560px,92vw);height:min(560px,92vw);transform:translate(-50%,-50%);opacity:.55;pointer-events:none}

/* Scroll reveal */
.rv{opacity:0;transform:translate3d(0,44px,0);transition:opacity .9s var(--ease),transform 1s var(--ease)}
.rv.in{opacity:1;transform:none}

/* Constellation figure: draws itself when the parent is revealed */
.gn-fig{overflow:visible}
.gn-fig path{stroke-dasharray:1;stroke-dashoffset:1}
.gn-fig circle{opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(0)}
.in .gn-fig path{animation:gn-draw 2.4s ease forwards;animation-delay:calc(var(--i)*.15s + .2s)}
.in .gn-fig circle{animation:gn-pop .6s var(--soft-e) forwards;animation-delay:calc(var(--i)*.1s + .2s)}

/* ---------- past performers ---------- */
.fc-wrap{position:relative;margin-top:clamp(40px,5vw,70px);--cw:min(250px,56vw);--step:calc(var(--cw) + 22px);height:calc(var(--cw)*4/3)}
.fc-fig{position:absolute;left:50%;top:50%;width:calc(var(--cw)*2.9);height:calc(var(--cw)*2.9);transform:translate(-50%,-50%);pointer-events:none}
.fc-glow{position:absolute;left:50%;top:50%;width:calc(var(--cw)*2.1);height:calc(var(--cw)*2.1);margin:calc(var(--cw)*-1.05) 0 0 calc(var(--cw)*-1.05);
  background:radial-gradient(closest-side,var(--soft),transparent);pointer-events:none;animation:gn-glow 6s ease-in-out infinite alternate}
.fc-stage{position:absolute;left:0;right:0;top:-70px;bottom:-70px;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)}
.fc{position:absolute;left:50%;top:70px;width:var(--cw);height:calc(100% - 140px);margin-left:calc(var(--cw)/-2);padding:0;border:0;cursor:pointer;
  border-radius:20px;overflow:hidden;background:#0b0820;box-shadow:0 0 0 1px rgba(190,175,255,.16);
  transform:translate3d(calc(var(--d)*var(--step)),0,0) scale(.84);opacity:.5;
  transition:transform .7s var(--soft-e),opacity .6s ease,box-shadow .5s;will-change:transform,opacity}
.fc.two{opacity:.22;transform:translate3d(calc(var(--d)*var(--step)),0,0) scale(.72)}
.fc.gone{opacity:0;pointer-events:none;transform:translate3d(calc(var(--d)*var(--step)),0,0) scale(.64)}
.fc.on{transform:perspective(1100px) translate3d(0,0,0) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(1);opacity:1;
  box-shadow:0 0 0 1px var(--accent),0 40px 90px -40px var(--soft),0 0 60px -10px var(--soft)}
.fc.on[data-tilt]{transition:transform .14s linear,opacity .6s ease,box-shadow .5s}
.fc::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.2),transparent 62%)}
@media (hover:hover){.fc.on:hover::before{opacity:1}}
.fc img{position:absolute;inset:0;width:100%;height:100%;display:block;-webkit-user-drag:none}
.fc .cover{object-fit:cover;transition:transform 7s ease-out}
.fc.on .cover,.fc.on .fit{transform:scale(1.07)}
.fc .fit{object-fit:contain;transition:transform 7s ease-out}
.fc .bg{object-fit:cover;transform:scale(1.25);filter:blur(22px) brightness(.55)}
.fc-cap{position:absolute;left:0;right:0;bottom:0;padding:56px 16px 16px;text-align:left;z-index:2;
  background:linear-gradient(180deg,transparent,rgba(5,3,16,.9) 70%)}
.fc-cap b{display:block;font-size:15px;font-weight:600;letter-spacing:.01em;line-height:1.25}
.fc-cap span{display:block;margin-top:4px;font-size:12px;letter-spacing:.2em;color:var(--accent)}
.fc.on .fc-cap b,.fc.on .fc-cap span{animation:gn-cap .7s var(--soft-e) both}
.fc.on .fc-cap span{animation-delay:.08s}
.fc:focus-visible,.nv:focus-visible,.mq-t:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.nv{position:absolute;top:50%;width:48px;height:48px;margin-top:-24px;border-radius:50%;cursor:pointer;display:grid;place-items:center;
  background:rgba(14,10,34,.88);border:1px solid rgba(255,255,255,.16);transition:background .25s,border-color .25s;z-index:3}
.nv:hover{background:var(--soft);border-color:var(--accent)}
.nv svg,.vw-b svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.nv.l{left:max(8px,calc(50% - var(--step)*2 - var(--cw)/2 - 40px))}
.nv.r{right:max(8px,calc(50% - var(--step)*2 - var(--cw)/2 - 40px))}
@media (max-width:1000px){
  .fc-wrap{margin-bottom:88px}
  .nv{top:auto;bottom:-72px;margin-top:0}
  .nv.l{left:calc(50% - 58px)}.nv.r{right:auto;left:calc(50% + 10px)}
}
.play{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(5,7,18,.65);border:1px solid rgba(255,255,255,.4);z-index:3}
.play::after{content:"";position:absolute;left:13px;top:8px;border-style:solid;border-width:7px 0 7px 10px;border-color:transparent transparent transparent #fff}

/* ---------- past photos: three rows, each dragged on its own ---------- */
.mq{position:relative;margin-top:clamp(40px,5vw,70px);--rh:clamp(150px,21vw,270px);--gap:12px;
  display:flex;flex-direction:column;gap:var(--gap);overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.mq-row{cursor:grab}
.mq.grab .mq-row{cursor:grabbing}
.mq-track{display:flex;width:max-content;will-change:transform}
.mq-set{display:flex;gap:var(--gap);padding-right:var(--gap);flex:none}
.mq-t{position:relative;flex:none;height:var(--rh);padding:0;border:0;cursor:inherit;border-radius:18px;overflow:hidden;background:#0b0e1f;
  opacity:0;transform:translate3d(var(--sx),var(--sy),0) rotate(var(--sr)) scale(.55)}
.mq.in .mq-t{opacity:1;transform:none;transition:transform 1.6s var(--soft-e) var(--dl),opacity 1s ease var(--dl)}
.mq-t img{display:block;width:100%;height:100%;object-fit:cover;-webkit-user-drag:none;pointer-events:none;transition:transform .8s var(--ease)}
.mq-t::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:box-shadow .3s}
.mq-cap{position:absolute;left:0;right:0;bottom:0;padding:30px 12px 10px;text-align:left;font-size:12px;line-height:1.35;
  background:linear-gradient(180deg,transparent,rgba(4,4,12,.88));opacity:0;transition:opacity .3s;pointer-events:none}
.mq-cap b{display:block;font-weight:600}
.mq-cap span{color:var(--rc);letter-spacing:.1em}
@media (hover:hover){
  .mq-t:hover img{transform:scale(1.05)}
  .mq-t:hover .mq-cap{opacity:1}
  .mq-t:hover::after{box-shadow:inset 0 0 0 2px var(--rc)}
}

/* ---------- viewer (rendered in a portal on document.body) ---------- */
.vw,.vw *,.vw *::before,.vw *::after{box-sizing:border-box}
.vw button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.vw{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(4,2,12,.95);animation:gn-vwin .3s ease both;touch-action:pan-y;color:#f5f0de;
  font-family:"Inter","Segoe UI",system-ui,sans-serif}
.vw-stage{flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;padding:64px 16px 8px}
.vw-stage img,.vw-stage video{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:8px;animation:gn-vwpop .45s cubic-bezier(.2,.7,.2,1) both}
.vw-info{flex:0 0 auto;padding:10px 20px 28px;text-align:center}
.vw-info b{display:block;font-size:17px;font-weight:600}
.vw-info span{display:block;margin-top:4px;color:#a49fc0;font-size:13px;letter-spacing:.14em}
.vw-b{position:absolute;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#fff;
  background:rgba(20,12,44,.78);border:1px solid rgba(255,255,255,.18);transition:background .25s}
.vw-b:hover{background:rgba(139,92,246,.4)}
.vw-b:focus-visible{outline:2px solid #b79cff;outline-offset:2px}
.vw-b svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vw-x{top:12px;right:12px}.vw-l{left:10px;top:50%;margin-top:-34px}.vw-r{right:10px;top:50%;margin-top:-34px}
@media (min-width:900px){.vw-stage{padding:56px 110px 8px}.vw-l{left:28px}.vw-r{right:28px}}

/* ---------- pause looping animation when off screen ---------- */
.gn[data-active="false"] .gn-orbit,
.gn[data-active="false"] .cue-line i,
.gn[data-active="false"] .fc-glow{animation-play-state:paused}

@keyframes gn-orbit{to{transform:rotate(360deg)}}
@keyframes gn-rise{from{opacity:0;transform:translate3d(0,34px,0)}to{opacity:1;transform:none}}
@keyframes gn-cue{0%{transform:translateY(-110%)}100%{transform:translateY(210%)}}
@keyframes gn-glow{from{opacity:.55}to{opacity:1}}
@keyframes gn-draw{to{stroke-dashoffset:0}}
@keyframes gn-pop{to{opacity:1;transform:scale(1)}}
@keyframes gn-cap{from{opacity:0;transform:translate3d(0,10px,0)}to{opacity:1;transform:none}}
@keyframes gn-vwin{from{opacity:0}to{opacity:1}}
@keyframes gn-vwpop{from{opacity:0;transform:scale(.96) translate3d(0,14px,0)}to{opacity:1;transform:none}}

@media (prefers-reduced-motion:reduce){
  .gn-orbit,.cue-line i,.fc-glow,.hero-in>*{animation:none!important}
  .rv,.mq-t{opacity:1;transform:none;transition:none}
  .gn-fig path{stroke-dashoffset:0;animation:none!important}
  .gn-fig circle{opacity:1;transform:none;animation:none!important}
  .fc,.fc .cover,.fc .fit,.fc-cap b,.fc-cap span,.vw,.vw-stage img,.vw-stage video{transition:none;animation:none}
}
`;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

type OpenFn = (list: Media[], index: number, el: HTMLElement) => void;

/* True once the element has entered the viewport (scroll trigger) */
function useInView(ref: React.RefObject<HTMLElement | null>, margin = "0px 0px -10% 0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return seen;
}

/* Stable pseudo random number, so the scatter looks the same on every render */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/* -------------------------------------------------------------------------- */
/*  Past performers                                                            */
/* -------------------------------------------------------------------------- */

const Performers: React.FC<{ onOpen: OpenFn }> = ({ onOpen }) => {
  const n = PERFORMERS.length;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const seen = useInView(wrapRef);
  const [active, setActive] = useState(1);
  const touchX = useRef<number | null>(null);
  const go = useCallback((d: number) => setActive((a) => (a + d + n) % n), [n]);

  const tiltMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.setAttribute("data-tilt", "1");
    el.style.setProperty("--ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 14).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
  };
  const tiltLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.removeAttribute("data-tilt");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={wrapRef}
      className={`fc-wrap rv ${seen ? "in" : ""}`}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <Figure seed={3} color="#B79CFF" className="fc-fig" />
      <span className="fc-glow" aria-hidden="true" />

      <div className="fc-stage">
        {PERFORMERS.map((p, i) => {
          let d = (i - active + n) % n;
          if (d > n / 2) d -= n;
          const a = Math.abs(d);
          if (a > 3) return null; // only seven cards exist in the DOM at a time
          const cls = a === 0 ? "on" : a === 1 ? "" : a === 2 ? "two" : "gone";
          const wide = p.width >= p.height;
          return (
            <button
              key={p.id}
              type="button"
              className={`fc ${cls}`}
              style={{ ["--d" as string]: d } as React.CSSProperties}
              aria-label={`${p.title}, ${p.year}`}
              tabIndex={a > 1 ? -1 : 0}
              onClick={(e) => (d === 0 ? onOpen(PERFORMERS, i, e.currentTarget) : setActive(i))}
              onPointerMove={d === 0 ? tiltMove : undefined}
              onPointerLeave={d === 0 ? tiltLeave : undefined}
            >
              {wide ? (
                <>
                  <img className="bg" src={p.src} alt="" decoding="async" draggable={false} />
                  <img className="fit" src={p.src} alt={p.title} decoding="async" draggable={false} />
                </>
              ) : (
                <img className="cover" src={p.src} alt={p.title} decoding="async" draggable={false} width={p.width} height={p.height} />
              )}
              {p.video && <span className="play" aria-hidden="true" />}
              <span className="fc-cap">
                <b>{p.title}</b>
                <span>{p.year}</span>
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" className="nv l" onClick={() => go(-1)} aria-label="Previous">
        <Icon d="M15 5l-7 7 7 7" />
      </button>
      <button type="button" className="nv r" onClick={() => go(1)} aria-label="Next">
        <Icon d="M9 5l7 7-7 7" />
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Past photos                                                                */
/*  Three rows that loop by themselves. Only the row you touch is dragged.     */
/*  The photos start scattered and settle into place when the section appears. */
/* -------------------------------------------------------------------------- */

const ROWS = [
  { shift: 0, dir: 1, speed: 44, color: "#FFD166" }, // yellow
  { shift: 4, dir: -1, speed: 36, color: "#6EE7A8" }, // green
  { shift: 8, dir: 1, speed: 50, color: "#FF8A8A" }, // red
];

const Marquee: React.FC<{ onOpen: OpenFn }> = ({ onOpen }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);
  const seen = useInView(wrapRef, "0px 0px -8% 0px");

  const rows = useMemo(() => ROWS.map((r) => PHOTOS.map((_, i) => (i + r.shift) % PHOTOS.length)), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const R = ROWS.length;

    const pos = ROWS.map((_, i) => i * 360);
    const widths: number[] = new Array(R).fill(0);
    const inertia: number[] = new Array(R).fill(0); // px per second after release
    const hoverF: number[] = new Array(R).fill(1);

    const applyRow = (i: number) => {
      const w = widths[i];
      const el = tracks.current[i];
      if (!w || !el) return;
      const m = ((pos[i] % w) + w) % w;
      el.style.transform = `translate3d(${-m}px,0,0)`;
    };
    const measure = () => {
      for (let i = 0; i < R; i++) {
        const el = tracks.current[i];
        if (el) widths[i] = el.offsetWidth / 2;
        applyRow(i);
      }
    };
    const ro = new ResizeObserver(measure);
    tracks.current.forEach((el) => el && ro.observe(el));
    measure();

    const rowOf = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.("[data-row]") as HTMLElement | null;
      return el ? Number(el.dataset.row) : -1;
    };

    let running = false;
    let raf = 0;
    let last = 0;
    let ramp = 0; // eases the auto loop in after the photos have settled
    let pressed = false;
    let dragging = false;
    let dragRow = -1;
    let hoverRow = -1;
    let suppress = false;
    let startX = 0;
    let lastX = 0;
    let lastT = 0;
    let vel = 0;
    let impulse = 0; // pushed by page scroll
    let lastY = window.scrollY;

    const tick = (t: number) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;

      if (wrap.classList.contains("in")) ramp = Math.min(1, ramp + dt * 0.5);
      const rp = ramp * ramp;
      const take = impulse * Math.min(1, dt * 8);
      impulse -= take;

      for (let i = 0; i < R; i++) {
        hoverF[i] += ((hoverRow === i ? 0 : 1) - hoverF[i]) * Math.min(1, dt * 5);
        if (dragging && i === dragRow) continue;
        inertia[i] *= Math.exp(-dt * 3.2);
        if (Math.abs(inertia[i]) < 2) inertia[i] = 0;
        let d = inertia[i] * dt + ROWS[i].dir * take * 0.8;
        if (!reduce) d += ROWS[i].dir * ROWS[i].speed * dt * hoverF[i] * rp;
        pos[i] += d;
        applyRow(i);
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "10% 0px" });
    io.observe(wrap);

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const r = rowOf(e.target);
      if (r < 0) return;
      pressed = true;
      dragging = false;
      dragRow = r;
      startX = lastX = e.clientX;
      lastT = performance.now();
      vel = 0;
      inertia[r] = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!pressed) {
        if (e.pointerType === "mouse") hoverRow = rowOf(e.target);
        return;
      }
      if (!dragging && Math.abs(e.clientX - startX) > 7) {
        dragging = true;
        try {
          wrap.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        wrap.classList.add("grab");
      }
      if (dragging) {
        const dx = e.clientX - lastX;
        pos[dragRow] -= dx;
        applyRow(dragRow);
        const now = performance.now();
        const sec = Math.max(1, now - lastT) / 1000;
        vel = vel * 0.6 + (dx / sec) * 0.4;
        lastT = now;
      }
      lastX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (dragging) {
        inertia[dragRow] = Math.max(-2800, Math.min(2800, -vel));
        suppress = true;
        window.setTimeout(() => (suppress = false), 60);
        wrap.classList.remove("grab");
        try {
          wrap.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      pressed = false;
      dragging = false;
      dragRow = -1;
      vel = 0;
    };
    const onClick = (e: MouseEvent) => {
      if (suppress) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hoverRow = -1;
    };
    const onScroll = () => {
      const y = window.scrollY;
      impulse += Math.max(-140, Math.min(140, y - lastY));
      lastY = y;
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const renderSet = (order: number[], r: number, hidden: boolean) => (
    <div className="mq-set" aria-hidden={hidden || undefined}>
      {order.map((idx, k) => {
        const p = PHOTOS[idx];
        const ratio = (p.width / p.height).toFixed(4);
        const seed = idx * 7 + r * 31;
        const style = {
          width: `calc(var(--rh) * ${ratio})`,
          ["--sx" as string]: `${Math.round((rnd(seed + 1) - 0.5) * 640)}px`,
          ["--sy" as string]: `${Math.round((rnd(seed + 2) - 0.5) * 420)}px`,
          ["--sr" as string]: `${Math.round((rnd(seed + 3) - 0.5) * 50)}deg`,
          ["--dl" as string]: `${((k * 3 + r * 5) % 14) * 55}ms`,
        } as React.CSSProperties;
        return (
          <button
            key={p.id}
            type="button"
            className="mq-t"
            style={style}
            tabIndex={hidden ? -1 : 0}
            aria-label={`${p.title}, ${p.year}`}
            onClick={(e) => onOpen(PHOTOS, idx, e.currentTarget)}
          >
            <img src={p.src} alt={hidden ? "" : p.title} decoding="async" draggable={false} width={p.width} height={p.height} />
            <span className="mq-cap">
              <b>{p.title}</b>
              <span>{p.year}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={wrapRef} className={`mq ${seen ? "in" : ""}`}>
      {rows.map((order, r) => (
        <div
          className="mq-row"
          key={r}
          data-row={r}
          style={{ ["--rc" as string]: ROWS[r].color } as React.CSSProperties}
        >
          <div
            className="mq-track"
            ref={(el) => {
              tracks.current[r] = el;
            }}
          >
            {renderSet(order, r, false)}
            {renderSet(order, r, true)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Viewer                                                                     */
/* -------------------------------------------------------------------------- */

const Viewer: React.FC<{ items: Media[]; index: number; onClose: () => void; onStep: (d: 1 | -1) => void }> = ({
  items,
  index,
  onClose,
  onStep,
}) => {
  const item = items[index];
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose, onStep]);

  useEffect(() => {
    [1, -1].forEach((d) => {
      const n = items[(index + d + items.length) % items.length];
      if (n && !n.video) new Image().src = n.src;
    });
  }, [index, items]);

  return (
    <div
      className="vw"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title}, ${item.year}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) onStep(dx < 0 ? 1 : -1);
      }}
    >
      <button ref={closeRef} type="button" className="vw-b vw-x" onClick={onClose} aria-label="Close">
        <Icon d="M6 6l12 12M18 6L6 18" />
      </button>
      <button type="button" className="vw-b vw-l" onClick={() => onStep(-1)} aria-label="Previous">
        <Icon d="M15 5l-7 7 7 7" />
      </button>
      <button type="button" className="vw-b vw-r" onClick={() => onStep(1)} aria-label="Next">
        <Icon d="M9 5l7 7-7 7" />
      </button>
      <div className="vw-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {item.video ? (
          <video key={item.id} src={item.video} poster={item.src} controls autoPlay playsInline />
        ) : (
          <img key={item.id} src={item.src} alt={item.title} />
        )}
      </div>
      <div className="vw-info">
        <b>{item.title}</b>
        <span>{item.year}</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const Galarynew: React.FC = () => {
  const rootRef = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const h1 = useRef<HTMLDivElement | null>(null);
  const h2 = useRef<HTMLDivElement | null>(null);
  const seen1 = useInView(h1);
  const seen2 = useInView(h2);
  const [view, setView] = useState<{ list: Media[]; index: number } | null>(null);

  /* Scroll driven colour blend between the section worlds, hero parallax,
     and pausing of looping animation when the section is off screen. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-world-section]"));
    const worlds = Array.from(root.querySelectorAll<HTMLElement>("[data-world]"));
    const heroIn = root.querySelector<HTMLElement>("[data-hero-in]");

    let tops: number[] = [];
    let vh = window.innerHeight;
    const lastWorld: number[] = worlds.map(() => -1);
    const smooth = { y: window.scrollY };
    let raf = 0;
    let prev = 0;

    const measure = () => {
      vh = window.innerHeight;
      const y = window.scrollY;
      tops = sections.map((s) => s.getBoundingClientRect().top + y);
    };

    const render = () => {
      const y = smooth.y;
      for (let j = 0; j < tops.length; j += 1) {
        const start = tops[j] - vh * 0.95;
        const end = tops[j] - vh * 0.18;
        const p = Math.min(1, Math.max(0, (y - start) / Math.max(end - start, 1)));
        const blend = p * p * (3 - 2 * p);
        if (Math.abs(blend - lastWorld[j]) > 0.002) {
          lastWorld[j] = blend;
          worlds[j].style.opacity = blend.toFixed(3);
        }
      }
      if (heroIn && !reduced) {
        const p = Math.min(1, Math.max(0, y / vh));
        heroIn.style.transform = `translate3d(0,${(-p * 14).toFixed(2)}%,0)`;
        heroIn.style.opacity = (1 - p * 0.95).toFixed(3);
      }
    };

    const loop = (t: number) => {
      raf = 0;
      const dt = Math.min(64, t - prev || 16);
      prev = t;
      const target = window.scrollY;
      const diff = target - smooth.y;
      if (Math.abs(diff) < 0.05) {
        smooth.y = target;
        render();
        return;
      }
      const k = reduced ? 1 : 1 - Math.exp(-Math.max(dt, 8) / 110);
      smooth.y += diff * k;
      render();
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (raf) return;
      prev = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      measure();
      render();
    };

    measure();
    smooth.y = window.scrollY;
    render();

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    const sizeObserver = new ResizeObserver(onResize);
    sections.forEach((s) => sizeObserver.observe(s));
    void document.fonts.ready.then(onResize);

    root.dataset.active = "true";
    const io = new IntersectionObserver(
      ([e]) => {
        root.dataset.active = e.isIntersecting ? "true" : "false";
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const open: OpenFn = useCallback((list, index, el) => {
    lastFocus.current = el;
    setView({ list, index });
  }, []);
  const close = useCallback(() => {
    setView(null);
    lastFocus.current?.focus?.();
  }, []);
  const step = useCallback((d: 1 | -1) => {
    setView((v) => (v ? { ...v, index: (v.index + d + v.list.length) % v.list.length } : v));
  }, []);

  return (
    <section ref={rootRef} className="gn" aria-label="Gallery" data-active="true">
      <style>{CSS}</style>

      {/* Backdrop: black hero field, section colour worlds, dark grade, constellation */}
      <div className="gn-back" aria-hidden="true">
        <div className="gn-sticky">
          <div className="gn-base" />
          {WORLDS.map((w, i) => (
            <div
              key={i}
              data-world
              className="gn-world"
              style={{ backgroundColor: w.background, backgroundImage: w.image }}
            />
          ))}
          <div className="gn-grade" />
          <div className="gn-vig" />
          <ConstellationField />
        </div>
      </div>

      <div className="gn-body">
        {/* Hero */}
        <header className="hero" aria-labelledby="gn-title">
          <div className="hero-orbit" aria-hidden="true">
            <div className="gn-orbit">
              <svg viewBox="0 0 400 400" fill="none">
                <circle cx="200" cy="200" r="190" stroke="#A78BFA" strokeOpacity="0.28" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="142" stroke="#A78BFA" strokeOpacity="0.2" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="3" fill="#E4D9FF" />
                <circle cx="58" cy="262" r="2.2" fill="#E4D9FF" />
              </svg>
            </div>
          </div>

          <div className="hero-in" data-hero-in>
            <p className="eyebrow font-pixel">TECHXETRA 12th Edition</p>
            <div className="hero-t">
              <span className="glow font-roboto" aria-hidden="true">GALLERY</span>
              <h1 id="gn-title" className="font-roboto">GALLERY</h1>
            </div>
            <p className="tag font-pixel">THE ARTISTS WHO PERFORMED ON OUR STAGE AND THE MOMENTS WE CAPTURED.</p>
            <div className="cue">
              <span className="font-pixel">SCROLL TO EXPLORE</span>
              <span className="cue-line">
                <i />
              </span>
            </div>
          </div>
        </header>

        {/* Past performers */}
        <div className="sec" data-world-section style={SECTION_VARS[0]}>
          <div ref={h1} className={`hd rv ${seen1 ? "in" : ""}`}>
            <Figure seed={11} color="#B79CFF" className="hd-fig" />
            <small className="font-roboto">Past performers</small>
            <h3 className="font-pixel">
              Artists who have <em>shared our stage</em>
            </h3>
          </div>
          <Performers onOpen={open} />
        </div>

        {/* Past photos */}
        <div className="sec" data-world-section style={SECTION_VARS[1]}>
          <div ref={h2} className={`hd rv ${seen2 ? "in" : ""}`}>
            <Figure seed={5} color="#FFD166" className="hd-fig" />
            <small className="font-roboto">Past photos</small>
            <h3 className="font-pixel">
              Moments <em>we captured live</em>
            </h3>
          </div>
          <Marquee onOpen={open} />
        </div>

        <div style={{ height: "clamp(60px,9vw,120px)" }} aria-hidden="true" />
      </div>

      {view &&
        createPortal(
          <Viewer items={view.list} index={view.index} onClose={close} onStep={step} />,
          document.body
        )}
    </section>
  );
};

export default Galarynew;