"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TeamDetail, EventItem, UserProfile } from "@/types/api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* Constellation field (canvas, viewport sized, pointer links)         */
/* ------------------------------------------------------------------ */

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

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

      const cap = w < 700 ? 36 : 68;
      const count = Math.round(Math.min(cap, Math.max(22, (w * h) / 21000)));

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
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 160);
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
          const alpha = (1 - d2 / link2) * 0.32 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(130,240,190,${alpha.toFixed(3)})`;
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
          const alpha = (1 - d2 / reach2) * 0.45;
          ctx.strokeStyle = `rgba(200,255,225,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.52 * n.z) * twinkle;
        ctx.fillStyle = `rgba(228,255,240,${alpha.toFixed(3)})`;
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
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const css = `
.tm-orbit{animation:tm-orbit 150s linear infinite}
.tm-card{transition:border-color .4s ease,transform .5s cubic-bezier(.22,1,.36,1)}
@media (hover:hover) and (pointer:fine){.tm-card:hover{transform:translateY(-3px);border-color:rgba(61,220,151,.55)}}
.tm-field{width:100%;border-radius:12px;border:1px solid rgba(160,255,210,.18);background:rgba(3,10,7,.8);
  padding:.8rem 1rem;font-size:.95rem;color:#fff;outline:none;
  transition:border-color .3s ease,box-shadow .3s ease,background .3s ease}
.tm-field::placeholder{color:rgba(255,255,255,.35)}
.tm-field:hover{border-color:rgba(160,255,210,.32)}
.tm-field:focus{border-color:rgba(61,220,151,.8);background:rgba(4,14,9,.92);box-shadow:0 0 0 3px rgba(61,220,151,.14)}
.tm-field option{background:#07120d;color:#fff}
@keyframes tm-orbit{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .tm-orbit{animation:none!important}
  .tm-card,.tm-field{transition:none!important}
}
`;

const panel =
  "rounded-2xl border border-[#9AFFCC]/[0.14] bg-gradient-to-b from-[#0d1f17]/90 to-[#050a07]/94 shadow-[0_30px_70px_-42px_rgba(0,0,0,0.95)]";
