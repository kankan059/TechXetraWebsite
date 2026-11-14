"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { heroData } from "@/data/info/hero";
import { TECHXETRA_COLORS } from "@/constants/colors";
import HeroTitle from "./HeroTitle";
import BackGround from "@/components/animations/BackGround";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Phones, tablets and any touch-first device get the lightweight rendering path. */
const LITE_QUERY = "(max-width: 1023px), (pointer: coarse)";

const FONT = {
  display: "font-roboto",
  body: "font-roboto",
  accent: "font-pixel",
} as const;

const COPY = {
  tagline: "Leave the known. Chase the North Star.",
  cover: "A new dimension",
} as const;

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
  center: "items-end justify-center text-center",
};

/* ------------------------------------------------------------------ */
/* Timeline (units are scrubbed across the full scroll distance)       */
/* ------------------------------------------------------------------ */
const INTRO_HOLD = 0.15;
const COVER_OUT = 0.5;
const STORY_START = INTRO_HOLD + COVER_OUT;
const CHAPTER = 0.82;
const TAIL_HOLD = 0.55;
const LAST = stories.length - 1;
const chapterAt = (i: number) => STORY_START + i * CHAPTER;
const END_TIME = chapterAt(LAST) + 0.5 + TAIL_HOLD;
const TOTAL = END_TIME + 0.01;

/** Chapter start times, so the scene and the copy always share one clock. */
const CH = stories.map((_, i) => chapterAt(i));

/* ------------------------------------------------------------------ */
/* Story to scene                                                      */
/*  Every world has its limits   a known world, alone in the dark      */
/*  A new beginning              the world ignites and is reborn       */
/*  Leave what you know          we pull away and fly through          */
/*  The path is unwritten        loose stars and a dashed outline of   */
/*                               the route drift in open depth         */
/*  Chase the North Star         a route is traced node to node, a     */
/*                               pulse runs ahead and the North Star   */
/*                               locks on at the end of the route      */
/*  Become more than before      the route dissolves, every node       */
/*                               becomes a star and glides into orbit  */
/*                               around the North Star                 */
/*  EXODUS                       the North Star blooms into a full     */
/*                               star and we launch toward it          */
/* ------------------------------------------------------------------ */
type SceneState = { t: number; burst: number };

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (v: number, a: number, b: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function sprite(size: number, stops: ReadonlyArray<readonly [number, string]>) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** A four point sparkle with a soft halo. Optional short diagonal rays make it read as a proper star. */
function spark(size: number, rgb: string, glow: number, diag: number, pinch: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const m = size / 2;
  const halo = g.createRadialGradient(m, m, 0, m, m, m);
  halo.addColorStop(0, `rgba(${rgb},${glow})`);
  halo.addColorStop(0.2, `rgba(${rgb},${glow * 0.35})`);
  halo.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  const blade = (len: number, rot: number) => {
    g.save();
    g.translate(m, m);
    g.rotate(rot);
    const fill = g.createRadialGradient(0, 0, 0, 0, 0, len);
    fill.addColorStop(0, "rgba(255,255,255,1)");
    fill.addColorStop(0.3, `rgba(${rgb},0.9)`);
    fill.addColorStop(1, `rgba(${rgb},0)`);
    const q = len * pinch;
    g.beginPath();
    g.moveTo(0, -len);
    g.quadraticCurveTo(q, -q, len, 0);
    g.quadraticCurveTo(q, q, 0, len);
    g.quadraticCurveTo(-q, q, -len, 0);
    g.quadraticCurveTo(-q, -q, 0, -len);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.restore();
  };
  blade(m * 0.98, 0);
  if (diag > 0) blade(m * diag, Math.PI / 4);
  return c;
}

/** A hairline that fades out at both ends, used for the lens lines through the North Star. */
function hairSprite() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 2;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, "rgba(160,215,255,0)");
  grad.addColorStop(0.5, "rgba(240,250,255,1)");
  grad.addColorStop(1, "rgba(160,215,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 2);
  return c;
}

/**
 * The signal network. Each node is x, y (unit space, y down), z (depth used for the
 * scattered look of the unwritten sky) and a size multiplier.
 * The first nine nodes are the route, walked in order. The last of them is the North Star.
 * The remaining nodes are loose stars that join the orbit when we become more than before.
 */
