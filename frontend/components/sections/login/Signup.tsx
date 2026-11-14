"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";

import LogoStatic from "@/components/animations/LogoStatic";
import { participantApi } from "@/services/participant-api";

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
.lg-rise{opacity:0;animation:lg-rise .9s cubic-bezier(.22,1,.36,1) forwards;animation-delay:var(--d,0s)}
.lg-orbit{animation:lg-orbit 150s linear infinite}
.lg-float{animation:lg-float 9s ease-in-out infinite}

.lg-card{position:relative;border:1px solid rgba(190,214,255,.14);
  background:linear-gradient(180deg,rgba(14,22,42,.88),rgba(5,8,16,.9));
  box-shadow:0 40px 90px -40px rgba(0,0,0,.95),0 0 80px -40px rgba(85,223,255,.55)}
.lg-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s ease;
  background:radial-gradient(320px circle at var(--mx,70%) var(--my,0%),rgba(85,223,255,.12),transparent 70%)}
.lg-card:hover::before{opacity:1}
.lg-card::after{content:"";position:absolute;left:10%;right:10%;top:0;height:1px;pointer-events:none;
  background:linear-gradient(90deg,transparent,#55DFFF,transparent);opacity:.7}

.lg-input{width:100%;border-radius:12px;border:1px solid rgba(190,214,255,.14);background:rgba(4,8,18,.7);
  padding:.8rem 1rem .8rem 2.85rem;font-size:1rem;color:#fff;outline:none;
  transition:border-color .3s ease,box-shadow .3s ease,background .3s ease}
.lg-input::placeholder{color:rgba(255,255,255,.32)}
.lg-input:hover{border-color:rgba(190,214,255,.28)}
.lg-input:focus{border-color:rgba(85,223,255,.75);background:rgba(6,12,26,.85);box-shadow:0 0 0 3px rgba(85,223,255,.12)}
.lg-input:-webkit-autofill{-webkit-text-fill-color:#fff;box-shadow:0 0 0 1000px #050b1a inset;caret-color:#fff}

.lg-field-icon{position:absolute;left:1rem;top:50%;width:1.1rem;height:1.1rem;transform:translateY(-50%);
  color:rgba(190,214,255,.45);transition:color .3s ease;pointer-events:none}
.lg-field:focus-within .lg-field-icon{color:#55DFFF}

.lg-btn{position:relative;overflow:hidden;background:linear-gradient(135deg,#7FE9FF 0%,#55DFFF 45%,#2FB8E6 100%);
  box-shadow:0 14px 40px -16px rgba(85,223,255,.8);transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s ease,opacity .3s ease}
.lg-btn::after{content:"";position:absolute;inset:0;transform:translateX(-120%);
  background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transition:transform .8s ease}
.lg-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 18px 46px -14px rgba(85,223,255,.95)}
.lg-btn:hover:not(:disabled)::after{transform:translateX(120%)}
.lg-btn:active:not(:disabled){transform:translateY(0)}

@keyframes lg-rise{from{opacity:0;transform:translate3d(0,22px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes lg-orbit{to{transform:rotate(360deg)}}
@keyframes lg-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-10px,0)}}

@media (prefers-reduced-motion:reduce){
  .lg-rise{animation:none;opacity:1}
  .lg-orbit,.lg-float{animation:none!important}
  .lg-input,.lg-btn,.lg-btn::after,.lg-card::before{transition:none!important}
}
`;

function rise(delay: number): CSSProperties {
  return { "--d": `${delay}s` } as CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleGoogleSignup(idToken: string) {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await participantApi.auth.google(idToken);
      const user = result.user;
      const isComplete = Boolean(
        user?.profileComplete ?? user?.profile_complete
      );

      router.replace(isComplete ? "/dashboard" : "/profile-completion");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Your name must be between 2 and 100 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await participantApi.auth.register({
        name: trimmedName,
        email: normalizedEmail,
        password,
      });

      const user = result.user;
      const isComplete = Boolean(
        user?.profileComplete ?? user?.profile_complete
      );

      router.replace(isComplete ? "/dashboard" : "/profile-completion");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* Design only: soft spotlight that follows the pointer on the card. */
  function handleCardPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--mx",
      `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`
    );
    event.currentTarget.style.setProperty(
      "--my",
      `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-x-clip bg-black px-4 pb-10 pt-24 text-white [font-family:var(--font-gotham-book)] sm:px-6 sm:pb-12 sm:pt-28 lg:px-10 lg:pt-32 xl:px-16">
      <style>{css}</style>

      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, #0a1430 0%, #04060f 52%, #000000 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 78% 52%, rgba(85,223,255,0.14) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.15) 64%, rgba(0,0,0,0.8) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.65) 100%)",
          }}
        />
        <ConstellationField />
      </div>

      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 xl:gap-20">
        {/* Left section */}
        <div className="order-2 flex min-w-0 flex-col items-center justify-center lg:order-1 lg:items-start">
          <div className="lg-rise relative w-full max-w-[19rem] sm:max-w-[23rem] lg:max-w-[27rem] xl:max-w-[31rem]" style={rise(0.1)}>
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="lg-orbit" style={{ width: "min(118vw, 46rem)", height: "min(118vw, 46rem)" }}>
                <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
                  <circle cx="200" cy="200" r="190" stroke="#8FB4FF" strokeOpacity="0.3" strokeDasharray="1 7" />
                  <circle cx="200" cy="200" r="146" stroke="#8FB4FF" strokeOpacity="0.2" strokeDasharray="2 11" />
                  <circle cx="390" cy="200" r="3" fill="#CFE0FF" />
                  <circle cx="58" cy="262" r="2.2" fill="#CFE0FF" />
                </svg>
              </div>
            </div>

            <div className="lg-float relative aspect-square w-full">
              <div className="relative h-full w-full">
                <LogoStatic />
              </div>
            </div>
          </div>

          <div className="lg-rise hidden w-full max-w-xl lg:block" style={rise(0.25)}>
            <p className="mb-4 flex items-center gap-3 font-roboto text-xs tracking-[0.22em] text-cyan-300 xl:text-sm">
              <StarGlyph className="h-3 w-3 shrink-0" />
              FOR THE CURIOUS AND THE CREATIVE
            </p>

            <h1 className="font-pixel text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              <span className="bg-gradient-to-b from-white via-[#D4D8E8] to-[#7C8299] bg-clip-text text-transparent">
                Make something
              </span>
              <span
                className="mt-1 block text-cyan-300"
                style={{ textShadow: "0 0 50px rgba(85,223,255,0.35)" }}
              >
                extraordinary.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-white/65">
              Join the community, explore new ideas and build something worth sharing.
            </p>
          </div>
        </div>

        {/* Right section: Signup form */}
        <div className="order-1 mx-auto flex w-full min-w-0 max-w-md flex-col lg:order-2 lg:max-w-[27rem]">
          <div className="lg-rise mb-7 lg:hidden" style={rise(0.05)}>
            <p className="mb-3 flex items-center gap-3 font-roboto text-[10px] tracking-[0.2em] text-cyan-300 sm:text-xs">
              <StarGlyph className="h-2.5 w-2.5 shrink-0" />
              FOR THE CURIOUS AND THE CREATIVE
            </p>

            <h1 className="font-pixel text-3xl leading-tight sm:text-4xl">
              <span className="bg-gradient-to-b from-white via-[#D4D8E8] to-[#7C8299] bg-clip-text text-transparent">
                Your journey
              </span>
              <span className="block text-cyan-300">starts here.</span>
            </h1>
          </div>

          <div
            className="lg-card lg-rise rounded-2xl p-5 sm:rounded-3xl sm:p-7 md:p-8 lg:p-7 xl:p-8"
            style={rise(0.15)}
            onPointerMove={handleCardPointer}
          >
            <div className="mb-7">
              <p className="mb-3 flex items-center gap-3 font-roboto text-[10px] tracking-[0.2em] text-cyan-300 sm:text-xs">
                <StarGlyph className="h-2.5 w-2.5 shrink-0" />
                JOIN TECHXETRA
                <span
                  aria-hidden="true"
                  className="h-px w-10"
                  style={{ background: "linear-gradient(90deg, #55DFFF, transparent)" }}
                />
              </p>

              <h2 className="font-pixel text-3xl leading-tight sm:text-4xl">
                Create account.
              </h2>
            </div>

            <form onSubmit={handleManualSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-name"
                  className="mb-2 block text-sm text-white/80"
                >
                  Full name
                </label>

                <div className="lg-field relative">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="lg-field-icon">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    required
                    className="lg-input"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-2 block text-sm text-white/80"
                >
                  Email address
                </label>

                <div className="lg-field relative">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="lg-field-icon">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 7.5l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="lg-input"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-sm text-white/80"
                >
                  Password
                </label>

                <div className="lg-field relative">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="lg-field-icon">
                    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    className="lg-input"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="mb-2 block text-sm text-white/80"
                >
                  Confirm password
                </label>

                <div className="lg-field relative">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="lg-field-icon">
                    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    minLength={8}
                    required
                    className="lg-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="lg-btn group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3 mt-2 font-medium text-black disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                <span className="relative">{loading ? "Creating account..." : "Create account"}</span>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />

              <span className="whitespace-nowrap text-[10px] tracking-[0.14em] text-white/45 sm:text-xs">
                OR SIGN UP WITH
              </span>

              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
            </div>

            <div className="flex min-h-11 w-full items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-white/75">
                  <span className="size-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
                  Creating your account...
                </div>
              ) : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <div className="w-full [&>div]:flex [&>div]:justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        void handleGoogleSignup(credentialResponse.credential);
                      } else {
                        setError("Google sign-up could not be completed.");
                      }
                    }}
                    onError={() => {
                      setError("Google sign-up failed. Please try again.");
                    }}
                    text="signup_with"
                    theme="filled_black"
                    shape="rectangular"
                    logo_alignment="left"
                  />
                </div>
              ) : (
                <div className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-xs text-white/55">
                  Google Sign-Up unavailable. Please try again later.
                </div>
              )}
            </div>

            {notice && (
              <p
                role="status"
                className="mt-4 break-words rounded-xl border border-cyan-300/20 bg-cyan-500/[0.07] px-4 py-3 text-sm leading-6 text-cyan-200"
              >
                {notice}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 break-words rounded-xl border border-red-400/25 bg-red-500/[0.07] px-4 py-3 text-sm leading-6 text-red-300"
              >
                {error}
              </p>
            )}

            <p className="mt-6 text-center text-sm text-white/65">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-cyan-300 transition-colors hover:text-white"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="lg-rise mt-5 text-center text-xs leading-5 text-white/45" style={rise(0.35)}>
            A community built around ideas and possibility.
          </p>
        </div>
      </section>
    </main>
  );
}