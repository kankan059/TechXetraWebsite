"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type Palette = "dark" | "light";

interface TeamCardProps {
    avatarUrl?: string;
    iconUrl?: string;
    miniAvatarUrl?: string;
    name?: string;
    title?: string;
    handle?: string;
    email?: string;
    instagram?: string; // handle or full URL (optional)
    phone?: string; // optional
    showIcons?: boolean; // icon tiles for email / instagram / call (default true)
    status?: string;
    statusColor?: string;
    contactText?: string;
    showUserInfo?: boolean;
    onContactClick?: () => void;
    theme?: Palette;
    backdropColor?: string;
    radius?: number;
    holo?: number;
    glare?: number;
    enableTilt?: boolean;
    tiltStrength?: number;
    parallax?: number;
    enableMobileTilt?: boolean;
    mobileTiltSensitivity?: number;
    intro?: boolean;
    priority?: boolean;
    className?: string;
}

interface Engine {
    aim: (nx: number, ny: number, on?: boolean) => void;
    release: () => void;
    write: () => void;
}

type OrientationPermission = {
    requestPermission?: () => Promise<PermissionState>;
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

/* ------------------------------------------------------------------ */
/* Constellation figure: lives on the frame, behind the photo          */
/* ------------------------------------------------------------------ */

function figureFor(seedText: string) {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i += 1) {
        seed ^= seedText.charCodeAt(i);
        seed = Math.imul(seed, 16777619);
    }

    const rnd = () => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const round = (n: number) => Number(n.toFixed(1));

    /* Lower panel region (viewBox is 100 by 140) */
    const panel = Array.from({ length: 9 }, () => ({
        x: round(8 + rnd() * 84),
        y: round(104 + rnd() * 30),
        r: Number((0.45 + rnd() * 0.75).toFixed(2)),
    })).sort((a, b) => a.x - b.x);

    /* Thin edge rails on both sides */
    const left = Array.from({ length: 4 }, (_, i) => ({
        x: round(2.2 + rnd() * 0.5),
        y: round(18 + i * 22 + rnd() * 8),
        r: 0.5,
    }));
    const right = Array.from({ length: 4 }, (_, i) => ({
        x: round(97.3 + rnd() * 0.5),
        y: round(24 + i * 22 + rnd() * 8),
        r: 0.5,
    }));

    const toPath = (pts: { x: number; y: number }[]) =>
        pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");

    const chords = [
        `M${panel[0].x} ${panel[0].y} L${panel[4].x} ${panel[4].y}`,
        `M${panel[2].x} ${panel[2].y} L${panel[7].x} ${panel[7].y}`,
    ].join(" ");

    return {
        points: [...panel, ...left, ...right],
        paths: [toPath(panel), toPath(left), toPath(right), chords],
    };
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const ROOT_VARS = {
    "--pc-light-x": "50%",
    "--pc-light-y": "50%",
    "--pc-active": 0,
};

const CSS = `
.tc-root{
  position:relative;width:100%;max-width:320px;margin-inline:auto;
  container-type:inline-size;perspective:1200px;touch-action:pan-y;
  -webkit-tap-highlight-color:transparent;
  font-family:var(--font-roboto,system-ui,sans-serif);
}

.tc-glow{
  position:absolute;inset:-6%;pointer-events:none;border-radius:8cqw;
  background:radial-gradient(circle at var(--pc-light-x) var(--pc-light-y),var(--tc-glow),transparent 62%);
  opacity:calc(.3 + .6 * var(--pc-active));
}

.tc-tilt{
  position:relative;width:100%;aspect-ratio:5/7;
  transform-style:preserve-3d;will-change:transform;
}

/* Frame: angled outer shell with an edge gradient and a constellation inside */
.tc-frame,.tc-frame-fill{
  clip-path:polygon(0 var(--c1),var(--c1) 0,calc(100% - var(--c2)) 0,100% var(--c2),100% calc(100% - var(--c1)),calc(100% - var(--c1)) 100%,var(--c2) 100%,0 calc(100% - var(--c2)));
}
.tc-frame{position:absolute;inset:0;--c1:7cqw;--c2:3.4cqw;background:var(--tc-edge)}
.tc-frame-fill{position:absolute;inset:.7cqw;--c1:6.3cqw;--c2:2.7cqw;background:var(--tc-frame-bg);overflow:hidden}
.tc-frame-fill svg{position:absolute;inset:0;width:100%;height:100%}

.tc-content{
  position:absolute;inset:0;padding:3.6cqw;display:flex;flex-direction:column;gap:2.2cqw;
  transform-style:preserve-3d;
}

/* Name plaque */
.tc-title{flex:none;display:flex;padding:.6cqw;min-height:11cqw;background:var(--tc-edge);transform:translateZ(18px)}
.tc-hex{--c:3.6cqw;clip-path:polygon(var(--c) 0,calc(100% - var(--c)) 0,100% 50%,calc(100% - var(--c)) 100%,var(--c) 100%,0 50%)}
.tc-title-fill{
  --c:3.1cqw;flex:1;min-width:0;display:flex;align-items:center;justify-content:center;
  padding:1.4cqw 6cqw;background:var(--tc-plaque);position:relative;
}
.tc-ticks{position:absolute;top:50%;display:flex;gap:.7cqw;transform:translateY(-50%)}
.tc-ticks.l{left:4.2cqw}.tc-ticks.r{right:4.2cqw;flex-direction:row-reverse}
.tc-ticks i{display:block;width:.7cqw;height:3.4cqw;background:var(--tc-accent);opacity:.9}
.tc-ticks i:nth-child(2){height:2.4cqw;opacity:.6}
.tc-ticks i:nth-child(3){height:1.4cqw;opacity:.35}
.tc-name{
  margin:0;text-align:center;text-wrap:balance;word-break:break-word;
  font-family:var(--font-roboto,system-ui,sans-serif);font-weight:700;
  font-size:max(15px,5.5cqw);line-height:1.12;letter-spacing:-.01em;
  background:linear-gradient(180deg,var(--tc-text) 30%,var(--tc-accent) 160%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}

/* Art window */
.tc-art{flex:1 1 0;min-height:0;display:flex;padding:.6cqw;background:var(--tc-edge);transform:translateZ(10px)}
.tc-cutart{--c:6.4cqw;clip-path:polygon(0 var(--c),var(--c) 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,0 100%)}
.tc-art-fill{--c:5.9cqw;flex:1;position:relative;min-width:0;background:var(--tc-art-bg)}
.tc-abs{position:absolute;inset:0;pointer-events:none}
.tc-neb{background:radial-gradient(ellipse at 50% -10%,var(--tc-glow) 0%,transparent 70%)}
.tc-photo{
  position:absolute;object-fit:cover;object-position:top center;user-select:none;pointer-events:none;
  opacity:0;transition:opacity .5s cubic-bezier(.16,1,.3,1);will-change:transform;
}
.tc-art-fill[data-loaded="1"] .tc-photo{opacity:1}
.tc-initials{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:var(--font-gotham-bold,system-ui,sans-serif);font-size:20cqw;letter-spacing:-.03em;
  color:var(--tc-sub);opacity:.35;
}
.tc-shim{background:var(--tc-art-bg);overflow:hidden}
.tc-shim::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.1) 50%,transparent 70%);
  animation:tc-shim 1.6s ease-in-out infinite;
}
.tc-art-fill[data-loaded="1"] .tc-shim{display:none}
.tc-brk{position:absolute;width:5cqw;height:5cqw;border:0 solid var(--tc-accent);opacity:.85;pointer-events:none}
.tc-brk.tr{top:1.6cqw;right:1.6cqw;border-top-width:.45cqw;border-right-width:.45cqw}
.tc-brk.bl{bottom:1.6cqw;left:1.6cqw;border-bottom-width:.45cqw;border-left-width:.45cqw}

/* Role bar */
.tc-type{flex:none;display:flex;padding:.5cqw;background:var(--tc-edge);transform:translateZ(16px)}
.tc-cutsm{--c:2.2cqw;clip-path:polygon(0 0,calc(100% - var(--c)) 0,100% var(--c),100% 100%,var(--c) 100%,0 calc(100% - var(--c)))}
.tc-type-fill{--c:1.8cqw;flex:1;min-width:0;display:flex;align-items:center;gap:2.2cqw;padding:1.2cqw 3.4cqw 1.2cqw 1.4cqw;background:var(--tc-plaque)}
.tc-tag{
  flex:none;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  padding:.9cqw 2.2cqw;background:var(--tc-tag-bg);color:var(--tc-tag-text);
  clip-path:polygon(0 0,calc(100% - 1.2cqw) 0,100% 100%,0 100%);padding-right:3cqw;
  font-family:var(--font-pixel,ui-monospace,monospace);font-size:max(8px,2.4cqw);letter-spacing:.12em;text-transform:uppercase;font-weight:700;
}
.tc-role{
  min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-size:max(9px,2.9cqw);letter-spacing:.16em;text-transform:uppercase;color:var(--tc-sub);
}
.tc-bars{flex:none;display:flex;align-items:flex-end;gap:.6cqw}
.tc-bars i{display:block;width:.8cqw;background:var(--tc-accent2)}
.tc-bars i:nth-child(1){height:1.6cqw;opacity:.5}
.tc-bars i:nth-child(2){height:2.6cqw;opacity:.75}
.tc-bars i:nth-child(3){height:3.6cqw}

/* Contact panel */
.tc-box{flex:none;display:flex;min-height:19cqw;padding:.5cqw;background:var(--tc-edge);transform:translateZ(8px)}
.tc-cutbox{--c:3.4cqw;clip-path:polygon(0 0,100% 0,100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,var(--c) 100%,0 calc(100% - var(--c)))}
.tc-box-fill{--c:3cqw;flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:1.4cqw;padding:2.4cqw 21.5cqw 2.4cqw 2.8cqw;background:var(--tc-box-bg)}
.tc-row{
  display:flex;align-items:center;gap:2.2cqw;min-width:0;text-decoration:none;color:var(--tc-text);
  transition:transform .25s cubic-bezier(.16,1,.3,1),color .2s ease;
}
.tc-row:hover{transform:translateX(.8cqw);color:var(--tc-accent)}
.tc-row:focus-visible{outline:2px solid var(--tc-accent);outline-offset:2px}
.tc-ico{
  flex:none;display:inline-flex;align-items:center;justify-content:center;width:6.6cqw;height:6.6cqw;
  border:1px solid var(--tc-line);color:var(--tc-accent);
  background:linear-gradient(160deg,color-mix(in srgb,var(--tc-accent) 16%,transparent),transparent);
  clip-path:polygon(25% 0,100% 0,100% 75%,75% 100%,0 100%,0 25%);
}
.tc-ico svg{width:56%;height:56%}
.tc-lab{
  flex:none;font-family:var(--font-pixel,ui-monospace,monospace);font-size:max(8px,2.3cqw);
  letter-spacing:.14em;text-transform:uppercase;color:var(--tc-accent);
}
.tc-val{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:max(10px,3.4cqw);letter-spacing:.01em}
.tc-idle{font-size:max(10px,3.2cqw);letter-spacing:.14em;text-transform:uppercase;color:var(--tc-sub)}

/* Corner badge (logo) */
.tc-corner{
  position:absolute;right:2.8cqw;bottom:2.8cqw;width:19cqw;height:13cqw;padding:.6cqw;
  background:var(--tc-edge);transform:translateZ(28px);
}
.tc-cutcorner{--c:4.2cqw;clip-path:polygon(var(--c) 0,100% 0,100% 100%,0 100%,0 var(--c))}
.tc-corner-fill{--c:3.7cqw;position:relative;flex:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--tc-corner-bg)}
.tc-corner img{position:relative;width:62%;height:68%;object-fit:contain;user-select:none}
.tc-mono{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:var(--font-gotham-bold,system-ui,sans-serif);font-size:5.4cqw;letter-spacing:.04em;
  background:linear-gradient(135deg,var(--tc-accent),var(--tc-accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}

/* Light that follows the pointer, shaped to the frame */
.tc-sheen{
  position:absolute;inset:0;pointer-events:none;transform:translateZ(34px);
  --c1:7cqw;--c2:3.4cqw;
  clip-path:polygon(0 var(--c1),var(--c1) 0,calc(100% - var(--c2)) 0,100% var(--c2),100% calc(100% - var(--c1)),calc(100% - var(--c1)) 100%,var(--c2) 100%,0 calc(100% - var(--c2)));
  background:
    radial-gradient(circle 46cqw at var(--pc-light-x) var(--pc-light-y),rgba(255,255,255,calc(.16 * var(--pc-glare))),transparent 70%),
    radial-gradient(circle 70cqw at var(--pc-light-x) var(--pc-light-y),var(--tc-glow),transparent 75%);
  opacity:var(--pc-active);
}

@keyframes tc-shim{0%{transform:translate3d(-100%,0,0)}100%{transform:translate3d(100%,0,0)}}
@media (prefers-reduced-motion:reduce){.tc-shim::after{animation:none}.tc-row{transition:none}}
`;

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const InstaIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
);

const CallIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const TeamCard = ({
    avatarUrl = "",
    iconUrl,
    name = "",
    title = "",
    email = "",
    instagram = "",
    phone = "",
    showIcons = true,
    status = "",
    statusColor,
    showUserInfo = true,
    theme = "dark",
    backdropColor,
    radius = 20,
    holo = 0.8,
    glare = 0.5,
    enableTilt = true,
    tiltStrength = 10,
    parallax = 6,
    enableMobileTilt = false,
    mobileTiltSensitivity = 5,
    intro = true,
    priority = false,
    className = "",
}: TeamCardProps) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const tiltRef = useRef<HTMLElement>(null);
    const photoRef = useRef<HTMLImageElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const [logoFailed, setLogoFailed] = useState(false);

    const settingsRef = useRef({
        enableTilt,
        tiltStrength,
        parallax,
        mobileTiltSensitivity,
        intro,
    });

    useEffect(() => {
        settingsRef.current = {
            enableTilt,
            tiltStrength,
            parallax,
            mobileTiltSensitivity,
            intro,
        };
    }, [enableTilt, tiltStrength, parallax, mobileTiltSensitivity, intro]);

    /* Spring driven tilt engine */
    useEffect(() => {
        const root = rootRef.current;
        const tilt = tiltRef.current;
        if (!root || !tilt) return;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const x = { p: 0, v: 0, target: 0 };
        const y = { p: 0, v: 0, target: 0 };
        const light = { p: 0, target: 0 };

        let raf = 0;
        let last = 0;
        let slowUntil = 0;
        let touchId: number | null = null;

        const write = () => {
            const {
                enableTilt: tiltOn,
                tiltStrength: strength,
                parallax: depth,
            } = settingsRef.current;

            const angle = tiltOn && !reduced ? strength : 0;
            const d = reduced ? 0 : depth;

            tilt.style.transform = `rotateX(${(y.p * angle).toFixed(3)}deg) rotateY(${(-x.p * angle).toFixed(3)}deg)`;

            const photo = photoRef.current;
            if (photo) {
                photo.style.transform = `translate3d(${(x.p * d).toFixed(2)}px, ${(y.p * d).toFixed(2)}px, 0) scale(1.04)`;
            }

            const s = root.style;
            s.setProperty("--pc-light-x", `${((x.p + 1) * 50).toFixed(1)}%`);
            s.setProperty("--pc-light-y", `${((y.p + 1) * 50).toFixed(1)}%`);
            s.setProperty("--pc-active", light.p.toFixed(3));
        };

        const frame = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000 || 0);
            last = now;

            const slow = now < slowUntil;
            const stiffness = slow ? 24 : 120;
            const damping = slow ? 9 : 16;
            const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
            const h = dt / steps;

            for (let i = 0; i < steps; i++) {
                for (const axis of [x, y]) {
                    axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
                    axis.p += axis.v * h;
                }
            }

            const tau = light.target > light.p ? 0.18 : slow ? 0.9 : 0.45;
            light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));

            write();

            const moving =
                Math.abs(x.target - x.p) > 0.0005 ||
                Math.abs(y.target - y.p) > 0.0005 ||
                Math.abs(x.v) > 0.0005 ||
                Math.abs(y.v) > 0.0005 ||
                Math.abs(light.target - light.p) > 0.002;

            if (moving) {
                raf = requestAnimationFrame(frame);
            } else {
                x.p = x.target;
                y.p = y.target;
                light.p = light.target;
                write();
                raf = 0;
            }
        };

        const wake = () => {
            if (raf) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        };

        const aim = (nx: number, ny: number, on = true) => {
            x.target = clamp(nx, -1, 1);
            y.target = clamp(ny, -1, 1);
            light.target = on ? 1 : 0;
            slowUntil = 0;
            wake();
        };

        const release = () => aim(0, 0, false);

        const aimAt = (event: PointerEvent) => {
            const rect = root.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            aim(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                ((event.clientY - rect.top) / rect.height) * 2 - 1
            );
        };

        const onEnter = (e: PointerEvent) => {
            if (e.pointerType === "mouse") aimAt(e);
        };

        const onMove = (e: PointerEvent) => {
            if (e.pointerType === "mouse" || e.pointerId === touchId) aimAt(e);
        };

        const onLeave = (e: PointerEvent) => {
            if (e.pointerType === "mouse") release();
        };

        const onDown = (e: PointerEvent) => {
            if (e.pointerType === "mouse") return;
            touchId = e.pointerId;
            aimAt(e);
        };

        const onUp = (e: PointerEvent) => {
            if (e.pointerId !== touchId) return;
            touchId = null;
            release();
        };

        const opts = { passive: true } as const;
        root.addEventListener("pointerenter", onEnter, opts);
        root.addEventListener("pointermove", onMove, opts);
        root.addEventListener("pointerleave", onLeave, opts);
        root.addEventListener("pointerdown", onDown, opts);
        root.addEventListener("pointerup", onUp, opts);
        root.addEventListener("pointercancel", onUp, opts);

        engineRef.current = { aim, release, write };

        if (settingsRef.current.intro && !reduced) {
            x.p = 0.5;
            y.p = -0.4;
            light.p = 1;
            slowUntil = performance.now() + 1200;
            write();
            wake();
        } else {
            write();
        }

        return () => {
            cancelAnimationFrame(raf);
            root.removeEventListener("pointerenter", onEnter);
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerleave", onLeave);
            root.removeEventListener("pointerdown", onDown);
            root.removeEventListener("pointerup", onUp);
            root.removeEventListener("pointercancel", onUp);
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        engineRef.current?.write();
    }, [enableTilt, tiltStrength, parallax]);

    /* Mobile gyroscope tilt */
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !enableMobileTilt) return;

        let listening = false;

        const onOrientation = (event: DeviceOrientationEvent) => {
            if (event.beta == null || event.gamma == null) return;
            const s = settingsRef.current.mobileTiltSensitivity;
            engineRef.current?.aim(
                (event.gamma * s) / 150,
                ((event.beta - 20) * s) / 150
            );
        };

        const listen = () => {
            if (listening) return;
            listening = true;
            window.addEventListener("deviceorientation", onOrientation);
        };

        const onClick = () => {
            const Motion = window.DeviceOrientationEvent as unknown as
                | OrientationPermission
                | undefined;

            if (Motion && typeof Motion.requestPermission === "function") {
                Motion.requestPermission()
                    .then((state) => {
                        if (state === "granted") listen();
                    })
                    .catch(() => {});
            } else {
                listen();
            }
        };

        root.addEventListener("click", onClick);

        return () => {
            root.removeEventListener("click", onClick);
            window.removeEventListener("deviceorientation", onOrientation);
        };
    }, [enableMobileTilt]);

    const isLight = theme === "light";

    const initials = useMemo(
        () =>
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join(""),
        [name]
    );

    const figure = useMemo(() => figureFor(name || "member"), [name]);

    const instaHref = instagram
        ? /^https?:\/\//i.test(instagram)
            ? instagram
            : `https://instagram.com/${instagram.replace(/^@/, "")}`
        : "";

    const instaLabel = instagram
        ? /^https?:\/\//i.test(instagram)
            ? instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, "")
            : `@${instagram.replace(/^@/, "")}`
        : "";

    const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";

    const palette = isLight
        ? {
            "--tc-edge": "linear-gradient(135deg,#2a5cff 0%,#6a4dff 55%,#00a6d6 100%)",
            "--tc-frame-bg": backdropColor || "linear-gradient(160deg,#f6f8ff 0%,#e1e8f9 60%,#cfd9f2 100%)",
            "--tc-plaque": "linear-gradient(180deg,#ffffff,#e9effc)",
            "--tc-art-bg": "#cfd9f2",
            "--tc-box-bg": "rgba(255,255,255,0.62)",
            "--tc-text": "#0d1633",
            "--tc-sub": "rgba(13,22,51,0.72)",
            "--tc-accent": "#2a5cff",
            "--tc-accent2": "#6a4dff",
            "--tc-glow": "rgba(42,92,255,0.22)",
            "--tc-line": "rgba(42,92,255,0.4)",
            "--tc-dot": "#2a5cff",
            "--tc-corner-bg": "#0d1633",
            "--tc-tag-bg": statusColor || "#2a5cff",
            "--tc-tag-text": "#ffffff",
        }
        : {
            "--tc-edge": "linear-gradient(135deg,#55DFFF 0%,#6C7BFF 52%,#B3A4FF 100%)",
            "--tc-frame-bg": backdropColor || "linear-gradient(160deg,#111b3e 0%,#080d22 55%,#050816 100%)",
            "--tc-plaque": "linear-gradient(180deg,#0c1332,#060a1b)",
            "--tc-art-bg": "#070c1d",
            "--tc-box-bg": "rgba(6,10,26,0.7)",
            "--tc-text": "#f4f7ff",
            "--tc-sub": "rgba(214,226,255,0.74)",
            "--tc-accent": "#55DFFF",
            "--tc-accent2": "#B3A4FF",
            "--tc-glow": "rgba(85,223,255,0.28)",
            "--tc-line": "rgba(143,216,255,0.4)",
            "--tc-dot": "#EAF4FF",
            "--tc-corner-bg": "#02040c",
            "--tc-tag-bg": statusColor || "#55DFFF",
            "--tc-tag-text": "#03101a",
        };

    const markLoaded = (img: HTMLImageElement) => {
        const parent = img.parentElement;
        if (parent) parent.dataset.loaded = "1";
    };

    const hasContact = showUserInfo && (email || instagram || phone);
    const stroke = isLight ? "#2a5cff" : "#8FD8FF";
    const dot = isLight ? "#2a5cff" : "#EAF4FF";

    return (
        <div
            ref={rootRef}
            className={`tc-root ${className}`.trim()}
            style={
                {
                    ...ROOT_VARS,
                    ...palette,
                    "--pc-radius": `${Math.max(0, radius)}px`,
                    "--pc-holo": clamp(holo, 0, 1),
                    "--pc-glare": clamp(glare, 0, 1),
                    "--pc-parallax": `${Math.max(0, parallax)}px`,
                } as CSSProperties
            }
        >
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            <span aria-hidden="true" className="tc-glow" />

            <article ref={tiltRef} className="tc-tilt" aria-label={name || "Team member"}>
                {/* Frame with its own constellation, kept behind the photo */}
                <div className="tc-frame">
                    <div className="tc-frame-fill">
                        <svg viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
                            {figure.paths.map((d, i) => (
                                <path key={i} d={d} stroke={stroke} strokeOpacity="0.38" strokeWidth="0.28" />
                            ))}
                            {figure.points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={dot} fillOpacity="0.85" />
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="tc-content">
                    {/* Name plaque */}
                    <header className="tc-title tc-hex">
                        <div className="tc-title-fill tc-hex">
                            <span aria-hidden="true" className="tc-ticks l"><i /><i /><i /></span>
                            <span aria-hidden="true" className="tc-ticks r"><i /><i /><i /></span>
                            {name && <h3 className="tc-name">{name}</h3>}
                        </div>
                    </header>

                    {/* Photo window */}
                    <div className="tc-art tc-cutart">
                        <div className="tc-art-fill tc-cutart">
                            <span aria-hidden="true" className="tc-abs tc-neb" />

                            {avatarUrl ? (
                                <>
                                    <span aria-hidden="true" className="tc-abs tc-shim" />
                                    <img
                                        ref={(el) => {
                                            photoRef.current = el;
                                            if (el && el.complete && el.naturalWidth) markLoaded(el);
                                        }}
                                        className="tc-photo"
                                        style={{
                                            inset: "calc(var(--pc-parallax) * -1)",
                                            width: "calc(100% + var(--pc-parallax) * 2)",
                                            height: "calc(100% + var(--pc-parallax) * 2)",
                                        }}
                                        src={avatarUrl}
                                        alt={name || ""}
                                        loading={priority ? "eager" : "lazy"}
                                        decoding="async"
                                        draggable={false}
                                        onLoad={(e) => markLoaded(e.currentTarget)}
                                        onError={(e) => markLoaded(e.currentTarget)}
                                    />
                                </>
                            ) : (
                                <span aria-hidden="true" className="tc-initials">{initials}</span>
                            )}

                            <span aria-hidden="true" className="tc-brk tr" />
                            <span aria-hidden="true" className="tc-brk bl" />
                        </div>
                    </div>

                    {/* Role bar */}
                    <div className="tc-type tc-cutsm">
                        <div className="tc-type-fill tc-cutsm">
                            <span className="tc-tag">{status || "TechXetra"}</span>
                            <span className="tc-role">{title || "Team member"}</span>
                            <span aria-hidden="true" className="tc-bars"><i /><i /><i /></span>
                        </div>
                    </div>

                    {/* Contact panel */}
                    <div className="tc-box tc-cutbox">
                        <div className="tc-box-fill tc-cutbox">
                            {hasContact ? (
                                <>
                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="tc-row"
                                            title={email}
                                            aria-label={`Email ${name || email}`}
                                        >
                                            {showIcons ? (
                                                <span className="tc-ico"><MailIcon /></span>
                                            ) : (
                                                <span className="tc-lab">Mail</span>
                                            )}
                                            <span className="tc-val">{email}</span>
                                        </a>
                                    )}
                                    {instagram && (
                                        <a
                                            href={instaHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tc-row"
                                            title={instaLabel}
                                            aria-label={`${name || "Member"} on Instagram`}
                                        >
                                            {showIcons ? (
                                                <span className="tc-ico"><InstaIcon /></span>
                                            ) : (
                                                <span className="tc-lab">Insta</span>
                                            )}
                                            <span className="tc-val">{instaLabel}</span>
                                        </a>
                                    )}
                                    {phone && (
                                        <a
                                            href={telHref}
                                            className="tc-row"
                                            title={phone}
                                            aria-label={`Call ${name || phone}`}
                                        >
                                            {showIcons ? (
                                                <span className="tc-ico"><CallIcon /></span>
                                            ) : (
                                                <span className="tc-lab">Call</span>
                                            )}
                                            <span className="tc-val">{phone}</span>
                                        </a>
                                    )}
                                </>
                            ) : (
                                <span className="tc-idle">TechXetra 2026</span>
                            )}
                        </div>
                    </div>

                    {/* Corner badge */}
                    <div className="tc-corner tc-cutcorner" aria-hidden="true">
                        <div className="tc-corner-fill tc-cutcorner">
                            {iconUrl && !logoFailed && (
                                <img
                                    src={iconUrl}
                                    alt=""
                                    draggable={false}
                                    decoding="async"
                                    onError={() => setLogoFailed(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <span aria-hidden="true" className="tc-sheen" />
            </article>
        </div>
    );
};

export default memo(TeamCard);