const NET = new Float32Array([
  -0.92, 0.62, 0.7, 1,
  -0.62, 0.3, -0.6, 1.1,
  -0.36, 0.56, 0.8, 1,
  -0.14, 0.14, -0.8, 1.3,
  0.08, 0.36, 0.5, 1,
  0.18, -0.12, -0.7, 1.2,
  0.4, 0.04, 0.9, 1,
  0.34, -0.46, -0.4, 1.1,
  0.62, -0.74, -0.5, 1.5,
  -0.34, -0.24, 0.6, 0.9,
  -0.78, -0.22, -0.7, 0.9,
  0.7, 0.52, 0.7, 0.9,
  0.92, -0.06, -0.6, 1,
  0.04, -0.58, 0.8, 0.9,
  -0.3, -0.76, -0.5, 0.9,
  0.94, -0.52, 0.6, 0.9,
  -0.04, 0.82, -0.7, 0.9,
]);
const NET_N = NET.length / 4;
const ROUTE_N = 9;
const ROUTE_E = ROUTE_N - 1;
const NORTH = ROUTE_N - 1;
/** Orbit radii, as fractions of the widest orbit, used when the route dissolves into orbiting stars. */
const ORB = [0.4, 0.7, 1];
const DASH_NONE: number[] = [];
const DASH_PATH = [2, 7];

