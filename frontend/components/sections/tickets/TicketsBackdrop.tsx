"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; z: number; r: number };

/**
 * Fixed constellation backdrop for the tickets page.
 * Capped node count, 30fps drift, pauses when the tab is hidden, static when
 * the user prefers reduced motion. No pointer tracking to keep it light.
 */
export default function TicketsBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let nodes: Node[] = [];

    const spawn = () => {
      const cap = w < 700 ? 30 : 58;
      const count = Math.round(Math.min(cap, Math.max(22, (w * h) / 24000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        z: 0.35 + Math.random() * 0.65,
        r: 0.6 + Math.random() * 1.3,
      }));
    };

    const size = () => {
      const prevW = w;
      w = Math.max(canvas.clientWidth, 1);
      h = Math.max(canvas.clientHeight, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Mobile address-bar resizes only change height, so keep the field. */
      if (!nodes.length || Math.abs(w - prevW) > 60) spawn();
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, w, h);
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 160);
      const link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx * dt * n.z;
        n.y += n.vy * dt * n.z;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        else if (n.y > h + 10) n.y = -10;
      }

      ctx.lineWidth = 0.7;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.3 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(160,200,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        ctx.fillStyle = `rgba(225,238,255,${((0.3 + 0.55 * n.z) * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * n.z + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = ts - last;
      if (elapsed < 32) return; // ~30fps
      last = ts;
      draw(Math.min(elapsed / 16.67, 3), ts);
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
    const onVisibility = () => (document.hidden ? stop() : start());

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        size();
        if (reduce) draw(0, 0);
      });
    });

    size();
    if (reduce) draw(0, 0);
    else start();
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #0a1228 0%, #04060f 55%, #000000 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 36% at 92% 18%, rgba(96,70,220,0.26), transparent 70%), radial-gradient(40% 34% at 6% 92%, rgba(30,90,200,0.24), transparent 70%)",
        }}
      />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}