"use client";

import SectionTitle from "@/components/ui/SectionTitle";
import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  EventGlimpse                                                       */
/*  Posters flow right -> left, 3D tilted. When a card touches the     */
/*  cyan beam on the left it disintegrates into particles, then loops. */
/*  Scroll / wheel / drag speeds it up. No dependencies.               */
/* ------------------------------------------------------------------ */

type Poster = { src: string; alt?: string };

type Props = {
  /** 3:4 poster images */
  posters?: Poster[];
  /** "#000", "transparent", "none", gradient, etc. */
  background?: string;
  /** accent colour as "r, g, b" (default cyan) */
  accentRgb?: string;
  /** faint star dots in background (space theme) */
  showStars?: boolean;
  /** auto drift speed in px/sec (desktop) */
  speed?: number;
  /** route for the button */
  href?: string;
  buttonText?: string;
};

const DEFAULT_POSTERS: Poster[] = Array.from({ length: 6 }, (_, i) => ({
  src: `https://picsum.photos/seed/event-glimpse-${i + 1}/600/800`,
  alt: `Event poster ${i + 1}`,
}));

type Layout = {
  w: number;
  cardW: number;
  cardH: number;
  gap: number;
  step: number;
  stageH: number;
  beamX: number;
  count: number;
  total: number;
  mobile: boolean;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const MAX_P = 900;

export default function EventGlimpse({
  posters = DEFAULT_POSTERS,
  background = "#000",
  accentRgb = "0, 229, 255",
  showStars = true,
  speed = 70,
  href = "/events",
  buttonText = "Explore Events",
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layoutRef = useRef<Layout | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  /* ---------------------------- layout ---------------------------- */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;
      const mobile = w < 640;
      const cardW = mobile
        ? Math.min(w * 0.56, 240)
        : clamp(w * 0.2, 220, 300);
      const cardH = (cardW * 4) / 3;
      const gap = mobile ? 16 : 28;
      const step = cardW + gap;
      const beamX = mobile ? w * 0.09 : w * 0.15;
      const minTotal = w - beamX + cardW + gap;
      const count = Math.max(posters.length, Math.ceil(minTotal / step));
      const next: Layout = {
        w,
        cardW,
        cardH,
        gap,
        step,
        stageH: cardH + (mobile ? 70 : 110),
        beamX,
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

  /* --------------------------- animation -------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // particle pool
    const px = new Float32Array(MAX_P);
    const py = new Float32Array(MAX_P);
    const pvx = new Float32Array(MAX_P);
    const pvy = new Float32Array(MAX_P);
    const plife = new Float32Array(MAX_P);
    const pmax = new Float32Array(MAX_P);
    const psize = new Float32Array(MAX_P);
    let pn = 0;

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
    let dpr = 1;
    let cw = 0;
    let ch = 0;

    const sizeCanvas = () => {
      const L = layoutRef.current;
      if (!L) return;
      dpr = Math.min(window.devicePixelRatio || 1, L.mobile ? 1.5 : 2);
      cw = L.w;
      ch = L.stageH;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const emit = (x: number, y0: number, y1: number, n: number) => {
      for (let k = 0; k < n && pn < MAX_P; k++) {
        const i = pn++;
        px[i] = x + (Math.random() - 0.5) * 3;
        py[i] = y0 + Math.random() * (y1 - y0);
        pvx[i] = -(30 + Math.random() * Math.random() * 380);
        pvy[i] = (Math.random() - 0.5) * 70;
        pmax[i] = plife[i] = 0.5 + Math.random() * 1.1;
        psize[i] = 0.8 + Math.random() * 1.8;
      }
    };

    let lastKey = "";
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const L = layoutRef.current;
      if (!L || !visible) return;

      const key = `${L.w}x${L.stageH}`;
      if (key !== lastKey) {
        lastKey = key;
        sizeCanvas();
      }

      const base = (L.mobile ? speed * 0.65 : speed) * (reduced ? 0.4 : 1);
      if (!dragging) {
        boost *= Math.exp(-2.6 * dt);
        offset += (base + boost) * dt;
      }
      const speedFactor = clamp((base + Math.abs(boost)) / base, 1, 5);

      const cardTop = (L.stageH - L.cardH) / 2;
      const cards = cardRefs.current;

      for (let i = 0; i < L.count; i++) {
        const el = cards[i];
        if (!el) continue;
        const rel = (((i * L.step - offset) % L.total) + L.total) % L.total;
        const left = L.beamX - L.cardW + rel;

        // 3D feel: tilt + depth based on position across the stage
        const t = (left + L.cardW / 2 - L.w / 2) / L.w; // ~ -0.4 .. 0.6
        const ry = clamp(-t * 22, -12, 14);
        const z = -Math.abs(t) * 90;
        const lift = Math.sin((left / L.w) * Math.PI) * -6;

        el.style.transform = `translate3d(${left.toFixed(1)}px, ${lift.toFixed(
          1
        )}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;

        const cut = clamp(L.beamX - left, 0, L.cardW);
        el.style.clipPath = cut <= 0 ? "none" : `inset(0 0 0 ${cut.toFixed(1)}px)`;
        el.style.visibility = cut >= L.cardW ? "hidden" : "visible";

        if (cut > 0 && cut < L.cardW) {
          const rate = (L.mobile ? 520 : 800) * speedFactor;
          const n = Math.floor(rate * dt + Math.random());
          emit(L.beamX, cardTop + 4, cardTop + L.cardH - 4, n);
        }
      }

      // particles
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < pn; i++) {
        plife[i] -= dt;
        if (plife[i] <= 0) {
          const j = --pn;
          px[i] = px[j];
          py[i] = py[j];
          pvx[i] = pvx[j];
          pvy[i] = pvy[j];
          plife[i] = plife[j];
          pmax[i] = pmax[j];
          psize[i] = psize[j];
          i--;
          continue;
        }
        pvx[i] *= 1 - 0.9 * dt;
        pvy[i] += (Math.random() - 0.5) * 120 * dt;
        px[i] += pvx[i] * dt;
        py[i] += pvy[i] * dt;
        const a = plife[i] / pmax[i];
        ctx.globalAlpha = a * a;
        ctx.fillStyle = a > 0.6 ? "#e6fcff" : `rgb(${accentRgb})`;
        const s = psize[i];
        ctx.fillRect(px[i], py[i], s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(tick);

    /* ---- interactions ---- */
    const onScroll = () => {
      const d = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      boost = clamp(boost + d * 3, -900, 900);
    };
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (d) boost = clamp(boost + d * 2, -900, 900);
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastMoveT = performance.now();
      dragV = 0;
      stage.setPointerCapture?.(e.pointerId);
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
      boost = clamp(dragV * 0.5 - 0, -900, 900);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = performance.now();
      },
      { threshold: 0 }
    );
    io.observe(stage);

    window.addEventListener("scroll", onScroll, { passive: true });
    stage.addEventListener("wheel", onWheel, { passive: true });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", onUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("pointerleave", onUp);
    };
  }, [speed, accentRgb, !!layout]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----------------------------- render --------------------------- */
  const starBg = showStars
    ? [
      "radial-gradient(1px 1px at 20px 30px, #fff, transparent)",
      "radial-gradient(1px 1px at 120px 80px, rgba(255,255,255,.7), transparent)",
      `radial-gradient(1.5px 1.5px at 70px 150px, rgba(${accentRgb},.9), transparent)`,
      "radial-gradient(1px 1px at 170px 20px, rgba(255,255,255,.6), transparent)",
      "radial-gradient(1px 1px at 190px 170px, #fff, transparent)",
    ].join(",")
    : "none";

  const items = layout
    ? Array.from({ length: layout.count }, (_, i) => posters[i % posters.length])
    : [];

  return (
    <section
      ref={rootRef}
      className="event-glimpse"
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: background === "none" ? "transparent" : background,
        padding: "32px 0 48px",
        color: "#fff",
      }}
    >
      <header className="relative z-10 mb-10 sm:mb-12 md:mb-14 lg:mb-16 pl-16 sm:pl-20 md:pl-24">
        <SectionTitle title="Events" align="left" />
      </header>
      <style>{`
        .event-glimpse .eg-stars{position:absolute;inset:0;pointer-events:none;opacity:.55;
          background-size:200px 200px;}
        .event-glimpse .eg-btn{
          display:inline-flex;align-items:center;gap:10px;padding:14px 30px;border-radius:999px;
          font-size:15px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;
          color:rgb(${accentRgb});background:rgba(${accentRgb},.08);
          border:1px solid rgba(${accentRgb},.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          box-shadow:0 0 18px rgba(${accentRgb},.25), inset 0 0 12px rgba(${accentRgb},.12);
          transition:transform .3s ease, box-shadow .3s ease, background .3s ease, color .3s ease;
        }
        .event-glimpse .eg-btn:hover{
          transform:translateY(-2px);color:#001417;background:rgb(${accentRgb});
          box-shadow:0 0 34px rgba(${accentRgb},.7);
        }
        .event-glimpse .eg-btn svg{transition:transform .3s ease}
        .event-glimpse .eg-btn:hover svg{transform:translateX(4px)}
        @media (max-width:640px){.event-glimpse .eg-btn{padding:12px 24px;font-size:13px}}
      `}</style>

      {showStars && (
        <div
          className="eg-stars"
          style={{ backgroundImage: starBg }}
          aria-hidden="true"
        />
      )}

      {/* stage */}
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: layout ? layout.stageH : 420,
          perspective: 1400,
          perspectiveOrigin: "50% 50%",
          touchAction: "pan-y",
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {layout && (
          <>
            {/* soft glow behind beam */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: layout.beamX - layout.w * 0.18,
                width: layout.w * 0.36,
                background: `radial-gradient(ellipse at center, rgba(${accentRgb},.16), transparent 65%)`,
                pointerEvents: "none",
              }}
            />

            {/* cards */}
            {items.map((p, i) => (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                style={{
                  position: "absolute",
                  top: (layout.stageH - layout.cardH) / 2,
                  left: 0,
                  width: layout.cardW,
                  height: layout.cardH,
                  borderRadius: 18,
                  overflow: "hidden",
                  border: `1px solid rgba(${accentRgb},.28)`,
                  boxShadow: `0 20px 50px rgba(0,0,0,.6), 0 0 28px rgba(${accentRgb},.18)`,
                  willChange: "transform, clip-path",
                  backfaceVisibility: "hidden",
                  transform: "translate3d(-9999px,0,0)",
                  background: "#06121a",
                }}
              >
                <img
                  src={p.src}
                  alt={p.alt || "Event poster"}
                  draggable={false}
                  decoding="async"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    pointerEvents: "none",
                  }}
                />
                {/* gloss */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,.05) 100%)",
                  }}
                />
              </div>
            ))}

            {/* particles */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
              }}
            />

            {/* beam */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: layout.beamX - 1.5,
                width: 3,
                pointerEvents: "none",
                background: `linear-gradient(to bottom, transparent 0%, rgba(${accentRgb},1) 18%, #ffffff 50%, rgba(${accentRgb},1) 82%, transparent 100%)`,
                boxShadow: `0 0 10px 2px rgba(${accentRgb},.9), 0 0 36px 8px rgba(${accentRgb},.45), 0 0 90px 20px rgba(${accentRgb},.18)`,
              }}
            />
          </>
        )}
      </div>

      {/* button */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <a href={href} className="eg-btn">
          {buttonText}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </section>
  );
}