function createScene(canvas: HTMLCanvasElement, lite: boolean, full: boolean, st: SceneState) {
  const ctx = canvas.getContext("2d")!;

  const L = 2600; // length of the repeating star tunnel
  const CAM_END = 4200; // how far the camera travels over the whole story
  const camAt = (u: number) => CAM_END * clamp((u - INTRO_HOLD) / (END_TIME - INTRO_HOLD));

  // Tunnel stars.
  const N = lite ? 380 : 900;
  const SX = new Float32Array(N);
  const SY = new Float32Array(N);
  const SZ = new Float32Array(N);
  const P = new Float32Array(N * 4);
  const B = new Uint8Array(N);
  {
    const r = rng(11);
    for (let i = 0; i < N; i++) {
      const a = r() * TAU;
      const rad = 160 + Math.sqrt(r()) * 1650;
      SX[i] = Math.cos(a) * rad;
      SY[i] = Math.sin(a) * rad;
      SZ[i] = r() * L;
    }
  }
  const STAR_W = [0.7, 1.1, 1.6, 2.2];
  const STAR_C = ["rgba(150,170,240,0.5)", "rgba(205,217,255,0.7)", "rgba(255,255,255,0.9)", "rgba(255,238,200,1)"];

  // The known world: dots on a sphere. Ocean is sparse, land clusters are dense.
  const GX: number[] = [];
  const GY: number[] = [];
  const GZ: number[] = [];
  {
    const r = rng(5);
    const cand = lite ? 340 : 760;
    for (let i = 0; i < cand; i++) {
      const y = 1 - (i / (cand - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      const n = Math.sin(x * 3.1 + 1.2) * Math.sin(y * 2.7 - 0.4) + Math.sin(z * 3.7 + 2.0) * 0.6;
      if (n < 0.05 && r() > 0.22) continue;
      GX.push(x);
      GY.push(y);
      GZ.push(z);
    }
  }
  const G = GX.length;
  const GP = new Float32Array(G * 2);
  const GB = new Uint8Array(G);
  const GCOL = ["rgba(120,150,230,0.3)", "rgba(150,175,245,0.6)", "rgba(195,212,255,0.88)", "rgba(246,248,255,1)"];
  const GW = [0.9, 1.2, 1.5, 2];

  // Network working buffers (no allocations per frame).
  const CPX = new Float32Array(NET_N);
  const CPY = new Float32Array(NET_N);
  const LIT = new Float32Array(NET_N);
  const DEP = new Float32Array(NET_N);
  const TPX = new Float32Array(NET_N);
  const TPY = new Float32Array(NET_N);
  let RPX = 0;
  let RPY = 0;

  const nodeStar = spark(96, "200,228,255", 0.28, 0.4, 0.06);
  const northStar = spark(256, "225,242,255", 0.42, 0.45, 0.035);
  const glow = sprite(128, [
    [0, "rgba(240,250,255,1)"],
    [0.12, "rgba(170,225,255,0.7)"],
    [0.4, "rgba(90,170,255,0.14)"],
    [1, "rgba(90,170,255,0)"],
  ]);
  const hair = hairSprite();
  const worldGlow = sprite(128, [
    [0, "rgba(110,150,255,0.34)"],
    [0.55, "rgba(70,100,220,0.12)"],
    [1, "rgba(70,100,220,0)"],
  ]);
  const worldFire = sprite(128, [
    [0, "rgba(255,226,160,0.5)"],
    [0.5, "rgba(242,190,110,0.16)"],
    [1, "rgba(242,190,110,0)"],
  ]);

  let w = 0;
  let h = 0;
  let dpr = 1;
  let s = 0;
  let f = 0;
  let portrait = false;

  let lastCam = 0;
  let sp = 0;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    w = Math.round(r.width);
    h = Math.round(r.height);
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    const maxPx = lite ? 1.4e6 : 3.4e6;
    dpr = Math.max(1, Math.min(dpr, Math.sqrt(maxPx / (w * h))));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    s = Math.min(w, h * 1.15);
    f = s * 0.9;
    portrait = h > w * 1.05;
  };

  const pointer = (nx: number, ny: number) => {
    tx = nx;
    ty = ny;
  };

  const render = (now: number) => {
    if (!w || !h) return;
    const u = st.t;
    const camZ = camAt(u);
    sp = sp * 0.8 + Math.abs(camZ - lastCam) * 0.2;
    lastCam = camZ;

    const burst = st.burst;
    const launch = sm(u, CH[LAST], CH[LAST] + 0.55);
    const warp = full ? Math.min(sp * 7 + burst * 700 + launch * 420, 1100) : 0;
    const fov = f * (1 + burst * 0.1 + launch * 0.05);
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    const vx = w / 2 - px * 22;
    const vy = h / 2 - py * 14;
    const roll = full ? Math.sin((u / TOTAL) * TAU) * 0.03 + burst * 0.03 : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (roll) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(roll);
      ctx.translate(-w / 2, -h / 2);
    }
    ctx.lineCap = "round";

    /* ---- Tunnel stars, streaked by scroll speed ---- */
    for (let i = 0; i < N; i++) {
      let d = (((SZ[i] - camZ) % L) + L) % L;
      if (d < 60) d += L;
      const k = fov / d;
      const x1 = vx + SX[i] * k;
      const y1 = vy + SY[i] * k;
      if (x1 < -40 || x1 > w + 40 || y1 < -40 || y1 > h + 40) {
        B[i] = 255;
        continue;
      }
      const k2 = fov / (d + warp);
      const o = i * 4;
      P[o] = vx + SX[i] * k2;
      P[o + 1] = vy + SY[i] * k2;
      P[o + 2] = x1;
      P[o + 3] = y1;
      B[i] = d < 500 ? 3 : d < 1100 ? 2 : d < 1800 ? 1 : 0;
    }
    for (let b = 0; b < 4; b++) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        if (B[i] !== b) continue;
        const o = i * 4;
        ctx.moveTo(P[o], P[o + 1]);
        ctx.lineTo(P[o + 2] + 0.2, P[o + 3] + 0.2);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = STAR_W[b];
      ctx.strokeStyle = STAR_C[b];
      ctx.stroke();
    }

    /* ---- The known world, held inside its limit ring, then reborn ---- */
    const gIn = sm(u, INTRO_HOLD + 0.2, INTRO_HOLD + 0.7);
    const rec = sm(u, CH[2], CH[2] + 0.8);
    const aG = gIn * (1 - rec);
    const reb = sm(u, CH[1], CH[1] + 0.45);
    const R = 250;
    const gd = 1500 - 500 * gIn + rec * 4200;
    const side = mix(0.22, -0.22, sm(u, CH[0] + 0.5, CH[1] + 0.1)) * (portrait ? 0.4 : 1);
    const gsx = mix(vx + side * w, vx, rec * 0.8);
    const gsy = mix(portrait ? h * 0.73 : vy, vy, rec * 0.8);
    const scale = portrait ? 0.82 : 1;
    const rpx = ((fov * R) / gd) * scale;

    if (aG > 0.01) {
      const spin = (full ? now * 0.12 : 0) + u * 0.55;
      const cyw = Math.cos(spin);
      const syw = Math.sin(spin);
      const ct = Math.cos(0.38);
      const st2 = Math.sin(0.38);
      const cp = Math.cos(0.3);
      const sp2 = Math.sin(0.3);

      ctx.globalCompositeOperation = "lighter";
      const gs = rpx * 3.6;
      ctx.globalAlpha = 0.9 * aG;
      ctx.drawImage(worldGlow, gsx - gs / 2, gsy - gs / 2, gs, gs);
      if (reb > 0.01) {
        ctx.globalAlpha = reb * aG;
        ctx.drawImage(worldFire, gsx - gs / 2, gsy - gs / 2, gs, gs);
      }
      ctx.globalCompositeOperation = "source-over";

      for (let i = 0; i < G; i++) {
        const x1 = GX[i] * cyw + GZ[i] * syw;
        const z1 = -GX[i] * syw + GZ[i] * cyw;
        const x2 = x1 * ct - GY[i] * st2;
        const y2 = x1 * st2 + GY[i] * ct;
        const y3 = y2 * cp - z1 * sp2;
        const z3 = y2 * sp2 + z1 * cp;
        const k = (fov / (gd + z3 * R)) * R * scale;
        GP[i * 2] = gsx + x2 * k;
        GP[i * 2 + 1] = gsy + y3 * k;
        const l = x2 * -0.55 + y3 * -0.5 + z3 * -0.67;
        GB[i] = z3 > 0 ? 0 : l > 0.55 ? 3 : l > 0.15 ? 2 : 1;
      }
      ctx.globalAlpha = aG;
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        for (let i = 0; i < G; i++) {
          if (GB[i] !== b) continue;
          ctx.moveTo(GP[i * 2], GP[i * 2 + 1]);
          ctx.lineTo(GP[i * 2] + 0.2, GP[i * 2 + 1] + 0.2);
        }
        ctx.lineWidth = GW[b] * scale * (rpx / 250 + 0.4);
        ctx.strokeStyle = reb > 0.5 && b > 1 ? "rgba(255,232,180,0.95)" : GCOL[b];
        ctx.stroke();
      }

    }

    /* ---- A star chart grid, the route to the North Star, then the orbits it becomes ---- */
    const cA = sm(u, CH[2] + 0.5, CH[3] + 0.25);
    if (cA > 0.01) {
      const U = Math.min(portrait ? w * 0.46 : s * 0.3, h * 0.3);

      // Where the network sits and how large it is, per chapter, so it never fights the copy.
      const m6 = portrait ? 0.6 : 0.55;
      const Um6 = U * m6;
      const x3 = portrait ? vx : vx + w * 0.2;
      const y3 = portrait ? h * 0.68 : vy + h * 0.02;
      const m3 = portrait ? 0.85 : 1;
      const x4 = vx;
      const y4 = portrait ? h * 0.62 : vy + h * 0.1;
      const m4 = portrait ? 0.8 : 0.78;
      const x5 = portrait ? vx : vx - w * 0.2;
      const y5 = y3;
      const m5 = m3;
      // On arrival the North Star hangs near the top, with the network below it.
      const x6 = vx - NET[NORTH * 4] * Um6;
      const y6 = h * 0.27 - NET[NORTH * 4 + 1] * Um6;

      const b34 = sm(u, CH[3] + 0.55, CH[4] + 0.1);
      const b45 = sm(u, CH[4] + 0.65, CH[5] + 0.1);
      const b56 = sm(u, CH[5] + 0.65, CH[6] + 0.1);
      const Cx = mix(mix(mix(x3, x4, b34), x5, b45), x6, b56) - px * 10;
      const Cy = mix(mix(mix(y3, y4, b34), y5, b45), y6, b56) - py * 6;
      const Um = U * mix(mix(mix(m3, m4, b34), m5, b45), m6, b56);

      // The sky starts scattered in depth, then settles into one flat, readable network.
      const settle = sm(u, CH[3] + 0.05, CH[5] + 0.2);
      const zamp = 1 - sm(u, CH[4] + 0.2, CH[5] + 0.3);
      const yaw = mix(1.0, 0, settle) + (full ? Math.sin(now * 0.35) * 0.05 * sm(u, CH[5], CH[5] + 0.3) : 0);
      const cYaw = Math.cos(yaw);
      const sYaw = Math.sin(yaw);
      const D = 3.2;
      for (let i = 0; i < NET_N; i++) {
        const X = NET[i * 4];
        const Y = NET[i * 4 + 1];
        const Z = NET[i * 4 + 2] * zamp;
        const xr = X * cYaw + Z * sYaw;
        const zr = -X * sYaw + Z * cYaw;
        const k = D / (D - zr);
        CPX[i] = Cx + xr * k * Um;
        CPY[i] = Cy + Y * k * Um;
      }
      const nx = CPX[NORTH];
      const ny = CPY[NORTH];

      // Story clocks.
      const lp = ROUTE_E * sm(u, CH[4] + 0.05, CH[4] + 0.8); // how far the route has been traced
      const ign = sm(u, CH[4] + 0.5, CH[4] + 0.9); // the North Star ignites when the route arrives
      const hint = sm(u, CH[3] + 0.45, CH[4]); // a faint shimmer where the route will end
      const dash = sm(u, CH[3] + 0.15, CH[3] + 0.7); // the unwritten path, drawn as a dashed outline
      const morph = sm(u, CH[5] + 0.05, CH[5] + 0.85); // the route dissolves into orbiting stars
      const more = sm(u, CH[5], CH[5] + 0.7); // every star swells
      const fin = launch; // the final bloom
      const lineFade = 1 - clamp(morph * 2.2);
      const spin = full ? now * 0.00022 : u * 0.7;
      const tm = full ? now * 0.0003 : u * 2;

      // Orbit geometry, fitted to the space around the North Star so it never leaves the screen.
      const Rmax = Math.max(U * 0.9, Math.min(U * 2.1, nx * 0.94, (w - nx) * 0.94));
      const Rr = Rmax * (1 - 0.45 * fin);
      const conv = fin * fin * 2.4;
      const ratio = 0.4;
      const tilt = -0.28;
      const cT = Math.cos(tilt);
      const sT = Math.sin(tilt);

      for (let k = 0; k < NET_N; k++) LIT[k] = k < ROUTE_N ? (k === 0 ? clamp(lp * 2) : clamp(lp - (k - 1))) : 0;
      for (let i = 0; i < NET_N; i++) {
        DEP[i] = 1;
        TPX[i] = CPX[i];
        TPY[i] = CPY[i];
        if (i === NORTH) continue;
        if (i > NORTH) LIT[i] = morph;
        if (morph <= 0) continue;
        const k = i < NORTH ? i : i - 1;
        const j = k % 3;
        const dir = j === 1 ? -1 : 1;
        const a = k * 2.39996 + (spin * (1.3 - j * 0.3) + conv) * dir;
        const rj = Rr * ORB[j];
        const ca = Math.cos(a) * rj;
        const sa = Math.sin(a) * rj * ratio;
        const cb = Math.cos(a - 0.22 * dir) * rj;
        const sb = Math.sin(a - 0.22 * dir) * rj * ratio;
        TPX[i] = mix(TPX[i], nx + cb * cT - sb * sT, morph);
        TPY[i] = mix(TPY[i], ny + cb * sT + sb * cT, morph);
        CPX[i] = mix(CPX[i], nx + ca * cT - sa * sT, morph);
        CPY[i] = mix(CPY[i], ny + ca * sT + sa * cT, morph);
        DEP[i] = 1 + Math.sin(a) * 0.3 * morph;
      }

      ctx.setLineDash(DASH_NONE);

      // The unwritten path: a faint dashed outline of where the route will go.
      if (dash > 0.01 && lineFade > 0.01) {
        ctx.setLineDash(DASH_PATH);
        ctx.beginPath();
        for (let e = 0; e < ROUTE_E; e++) {
          ctx.moveTo(CPX[e], CPY[e]);
          ctx.lineTo(CPX[e + 1], CPY[e + 1]);
        }
        ctx.globalAlpha = 0.24 * dash * cA * lineFade * (1 - 0.7 * (lp / ROUTE_E));
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(170,222,255,1)";
        ctx.stroke();
        ctx.setLineDash(DASH_NONE);
      }

      // Orbit paths: hairlines with a slow highlight riding each one.
      if (morph > 0.01) {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(170,222,255,1)";
        ctx.globalAlpha = 0.16 * morph * cA;
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
          ctx.moveTo(nx + Rr * ORB[j] * cT, ny + Rr * ORB[j] * sT);
          ctx.ellipse(nx, ny, Rr * ORB[j], Rr * ORB[j] * ratio, tilt, 0, TAU);
        }
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(210,238,255,1)";
        for (let j = 0; j < 3; j++) {
          const dir = j === 1 ? -1 : 1;
          const a0 = (spin * (1.3 - j * 0.3) + conv) * dir + j * 2.1;
          const a1 = a0 + (0.9 + j * 0.35) * dir;
          ctx.globalAlpha = 0.55 * morph * cA * (1 - 0.3 * fin);
          ctx.beginPath();
          ctx.ellipse(nx, ny, Rr * ORB[j], Rr * ORB[j] * ratio, tilt, Math.min(a0, a1), Math.max(a0, a1));
          ctx.stroke();
        }
      }

      // The route, traced node to node. It fades as the stars take their orbits.
      if (lp > 0.01 && lineFade > 0.01) {
        const la = cA * lineFade;
        ctx.beginPath();
        for (let e = 0; e < ROUTE_E; e++) {
          const p = clamp(lp - e);
          if (p <= 0) break;
          ctx.moveTo(CPX[e], CPY[e]);
          ctx.lineTo(mix(CPX[e], CPX[e + 1], p), mix(CPY[e], CPY[e + 1], p));
        }
        ctx.globalAlpha = la * 0.1;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(120,200,255,1)";
        ctx.stroke();
        ctx.globalAlpha = la * 0.8;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(196,232,255,1)";
        ctx.stroke();
      }

      // Short trails behind orbiting stars.
      if (morph > 0.05) {
        ctx.beginPath();
        for (let i = 0; i < NET_N; i++) {
          if (i === NORTH) continue;
          ctx.moveTo(CPX[i], CPY[i]);
          ctx.lineTo(TPX[i], TPY[i]);
        }
        ctx.globalAlpha = 0.4 * morph * cA;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(170,222,255,1)";
        ctx.stroke();
      }

      // Every node is a small, crisp star.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < NET_N; i++) {
        if (i === NORTH) continue;
        const lit = LIT[i];
        const tw = full ? 0.88 + 0.12 * Math.sin(now * 2 + i * 1.7) : 1;
        const size = clamp(U * 0.085 * NET[i * 4 + 3] * (0.55 + 0.45 * lit) * (1 + 0.35 * more) * DEP[i], 9, 28);
        ctx.globalAlpha = clamp(cA * (0.35 + 0.65 * lit) * tw * (1 + (DEP[i] - 1) * 1.2) * (1 - 0.1 * fin));
        ctx.drawImage(nodeStar, CPX[i] - size / 2, CPY[i] - size / 2, size, size);
      }

      // Small signals travel along the finished route before it dissolves.
      if (lineFade > 0.01) {
        const ps = clamp(U * 0.035, 5, 9);
        ctx.globalAlpha = 0.85 * cA * lineFade;
        for (let e = 0; e < ROUTE_E; e++) {
          if (clamp(lp - e) < 1) break;
          const t2 = (tm + e * 0.21) % 1;
          ctx.drawImage(glow, mix(CPX[e], CPX[e + 1], t2) - ps / 2, mix(CPY[e], CPY[e + 1], t2) - ps / 2, ps, ps);
        }
      }

      // The head of the route: a small comet with a short tail.
      if (lp > 0.01 && lp < ROUTE_E) {
        for (let k = 0; k < 7; k++) {
          const p = Math.max(0, lp - k * 0.07);
          const e = Math.min(ROUTE_E - 1, Math.floor(p));
          const fr = p - e;
          RPX = mix(CPX[e], CPX[e + 1], fr);
          RPY = mix(CPY[e], CPY[e + 1], fr);
          const cs = clamp(U * 0.1, 12, 24) * (1 - k * 0.12);
          ctx.globalAlpha = cA * (1 - k * 0.14);
          ctx.drawImage(glow, RPX - cs / 2, RPY - cs / 2, cs, cs);
        }
      }

      // Ripples leave the North Star the moment the route arrives.
      if (ign > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(190,228,255,1)";
        for (let r = 0; r < 2; r++) {
          const t3 = clamp((u - (CH[4] + 0.7) - r * 0.18) / 0.55);
          if (t3 <= 0 || t3 >= 1) continue;
          ctx.globalAlpha = (1 - t3) * 0.35 * cA;
          ctx.beginPath();
          ctx.arc(nx, ny, U * (0.12 + t3 * 1.5), 0, TAU);
          ctx.stroke();
        }
      }

      // The North Star: a faint pinpoint in the unwritten sky, then a sharp, refined star once the route arrives.
      const base = clamp(U * 0.42, 52, 112);
      const nsz = base * (0.2 * hint * (1 - ign) + ign) * (1 + 0.15 * more + 1.3 * fin) * (full ? 1 + Math.sin(now * 2.2) * 0.03 : 1);
      ctx.globalAlpha = cA * (0.3 * hint * (1 - ign) + ign);
      if (nsz > 4) ctx.drawImage(northStar, nx - nsz / 2, ny - nsz / 2, nsz, nsz);
      if (ign > 0.01) {
        const core = nsz * 0.22;
        ctx.globalAlpha = 0.9 * ign * cA;
        ctx.drawImage(glow, nx - core / 2, ny - core / 2, core, core);
      }

      // Lens lines through the North Star, long and thin.
      const fl = base * 1.1 * ign + s * 0.4 * fin;
      if (fl > 2) {
        ctx.globalAlpha = (0.5 * ign + 0.3 * fin) * cA;
        ctx.drawImage(hair, nx - fl, ny - 1, fl * 2, 2);
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(hair, -fl, -1, fl * 2, 2);
        ctx.restore();
      }

      if (fin > 0.01) {
        const big = Math.max(w, h) * 0.5 * fin;
        ctx.globalAlpha = 0.3 * fin;
        ctx.drawImage(glow, nx - big / 2, ny - big / 2, big, big);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  resize();
  return { render, resize, pointer };
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

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(LITE_QUERY);
    setIsLite(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLite(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  useEffect(() => {
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
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
      html.style.scrollBehavior = prevBehavior;
    };
  }, [assetsReady]);

  // The story is drawn, not loaded, so only fonts gate the start.
  useEffect(() => {
    let cancelled = false;
    const minLoaderTime = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 700);
    });
    const fontsReady =
      "fonts" in document
        ? document.fonts.ready.then(() => undefined).catch(() => undefined)
        : Promise.resolve();
    Promise.all([fontsReady, minLoaderTime]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    const canvas = root.querySelector<HTMLCanvasElement>(".exodus-canvas");
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const full = !reducedMotion;

    let lenis: Lenis | null = null;
    let lenisTicker: ((time: number) => void) | null = null;

    // The scene is redrawn by the GSAP ticker only while the section is on screen.
    const state: SceneState = { t: 0, burst: 0 };
    const scene = createScene(canvas, lite, full, state);
    let active = true;
    let master: gsap.core.Timeline | null = null;
    let target = 0;
    let cur = 0;
    const tick = (time: number, dt: number) => {
      // The story clock chases the scroll position but can never move faster than the cap,
      // so a fast fling or a jump in scroll still plays every chapter in order.
      const sec = Math.min(dt, 64) / 1000;
      const diff = target - cur;
      if (Math.abs(diff) > 0.00002) {
        const ease = 1 - Math.exp(-sec * (lite ? 6 : 8));
        const cap = sec * 0.4;
        cur += clamp(diff * ease, -cap, cap);
      } else {
        cur = target;
      }
      state.t = cur * TOTAL;
      if (master) master.progress(cur);
      if (active) scene.render(time);
    };
    gsap.ticker.add(tick);

    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scene.resize();
        scene.render(gsap.ticker.time);
      });
    });
    ro.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      scene.pointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    };
    if (!lite && full) window.addEventListener("pointermove", onPointer, { passive: true });

    const ctx = gsap.context(() => {
      const copies = gsap.utils.toArray<HTMLElement>(".exodus-copy", root);
      const coverContent = root.querySelector<HTMLElement>(".exodus-cover-content");
      const hint = root.querySelector<HTMLElement>(".exodus-scroll-hint");
      const cueDot = root.querySelector<HTMLElement>(".exodus-cue-dot");
      const flash = root.querySelector<HTMLElement>(".exodus-flash");
      const nebA = root.querySelector<HTMLElement>(".exodus-neb-a");
      const nebB = root.querySelector<HTMLElement>(".exodus-neb-b");
      const prog = root.querySelector<HTMLElement>(".exodus-progress");
      const progFill = root.querySelector<HTMLElement>(".exodus-progress-fill");

      if (full) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false });
        lenis.on("scroll", ScrollTrigger.update);
        lenisTicker = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(lenisTicker);
        gsap.ticker.lagSmoothing(0);
      }

      const copyParts = copies.map((copy) => ({
        words: Array.from(copy.querySelectorAll<HTMLElement>(".tx-word")),
        body: copy.querySelector<HTMLElement>(".tx-body"),
        rule: copy.querySelector<HTMLElement>(".tx-rule"),
      }));

      gsap.set(copies, { autoAlpha: 0 });
      if (flash) gsap.set(flash, { autoAlpha: 0 });
      if (nebB) gsap.set(nebB, { autoAlpha: 0 });
      if (prog) gsap.set(prog, { autoAlpha: 0 });
      copyParts.forEach(({ words, body, rule }) => {
        if (body) gsap.set(body, { autoAlpha: 0 });
        if (rule) gsap.set(rule, { scaleX: 0, transformOrigin: "var(--rule-origin, left center)" });
        gsap.set(words, { yPercent: full ? 115 : 0 });
      });

      if (full && cueDot) {
        gsap.fromTo(cueDot, { y: -12 }, { y: 48, duration: 1.6, ease: "power1.inOut", repeat: -1 });
      }

      const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      master = tl;

      const trig = ScrollTrigger.create({
        id: "TECHXETRA-EXODUS",
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          target = self.progress;
        },
        onRefresh: (self) => {
          target = self.progress;
        },
        onToggle: (self) => {
          active = self.isActive;
        },
      });
      target = trig.progress;
      cur = target;


      /* ---- Cover: we fly through it and leave the known behind ---- */
      if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.1 }, 0);
      if (coverContent) {
        tl.to(
          coverContent,
          { autoAlpha: 0, ...(full ? { scale: 1.14 } : {}), duration: COVER_OUT, ease: "power1.in" },
          INTRO_HOLD
        );
      }

      if (prog && progFill) {
        tl.to(prog, { autoAlpha: 1, duration: 0.2 }, STORY_START);
        tl.fromTo(progFill, { scaleY: 0 }, { scaleY: 1, duration: TOTAL - STORY_START, ease: "none" }, STORY_START);
      }

      // Nebulae drift behind the scene; the warm one arrives with the North Star.
      if (nebA) tl.to(nebA, { xPercent: -10, yPercent: -7, scale: 1.25, duration: TOTAL }, 0);
      if (nebB) {
        tl.fromTo(nebB, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, ease: "power1.inOut" }, chapterAt(4));
        tl.fromTo(nebB, { xPercent: 8, yPercent: 6 }, { xPercent: -6, yPercent: -4, duration: TOTAL - chapterAt(4) }, chapterAt(4));
      }

      /* ---- Chapters ---- */
      stories.forEach((story, i) => {
        const at = chapterAt(i);
        const prev = stories[i - 1];
        const parts = copyParts[i];

        if (prev) {
          tl.to(copies[i - 1], { autoAlpha: 0, duration: 0.12 }, at);
          // Between artworks the camera jumps: a streak burst, a field-of-view punch and a soft flash.
          if (prev.page !== story.page) {
            tl.to(state, { burst: 1, duration: 0.16, ease: "power2.out" }, at - 0.08);
            tl.to(state, { burst: 0, duration: 0.42, ease: "power2.inOut" }, at + 0.08);
            if (flash) {
              tl.to(flash, { autoAlpha: 0.55, duration: 0.14 }, at - 0.04);
              tl.to(flash, { autoAlpha: 0, duration: 0.34 }, at + 0.1);
            }
          }
        }

        const enterAt = at + 0.08;
        tl.fromTo(copies[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, enterAt);

        if (parts.words.length && full) {
          tl.fromTo(
            parts.words,
            { yPercent: 115 },
            { yPercent: 0, duration: 0.32, stagger: 0.05, ease: "power3.out" },
            enterAt
          );
        }

        if (parts.rule) {
          tl.fromTo(parts.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.26, ease: "power2.out" }, enterAt + 0.08);
        }

        if (parts.body) {
          tl.fromTo(
            parts.body,
            { autoAlpha: 0, ...(full ? { y: 14 } : {}) },
            { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" },
            enterAt + 0.14
          );
        }
      });

      tl.to({}, { duration: 0.0001 }, TOTAL - 0.0001);

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => {
      ctx.revert();
      master = null;
      active = false;
      gsap.ticker.remove(tick);
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
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
      <BackGround />
      {!loaderGone && (
        <div
          aria-live="polite"
          aria-label={assetsReady ? "TechXetra ready" : "Loading TechXetra"}
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-500 ${
            assetsReady ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
          }`}
        >
          <div className="mb-8 h-px w-28 overflow-hidden bg-white/15">
            <div ref={loaderBarRef} className="h-full w-1/2 bg-[#e8d6a5]" />
          </div>
          <p className={`${FONT.display} text-xl tracking-[0.24em] text-[#f3ead4] sm:text-2xl`}>TECHXETRA</p>
          <p className={`${FONT.accent} mt-3 text-[9px] uppercase tracking-[0.22em] text-white/50`}>
            {assetsReady ? "The journey begins" : "Preparing the journey"}
          </p>
        </div>
      )}

      <section
        ref={rootRef}
        id="hero"
        style={colorVariables}
        className={`relative ${lite ? "h-[640svh]" : "h-[700svh]"} text-[#e6ecff]`}
      >
        <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#030610]">
          {/* Deep-space colour: two slow nebulae behind the scene. */}
          <div
            aria-hidden="true"
            className="exodus-neb-a pointer-events-none absolute -inset-[20%] z-[1]"
            style={{
              background:
                "radial-gradient(38% 34% at 28% 38%, rgba(40,80,210,0.30), transparent 70%), radial-gradient(34% 30% at 74% 66%, rgba(20,130,170,0.16), transparent 70%)",
              willChange: lite ? undefined : "transform",
            }}
          />
          <div
            aria-hidden="true"
            className="exodus-neb-b pointer-events-none absolute -inset-[20%] z-[1]"
            style={{
              background:
                "radial-gradient(36% 30% at 24% 28%, rgba(60,170,230,0.20), transparent 70%), radial-gradient(30% 28% at 70% 70%, rgba(100,90,230,0.16), transparent 70%)",
              willChange: lite ? undefined : "transform",
            }}
          />

          {/* The journey: the known world, the open sky, the route and the North Star. */}
          <canvas aria-hidden="true" className="exodus-canvas absolute inset-0 z-10 h-full w-full" />

          <div
            aria-hidden="true"
            className="exodus-flash pointer-events-none absolute inset-0 z-[14] bg-[radial-gradient(circle_at_50%_50%,rgba(207,217,255,0.5)_0%,transparent_62%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[15] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,3,10,0.7)_100%)]"
          />
          <div
            aria-hidden="true"
            className="exodus-progress pointer-events-none absolute right-3 top-1/2 z-[25] h-24 w-px -translate-y-1/2 bg-white/15 sm:right-6 sm:h-32"
          >
            <span className="exodus-progress-fill absolute inset-0 origin-top bg-[#9ad7ff]" />
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
                story.position === "right" ? "ml-auto" : story.position === "center" ? "mx-auto" : "";
              const ruleOrigin =
                story.position === "right" ? "right center" : story.position === "center" ? "center" : "left center";
              return (
                <article
                  key={story.title}
                  className={`exodus-copy absolute inset-0 flex px-6 pb-[16svh] sm:px-12 md:px-20 lg:px-28 ${positionClasses[story.position]}`}
                >
                  <div className="relative w-full max-w-3xl">
                    {!isFinal && (
                      <span
                        aria-hidden="true"
                        className={`tx-rule mb-5 block h-px w-14 bg-white/55 sm:mb-6 sm:w-20 ${align}`}
                        style={{ "--rule-origin": ruleOrigin } as CSSProperties}
                      />
                    )}
                    <h2
                      className={`${
                        isFinal
                          ? `${FONT.accent} text-[clamp(2.75rem,12vw,9rem)] leading-none tracking-[0.1em]`
                          : `${FONT.display} text-[clamp(2.25rem,6.2vw,5.75rem)] font-light leading-[1.04] tracking-[-0.03em]`
                      } text-[#f7f8ff] [text-shadow:0_2px_4px_rgba(0,0,0,0.7)] lg:[text-shadow:0_3px_18px_rgba(0,0,0,0.85)]`}
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
        </div>
      </section>
    </>
  );
}