const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-[#7CF2BE] to-[#2FCB85] px-5 py-2.5 text-sm font-semibold text-[#04140c] transition hover:from-[#A3F7D1] hover:to-[#47DE9A] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CF2BE]";
const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#9AFFCC]/25 px-5 py-2.5 text-sm font-medium text-white/85 transition hover:border-[#3DDC97]/70 hover:bg-[#3DDC97]/[0.08] hover:text-[#A3F7D1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3DDC97]";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TeamsDirectoryPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get user profile
      try {
        const userData = await participantApi.auth.me();
        setUser(userData);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/teams");
          return;
        }
      }

      // 2. Fetch my teams and team-enabled events in parallel
      const [teamsRes, eventsRes] = await Promise.allSettled([
        participantApi.teams.myTeams(),
        participantApi.events.list({ is_team: true, limit: 50 }),
      ]);

      if (teamsRes.status === "fulfilled" && teamsRes.value) {
        setTeams(teamsRes.value || []);
      }
      if (eventsRes.status === "fulfilled" && eventsRes.value) {
        setEvents(eventsRes.value?.events || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !teamName.trim()) return;

    const isComplete = Boolean(user?.profileComplete ?? user?.profile_complete);
    if (user && !isComplete) {
      router.push("/profile-completion");
      return;
    }

    setCreatingTeam(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await participantApi.teams.create({
        eventId: selectedEventId,
        name: teamName.trim(),
      });

      setSuccess(`Team "${teamName}" created! Redirecting to workspace...`);
      setShowCreateModal(false);
      setTeamName("");
      router.push(`/teams/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating team");
    } finally {
      setCreatingTeam(false);
    }
  };

  /* Hero entrance and scroll-scrubbed exit */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const hero = root.querySelector<HTMLElement>("[data-hero]");
        const inner = root.querySelector<HTMLElement>("[data-hero-inner]");
        if (!hero || !inner) return;

        gsap.from(Array.from(inner.children), {
          y: 30,
          opacity: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power3.out",
        });

        gsap.to(inner, {
          yPercent: -8,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      },
      root
    );

    return () => media.revert();
  }, []);

  /* Team cards appear as they scroll into view */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || loading || teams.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-team-card]");
      if (reduce || !cards.length) return;

      gsap.set(cards, { y: 36, opacity: 0 });

      ScrollTrigger.batch(cards, {
        start: "top 94%",
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.75,
            stagger: 0.09,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform,opacity",
          });
        },
      });
    }, root);

    return () => context.revert();
  }, [loading, teams]);

  /* Close the create dialog with Escape */
  useEffect(() => {
    if (!showCreateModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCreateModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreateModal]);

  return (
    <main
      ref={rootRef}
      className="relative isolate min-h-dvh overflow-x-clip bg-black text-white [font-family:var(--font-gotham-book)]"
    >
      <style>{css}</style>

      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 30%, #07180f 0%, #030806 54%, #000000 100%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 80% 62%, rgba(61,220,151,0.13) 0%, transparent 58%)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.15) 64%, rgba(0,0,0,0.78) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.62) 100%)" }}
          />
          <ConstellationField />
        </div>
      </div>

      {/* Hero */}
      <header
        data-hero
        className="relative flex min-h-[58svh] flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-32 text-center sm:px-8 sm:pt-32"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="tm-orbit" style={{ width: "min(120vw, 900px)", height: "min(120vw, 900px)" }}>
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-40">
              <circle cx="200" cy="200" r="190" stroke="#7CF2BE" strokeOpacity="0.3" strokeDasharray="1 7" />
              <circle cx="200" cy="200" r="142" stroke="#7CF2BE" strokeOpacity="0.2" strokeDasharray="2 11" />
              <circle cx="390" cy="200" r="3" fill="#D5FFEA" />
              <circle cx="58" cy="262" r="2.2" fill="#D5FFEA" />
            </svg>
          </div>
        </div>

        <div data-hero-inner className="relative flex w-full max-w-3xl flex-col items-center">
          <Link
            href="/dashboard"
            className="mb-8 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#9AFFCC]/25 px-5 text-xs text-white/80 transition-colors hover:border-[#3DDC97]/70 hover:text-[#A3F7D1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3DDC97]"
          >
            Back to Dashboard
          </Link>

          <p className="mb-5 text-[10px] uppercase tracking-[0.32em] text-[#5FE9AB] [font-family:var(--font-pixel)]">
            Team management
          </p>

          <h1 className="m-0 text-[clamp(2.4rem,8vw,5.4rem)] font-normal leading-[1.02] tracking-[-0.05em] [font-family:var(--font-roboto)]">
            <span className="bg-gradient-to-b from-[#FFFFFF] via-[#D8E6DE] to-[#6B7F74] bg-clip-text text-transparent">
              My Teams
            </span>{" "}
            <span className="bg-gradient-to-r from-[#7CF2BE] to-[#2FCB85] bg-clip-text text-transparent">
              &amp; Rosters
            </span>
          </h1>

          <p className="mt-6 max-w-[56ch] text-sm leading-[1.8] text-white/75 sm:text-base">
            Manage your competition squads, invite teammates by email, and track registration readiness.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setShowCreateModal(true)} className={primaryButton}>
              Create Team
            </button>
            <Link href="/me/team-invites" className={secondaryButton}>
              Invitations Inbox
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-28 pt-4 sm:px-8">
        {/* Live alerts */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/35 bg-red-500/[0.09] p-4 text-sm leading-6 text-red-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-[#3DDC97]/40 bg-[#3DDC97]/[0.1] p-4 text-sm leading-6 text-[#B8F7D8]"
          >
            {success}
          </div>
        )}

        {/* How it works */}
        <section aria-label="How teams work" className={`${panel} p-5 sm:p-7`}>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#5FE9AB] [font-family:var(--font-pixel)]">
            How teams work
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
            <div className="sm:pr-6">
              <h2 className="text-base text-white [font-family:var(--font-roboto)]">Create a team</h2>
              <p className="mt-1.5 text-sm leading-6 text-white/70">
                Choose a team event and name your squad. You become the team leader.
              </p>
            </div>
            <div className="sm:px-6">
              <h2 className="text-base text-white [font-family:var(--font-roboto)]">Invite teammates</h2>
              <p className="mt-1.5 text-sm leading-6 text-white/70">
                Send invitations by email from your team workspace once the team exists.
              </p>
            </div>
            <div className="sm:pl-6">
              <h2 className="text-base text-white [font-family:var(--font-roboto)]">Check readiness</h2>
              <p className="mt-1.5 text-sm leading-6 text-white/70">
                Review who has joined and who is still pending before you register.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div role="status" aria-label="Loading teams" className="space-y-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl border border-[#9AFFCC]/10 bg-[#0d1f17]/60"
                />
              ))}
            </div>
            <p className="text-sm text-white/60">Loading teams and rosters...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#9AFFCC]/25 px-6 py-16 text-center sm:py-20">
            <h2 className="text-xl text-white [font-family:var(--font-gotham-bold)]">No active teams yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/70">
              You haven’t formed or joined any teams for TechXetra 2026.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => setShowCreateModal(true)} className={primaryButton}>
                Create Your First Team
              </button>
              <Link href="/me/team-invites" className={secondaryButton}>
                Check Pending Invites
              </Link>
            </div>
          </div>
        ) : (
          <section aria-label="Your teams">
            <div className="mb-6 flex items-center gap-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#5FE9AB] [font-family:var(--font-pixel)]">
                Your teams
              </p>
              <span className="h-px flex-1 bg-gradient-to-r from-[#9AFFCC]/30 to-transparent" />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((tm) => {
                const isLeader = tm.leader_id === user?.id;
                const acceptedMembers = tm.members?.filter((m) => m.status === "ACCEPTED") || [];
                const pendingMembers = tm.members?.filter((m) => m.status === "INVITED") || [];

                return (
                  <div key={tm.id} data-team-card className="min-w-0">
                    <article className={`${panel} tm-card flex h-full flex-col justify-between p-5 sm:p-6`}>
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                              isLeader
                                ? "border-[#3DDC97]/45 bg-[#3DDC97]/[0.12] text-[#8DF5C8]"
                                : "border-white/15 bg-white/[0.05] text-white/75"
                            }`}
                          >
                            {isLeader ? "CAPTAIN" : "MEMBER"}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${
                              tm.status === "CONFIRMED"
                                ? "border-[#3DDC97]/45 bg-[#3DDC97]/[0.12] text-[#8DF5C8]"
                                : tm.status === "LOCKED"
                                  ? "border-[#FFC46B]/40 bg-[#FFC46B]/[0.1] text-[#FFD28F]"
                                  : "border-white/15 bg-white/[0.05] text-white/70"
                            }`}
                          >
                            {tm.status}
                          </span>
                        </div>

                        <h2 className="mt-4 break-words text-xl leading-snug text-white [font-family:var(--font-gotham-bold)]">
                          {tm.name}
                        </h2>
                        <p className="mt-1.5 break-all font-mono text-xs text-white/50">Team ID: {tm.id}</p>

                        <dl className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
                          <div className="flex items-baseline justify-between gap-4">
                            <dt className="text-white/65">Accepted roster</dt>
                            <dd className="font-semibold text-white">{acceptedMembers.length} members</dd>
                          </div>
                          {pendingMembers.length > 0 && (
                            <div className="flex items-baseline justify-between gap-4 text-[#FFD28F]">
                              <dt>Pending invites</dt>
                              <dd className="font-medium">{pendingMembers.length} waiting</dd>
                            </div>
                          )}
                          <div className="flex items-baseline justify-between gap-4">
                            <dt className="text-white/55">Created</dt>
                            <dd className="text-white/75">{new Date(tm.created_at).toLocaleDateString()}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="mt-6">
                        <Link
                          href={`/teams/${tm.id}`}
                          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#3DDC97]/45 bg-[#3DDC97]/[0.08] px-4 py-2.5 text-sm font-semibold text-[#A3F7D1] transition hover:bg-gradient-to-br hover:from-[#7CF2BE] hover:to-[#2FCB85] hover:text-[#04140c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7CF2BE]"
                        >
                          Open Team Workspace
                        </Link>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-4"
          onMouseDown={(click) => {
            if (click.target === click.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-team-title"
            className="flex max-h-[92svh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[#9AFFCC]/[0.18] bg-gradient-to-b from-[#0d1f17] to-[#040806] sm:rounded-3xl"
          >
            <span
              aria-hidden="true"
              className="h-[3px] w-full shrink-0"
              style={{ background: "linear-gradient(90deg, #7CF2BE, #2FCB85)" }}
            />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              <h2 id="create-team-title" className="text-xl text-white [font-family:var(--font-gotham-bold)]">
                Create a Competition Team
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                You will be designated as the team leader. You can invite teammates after creation.
              </p>

              <form onSubmit={handleCreateTeam} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="team-event"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75"
                  >
                    Select Event
                  </label>
                  <select
                    id="team-event"
                    required
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="tm-field"
                  >
                    <option value="">-- Choose a team competition --</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.category} · Day {evt.day_of_event})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="team-name"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75"
                  >
                    Team Name
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={50}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Pixel Raiders"
                    className="tm-field"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className={secondaryButton}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam || !selectedEventId || !teamName.trim()}
                    className={primaryButton}
                  >
                    {creatingTeam ? "Creating..." : "Create Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}