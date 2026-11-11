"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  UserProfile,
  DigitalTicket,
  PreparingTicket,
  TeamDetail,
  TeamMember,
  PurchaseDetail,
} from "@/types/api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const panel =
  "rounded-2xl border border-[#BED6FF]/[0.12] bg-gradient-to-b from-[#0e1630]/85 to-[#060a16]/90 shadow-[0_30px_70px_-42px_rgba(0,0,0,0.95)]";
const heading =
  "font-[var(--font-gotham-bold)] font-semibold tracking-tight text-white";
const muted = "text-sm leading-6 text-white/65";
const actionLink =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#BED6FF]/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-[#55DFFF]/60 hover:bg-[#55DFFF]/[0.07] hover:text-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF]";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] px-5 py-2.5 text-sm font-semibold text-[#04101a] transition hover:from-[#B5F2FF] hover:to-[#55DFFF] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200";
const textLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-[#55DFFF] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF]";

const css = `
.db-rise{opacity:0;animation:db-rise .8s cubic-bezier(.22,1,.36,1) forwards;animation-delay:var(--d,0s)}
.db-card{transition:border-color .4s ease,transform .5s cubic-bezier(.22,1,.36,1)}
.db-card:hover{border-color:color-mix(in srgb,var(--c,#55DFFF) 45%,transparent);transform:translateY(-2px)}
.db-nav a{position:relative;transition:color .3s ease,padding .3s ease}
.db-nav a:hover{color:#fff;padding-left:6px}
.db-orbit{animation:db-orbit 160s linear infinite}
@keyframes db-rise{from{opacity:0;transform:translate3d(0,18px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes db-orbit{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .db-rise{animation:none;opacity:1}
  .db-orbit{animation:none!important}
  .db-card{transition:none!important}
}
`;

function rise(delay: number) {
  return { "--d": `${delay}s` } as React.CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const STAR_PATH = "M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z";

function StarGlyph({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

function Arrow({ dir = "right", className = "h-4 w-4" }: { dir?: "right" | "down" | "up-right"; className?: string }) {
  const d =
    dir === "right"
      ? "M4 12h15M13 5l7 7-7 7"
      : dir === "down"
        ? "M12 4v15M5 13l7 7 7-7"
        : "M7 17L17 7M8 7h9v9";
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatIcon({ kind }: { kind: "profile" | "pass" | "team" | "order" }) {
  const common = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      {kind === "profile" && (
        <>
          <circle cx="12" cy="8.5" r="3.6" {...common} />
          <path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" {...common} />
        </>
      )}
      {kind === "pass" && (
        <>
          <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.2a1.8 1.8 0 0 0 0 3.6V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a1.8 1.8 0 0 0 0-3.6z" {...common} />
          <path d="M14 7v10" {...common} strokeDasharray="1.5 2.5" />
        </>
      )}
      {kind === "team" && (
        <>
          <circle cx="9" cy="9" r="3" {...common} />
          <circle cx="17" cy="10" r="2.4" {...common} />
          <path d="M3.5 19c.6-3 2.7-4.6 5.5-4.6s4.9 1.6 5.5 4.6" {...common} />
          <path d="M15.5 14.6c2.6-.3 4.4 1 5 3.6" {...common} />
        </>
      )}
      {kind === "order" && (
        <>
          <path d="M6 4h12v16l-3-1.8L12 20l-3-1.8L6 20z" {...common} />
          <path d="M9 9h6M9 12.5h6" {...common} />
        </>
      )}
    </svg>
  );
}

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

      const cap = w < 700 ? 34 : 64;
      const count = Math.round(Math.min(cap, Math.max(22, (w * h) / 22000)));

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
        n.py = (((n.y - scrollY * 0.12 * n.z) % h) + h) % h;
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
          const alpha = (1 - d2 / link2) * 0.3 * Math.min(a.z, b.z) * 1.4;
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
          const alpha = (1 - d2 / reach2) * 0.45;
          ctx.strokeStyle = `rgba(205,228,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.28 + 0.5 * n.z) * twinkle;
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
/* Shell and shared pieces                                             */
/* ------------------------------------------------------------------ */

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate min-h-dvh overflow-x-clip bg-black px-4 pb-20 pt-24 text-white [font-family:var(--font-gotham-book)] sm:px-6 sm:pt-28 lg:px-8">
      <style>{css}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 28%, #0a1430 0%, #04060f 54%, #000000 100%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 82% 60%, rgba(179,164,255,0.1) 0%, transparent 58%)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.15) 64%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,0,0,0.6) 100%)" }}
          />
          <ConstellationField />
        </div>
      </div>

      {children}
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#55DFFF]">
            <StarGlyph className="h-2.5 w-2.5 shrink-0" />
            {eyebrow}
          </p>
        )}
        <h2 className={`${heading} text-xl sm:text-2xl`}>{title}</h2>
        {description && <p className={`mt-1.5 max-w-xl ${muted}`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "info" | "neutral";
}) {
  const tones = {
    success: "border-[#6FF0C8]/30 bg-[#6FF0C8]/10 text-[#8DF5D3]",
    warning: "border-[#FFC46B]/30 bg-[#FFC46B]/10 text-[#FFD28F]",
    info: "border-[#55DFFF]/30 bg-[#55DFFF]/10 text-[#8BEAFF]",
    neutral: "border-white/12 bg-white/[0.05] text-white/70",
  };
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#BED6FF]/20 px-5 py-9 text-center sm:px-8">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-[#55DFFF]/30 bg-[#55DFFF]/[0.07] text-[#8BEAFF]">
        <StarGlyph className="h-4 w-4" />
      </div>
      <h3 className={`${heading} mt-4 text-base`}>{title}</h3>
      <p className={`mx-auto mt-1.5 max-w-md ${muted}`}>{description}</p>
      {href && action && (
        <Link href={href} className={`${primaryButton} mt-5`}>
          {action} <Arrow />
        </Link>
      )}
    </div>
  );
}

function HowToRegister() {
  const steps = [
    {
      title: "Complete your profile",
      description:
        "Add your personal and academic details. Make sure your information is correct before registering.",
    },
    {
      title: "Explore events",
      description:
        "Browse the available TechXetra events and check their participation requirements to see whether individual or team registration is needed.",
    },
    {
      title: "Create or join a team (if required)",
      description:
        "Some events require team participation, while others allow individual registration. If a team is required, create or join one. All team members must have registered on the TechXetra platform, as team invitations are sent through the platform itself.",
    },
    {
      title: "Register for an event",
      description:
        "Open your chosen event and follow its registration instructions. For team events, make sure your team is ready before completing registration, if required.",
    },
    {
      title: "Check your registration",
      description:
        "Visit your Registrations page to review your registration status and related details.",
    },
    {
      title: "Access your digital pass",
      description:
        "If a pass is issued for your registration, open My Digital Passes to view your pass and QR code. Follow any event-specific entry instructions.",
    },
  ];

  return (
    <section id="how-to-register" className={`${panel} scroll-mt-28 p-5 sm:p-7 lg:p-8`}>
      <SectionHeading
        eyebrow="New to TechXetra?"
        title="How to register for an event"
        description="A simple guide to help you get from your account to your event."
      />

      <ol className="relative grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.title}
            className="relative rounded-xl border border-[#BED6FF]/[0.1] bg-white/[0.025] p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-[#B3A4FF]/35 bg-[#B3A4FF]/10 text-[#C9BEFF]">
              <StarGlyph className="h-3.5 w-3.5" />
            </span>
            <h3 className={`${heading} mt-4 text-[15px] leading-snug`}>{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">{step.description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
        <Link href="/events" className={primaryButton}>
          Explore events <Arrow />
        </Link>
        <Link href="/registrations" className={actionLink}>
          View my registrations <Arrow />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [preparingTickets, setPreparingTickets] = useState<PreparingTicket[]>([]);
  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [invites, setInvites] = useState<TeamMember[]>([]);
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      let currentUser: UserProfile | null = null;
      try {
        currentUser = await participantApi.auth.me();
        setUser(currentUser);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        throw err;
      }

      const [ticketsRes, teamsRes, invitesRes, purchasesRes] = await Promise.allSettled([
        participantApi.tickets.myTickets(),
        participantApi.teams.myTeams(),
        participantApi.teams.myInvites(),
        participantApi.purchases.list(),
      ]);

      if (ticketsRes.status === "fulfilled" && ticketsRes.value) {
        setTickets(ticketsRes.value.tickets || []);
        setPreparingTickets(ticketsRes.value.preparing_tickets || []);
      }
      if (teamsRes.status === "fulfilled" && teamsRes.value) setTeams(teamsRes.value || []);
      if (invitesRes.status === "fulfilled" && invitesRes.value) setInvites(invitesRes.value || []);
      if (purchasesRes.status === "fulfilled" && purchasesRes.value) setPurchases(purchasesRes.value || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setActionMessage("Some dashboard information could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAcceptInvite = async (memberId: string) => {
    try {
      setBusyInviteId(memberId);
      setActionMessage(null);
      await participantApi.teams.acceptInvite(memberId);
      setActionMessage("Invitation accepted. Your team details are being updated.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not accept this invitation. Please try again.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleDeclineInvite = async (memberId: string) => {
    try {
      setBusyInviteId(memberId);
      setActionMessage(null);
      await participantApi.teams.declineInvite(memberId);
      setActionMessage("Invitation declined.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Could not decline this invitation. Please try again.");
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleRetryFulfillment = async (purchaseId: string) => {
    try {
      setRetryingId(purchaseId);
      setActionMessage(null);
      await participantApi.purchases.retryFulfillment(purchaseId);
      setActionMessage("Pass generation was requested successfully.");
      await fetchDashboardData();
    } catch (err: unknown) {
      setActionMessage(
        err instanceof Error
          ? err.message
          : "Pass generation could not be completed. Please contact support if this continues."
      );
    } finally {
      setRetryingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await participantApi.auth.logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-[1200px] animate-pulse space-y-6" aria-label="Loading dashboard">
          <div className="h-8 w-44 rounded-lg bg-white/10" />
          <div className="h-44 rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="h-40 rounded-2xl bg-white/[0.04]" />
            <div className="h-40 rounded-2xl bg-white/[0.04]" />
            <div className="h-40 rounded-2xl bg-white/[0.04]" />
            <div className="h-40 rounded-2xl bg-white/[0.04]" />
          </div>
          <p className="text-sm text-white/55">Loading your dashboard…</p>
        </div>
      </Shell>
    );
  }

  if (!user) return null;

  const profileComplete = Boolean(user.profileComplete ?? user.profile_complete);
  const isStudent = Boolean(user.isStudent ?? user.is_student);
  const studentFieldsLocked = Boolean(user.studentFieldsLocked ?? user.student_fields_locked);
  const missingFields = user.missingFields ?? user.missing_fields ?? [];

  const purchaseStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: "Paid",
      PENDING_VERIFICATION: "Pending verification",
      AWAITING_PAYMENT: "Awaiting payment",
    };
    return labels[status] ?? status.replaceAll("_", " ").toLowerCase();
  };

  const purchaseTone = (status: string): "success" | "warning" | "info" | "neutral" => {
    if (status === "PAID") return "success";
    if (status === "PENDING_VERIFICATION") return "warning";
    if (status === "AWAITING_PAYMENT") return "info";
    return "neutral";
  };

  const navItems = [
    { href: "#overview", label: "Overview" },
    { href: "#profile", label: "Profile" },
    { href: "#passes", label: "Digital passes" },
    { href: "#teams", label: "Teams" },
    { href: "#order-history", label: "Orders" },
    { href: "#how-to-register", label: "Guide" },
  ];

  return (
    <Shell>
      <div className="mx-auto max-w-[1200px] space-y-6 sm:space-y-8">
        {/* Welcome */}
        <header
          className="db-rise relative overflow-hidden rounded-2xl border border-[#BED6FF]/[0.14] bg-gradient-to-br from-[#101a3a]/90 via-[#080d1e]/90 to-[#05070f]/95 p-5 sm:p-8 lg:p-10"
          style={rise(0)}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] opacity-60">
            <div className="db-orbit h-full w-full">
              <svg viewBox="0 0 400 400" fill="none" className="h-full w-full">
                <circle cx="200" cy="200" r="190" stroke="#8FB4FF" strokeOpacity="0.25" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="140" stroke="#B3A4FF" strokeOpacity="0.2" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="3" fill="#CFE0FF" />
                <circle cx="62" cy="270" r="2.4" fill="#CFE0FF" />
              </svg>
            </div>
          </div>

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-[10px] font-semibold font-roboto uppercase tracking-[0.24em] text-[#55DFFF]">
                <StarGlyph className="h-2.5 w-2.5 shrink-0" />
                Participant dashboard
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                <h1 className={`${heading} break-words text-3xl  font-pixel leading-[1.08] sm:text-4xl lg:text-5xl`}>
                  Welcome,{" "}
                  <span className="bg-gradient-to-r from-[#8BEAFF] to-[#C9BEFF] bg-clip-text text-transparent">
                    {user.name}
                  </span>
                </h1>
                <StatusPill tone="info">{user.role}</StatusPill>
              </div>

              <p className="mt-4 break-all text-sm text-white/75">{user.email}</p>
              <p className="mt-1 break-all font-mono text-xs text-white/45">Account ID: {user.id}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/events" className={primaryButton}>
                Browse events <Arrow />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#BED6FF]/20 px-4 py-2.5 text-sm text-white/80 transition hover:border-red-300/50 hover:bg-red-300/[0.07] hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Guide notice */}
        <aside
          aria-label="Registration guide notice"
          className="db-rise relative overflow-hidden rounded-2xl border border-[#FFC46B]/25 bg-gradient-to-r from-[#FFC46B]/[0.08] to-[#FFC46B]/[0.02] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5"
          style={rise(0.08)}
        >
          <div className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#FFC46B]/35 bg-[#FFC46B]/10 text-[#FFD28F]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 11v5.5M12 7.6v.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFD28F]">New to TechXetra?</p>
              <h2 className={`${heading} mt-1 text-base`}>Need help registering for an event?</h2>
              <p className="mt-1 text-sm leading-6 text-white/70">
                A step-by-step guide is available near the bottom of this dashboard.
                Scroll down or jump straight to the guide.
              </p>
            </div>
          </div>
          <a
            href="#how-to-register"
            className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#FFC46B]/40 px-4 py-2 text-sm font-semibold text-[#FFE0B0] transition hover:bg-[#FFC46B]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:mt-0"
          >
            How to register <Arrow dir="down" />
          </a>
        </aside>

        {actionMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start justify-between gap-4 rounded-2xl border border-[#55DFFF]/30 bg-[#55DFFF]/[0.08] p-4 text-sm leading-6 text-cyan-50"
          >
            <p>{actionMessage}</p>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              aria-label="Dismiss message"
              className="shrink-0 rounded-lg px-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {!profileComplete && (
          <section className="flex flex-col gap-4 rounded-2xl border border-[#FFC46B]/30 bg-gradient-to-r from-[#FFC46B]/[0.09] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <StatusPill tone="warning">Action needed</StatusPill>
              <h2 className={`${heading} mt-3 text-lg`}>Complete your profile to get started</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/70">
                Add your required details before registering for events or purchasing passes.
                {missingFields.length > 0 && (
                  <span className="mt-1 block text-[#FFD28F]">
                    Still needed: {missingFields.join(", ")}
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/profile-completion"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#FFD28F] to-[#FFB347] px-5 py-2.5 text-sm font-semibold text-[#1a1004] transition hover:from-[#FFE0B0] hover:to-[#FFC46B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              Complete profile <Arrow />
            </Link>
          </section>
        )}

        <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
          {/* Section navigation */}
          <nav aria-label="Dashboard sections" className="mb-6 lg:mb-0">
            <ul className="db-nav -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:sticky lg:top-28 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-l lg:border-white/10 lg:pb-0 lg:pl-5">
              {navItems.map((item) => (
                <li key={item.href} className="shrink-0">
                  <a
                    href={item.href}
                    className="inline-flex min-h-9 items-center rounded-full border border-[#BED6FF]/15 px-3.5 text-[13px] text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] lg:min-h-8 lg:rounded-none lg:border-0 lg:px-0"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-6 sm:space-y-8">
            {/* Overview */}
            <section id="overview" aria-label="Dashboard overview" className="grid scroll-mt-28 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <div className={`${panel} db-card db-rise p-4 sm:p-5`} style={{ ...rise(0.1), "--c": "#55DFFF" } as React.CSSProperties}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#55DFFF]/12 text-[#55DFFF]">
                  <StatIcon kind="profile" />
                </span>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">Profile</p>
                <p className={`${heading} mt-1.5 text-xl`}>{profileComplete ? "Complete" : "Incomplete"}</p>
                <div className="mt-3">
                  <StatusPill tone={profileComplete ? "success" : "warning"}>
                    {profileComplete ? "Ready to continue" : "Finish setup"}
                  </StatusPill>
                </div>
                <Link href="/profile-completion" className={`${textLink} mt-4`}>
                  View profile <Arrow className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className={`${panel} db-card db-rise p-4 sm:p-5`} style={{ ...rise(0.16), "--c": "#B3A4FF" } as React.CSSProperties}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#B3A4FF]/12 text-[#C9BEFF]">
                  <StatIcon kind="pass" />
                </span>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">Digital passes</p>
                <p className={`${heading} mt-1.5 text-3xl tabular-nums`}>{tickets.length}</p>
                <p className="mt-1 text-sm text-white/60">Passes currently available</p>
                <Link href="/me/tickets" className={`${textLink} mt-4`}>
                  View passes <Arrow className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className={`${panel} db-card db-rise p-4 sm:p-5`} style={{ ...rise(0.22), "--c": "#6FF0C8" } as React.CSSProperties}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#6FF0C8]/12 text-[#8DF5D3]">
                  <StatIcon kind="team" />
                </span>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">My teams</p>
                <p className={`${heading} mt-1.5 text-3xl tabular-nums`}>{teams.length}</p>
                <p className="mt-1 text-sm text-white/60">
                  {invites.length} pending invitation{invites.length === 1 ? "" : "s"}
                </p>
                <Link href="/teams" className={`${textLink} mt-4`}>
                  Manage teams <Arrow className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className={`${panel} db-card db-rise p-4 sm:p-5`} style={{ ...rise(0.28), "--c": "#FFC46B" } as React.CSSProperties}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFC46B]/12 text-[#FFD28F]">
                  <StatIcon kind="order" />
                </span>
                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">Orders</p>
                <p className={`${heading} mt-1.5 text-3xl tabular-nums`}>{purchases.length}</p>
                <p className="mt-1 text-sm text-white/60">Orders in your account</p>
                <a href="#order-history" className={`${textLink} mt-4`}>
                  View history <Arrow dir="down" className="h-3.5 w-3.5" />
                </a>
              </div>
            </section>

            {/* Profile details */}
            <section id="profile" className={`${panel} scroll-mt-28 p-5 sm:p-7`}>
              <SectionHeading
                eyebrow="Your account"
                title="Profile details"
                description="Review the information connected to your TechXetra account."
                action={
                  <Link href="/profile-completion" className={actionLink}>
                    Edit profile <Arrow />
                  </Link>
                }
              />
              <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-white/50">Phone number</dt>
                  <dd className="mt-1.5 break-words text-[15px] text-white">
                    {user.phone ? `+91 ${user.phone}` : "Not added yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-white/50">Attendee type</dt>
                  <dd className="mt-1.5 text-[15px] text-white">{isStudent ? "Student" : "General attendee"}</dd>
                </div>
                {isStudent && (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-white/50">Institution</dt>
                    <dd className="mt-1.5 break-words text-[15px] text-white">
                      {user.institutionName ?? user.institution_name ?? "Not added yet"}
                    </dd>
                  </div>
                )}
                {isStudent && (
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-white/50">Student ID</dt>
                    <dd className="mt-1.5 break-words text-[15px] text-white">
                      {user.institutionId ?? user.institution_id ?? "Not added yet"}
                    </dd>
                  </div>
                )}
                {studentFieldsLocked && (
                  <div className="sm:col-span-2 xl:col-span-3">
                    <StatusPill tone="success">Student ID verified and locked</StatusPill>
                  </div>
                )}
              </dl>
            </section>

            {/* Invitations */}
            {invites.length > 0 && (
              <section className={`${panel} p-5 sm:p-7`}>
                <SectionHeading
                  eyebrow="Team updates"
                  title="Pending invitations"
                  description="Accept an invitation to join a team, or decline if it isn't for you."
                />
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-4 rounded-xl border border-[#FFC46B]/20 bg-[#FFC46B]/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="min-w-0">
                        <h3 className={`${heading} text-[15px]`}>
                          {(invite as any).team_name ? `Invitation to join ${(invite as any).team_name}` : "Team invitation"}
                        </h3>
                        <p className="mt-1.5 break-words text-sm leading-6 text-white/65">
                          {(invite as any).event_title && <span className="text-[#8BEAFF]">{(invite as any).event_title} · </span>}
                          Sent to {invite.invited_email} · {new Date(invite.invited_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyInviteId === invite.id}
                          onClick={() => handleAcceptInvite(invite.id)}
                          className={`${primaryButton} min-h-10`}
                        >
                          {busyInviteId === invite.id ? "Please wait…" : "Accept invite"}
                        </button>
                        <button
                          type="button"
                          disabled={busyInviteId === invite.id}
                          onClick={() => handleDeclineInvite(invite.id)}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#BED6FF]/20 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <Link href="/me/team-invites" className={textLink}>
                    View all invitations <Arrow className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            )}

            {/* Preparing passes */}
            {preparingTickets.length > 0 && (
              <section className={`${panel} p-5 sm:p-7`}>
                <SectionHeading
                  eyebrow="Order updates"
                  title="Passes being prepared"
                  description="Some passes may need a little time before they become available."
                />
                <div className="space-y-3">
                  {preparingTickets.map((prep) => (
                    <div
                      key={prep.purchase_id}
                      className="flex flex-col gap-3 rounded-xl border border-[#BED6FF]/[0.12] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="min-w-0">
                        <p className={`${heading} break-words text-sm`}>Order {prep.purchase_id}</p>
                        <p className="mt-1 text-sm leading-6 text-white/65">{prep.message}</p>
                      </div>
                      {prep.can_retry && (
                        <button
                          type="button"
                          disabled={retryingId === prep.purchase_id}
                          onClick={() => handleRetryFulfillment(prep.purchase_id)}
                          className={`${primaryButton} min-h-10 shrink-0`}
                        >
                          {retryingId === prep.purchase_id ? "Requesting…" : "Try generating passes"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Passes */}
            <section id="passes" className={`${panel} scroll-mt-28 p-5 sm:p-7`}>
              <SectionHeading
                eyebrow="Entry to TechXetra"
                title="My digital passes"
                description="Your available passes and entry information will appear here."
                action={
                  <Link href="/me/tickets" className={actionLink}>
                    Full pass view <Arrow />
                  </Link>
                }
              />
              {tickets.length === 0 ? (
                <EmptyState
                  title="No digital passes yet"
                  description="Once a pass is issued to your account, you can find it here. You can explore events to see what's available."
                  href="/events"
                  action="Explore events"
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {tickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      className="relative overflow-hidden rounded-xl border border-[#55DFFF]/25 bg-gradient-to-br from-[#55DFFF]/[0.07] via-[#0a1226]/60 to-[#B3A4FF]/[0.06] p-5 sm:p-6"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-[3px]"
                        style={{ background: "linear-gradient(90deg, #55DFFF, #B3A4FF)" }}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <StatusPill tone="info">{ticket.ticket_type}</StatusPill>
                          <h3 className={`${heading} mt-3 break-words text-lg`}>
                            {ticket.event?.title || "TechXetra Gate Pass"}
                          </h3>
                          <p className="mt-1.5 break-all font-mono text-xs text-white/50">Ticket ID: {ticket.id}</p>
                          <p className="mt-2 text-sm text-white/70">Pass type: {ticket.tier}</p>
                        </div>
                        <StatusPill tone={ticket.validity.state === "VALID" ? "success" : "warning"}>
                          {ticket.validity.state === "VALID" ? "Valid" : ticket.validity.state.replaceAll("_", " ")}
                        </StatusPill>
                      </div>

                      {ticket.tier === "STUDENT" && (
                        <div className="mt-4 rounded-lg border border-[#FFC46B]/25 bg-[#FFC46B]/[0.07] p-3 text-sm leading-6 text-[#FFE0B0]">
                          {ticket.student_id_warning || "Please bring your physical college ID for check-in."}
                        </div>
                      )}

                      <div className="mt-5 border-t border-dashed border-[#BED6FF]/25 pt-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">QR entry token</p>
                        <p className="mt-2 break-all rounded-lg bg-black/40 p-3 font-mono text-xs leading-5 text-[#BFF2FF]">
                          {ticket.qr_token}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-white/55">
                          Valid from {new Date(ticket.validity.valid_from).toLocaleDateString()} to {new Date(ticket.validity.valid_to).toLocaleDateString()}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Link href="/me/tickets" className={textLink}>
                            Open pass and QR code <Arrow className="h-3.5 w-3.5" />
                          </Link>
                          {(ticket.event?.whatsappUrl || (ticket.event as any)?.whatsapp_url) && (
                            <a
                              href={ticket.event?.whatsappUrl || (ticket.event as any)?.whatsapp_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-3 py-1.5 text-xs font-semibold text-[#4EE88A] transition hover:bg-[#25D366]/25"
                            >
                              Join WhatsApp Group <Arrow dir="up-right" className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Teams */}
            <section id="teams" className={`${panel} scroll-mt-28 p-5 sm:p-7`}>
              <SectionHeading
                eyebrow="Your groups"
                title="Teams and memberships"
                description="See the teams you're part of and manage team activity."
                action={
                  <Link href="/teams" className={actionLink}>
                    Manage teams <Arrow />
                  </Link>
                }
              />
              {teams.length === 0 ? (
                <EmptyState
                  title="You're not part of a team yet"
                  description="If an event supports teams, you can join one through an invitation or the team options available for that event."
                  href="/teams"
                  action="Explore teams"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => (
                    <article
                      key={team.id}
                      className="db-card rounded-xl border border-[#BED6FF]/[0.12] bg-white/[0.025] p-4 sm:p-5"
                      style={{ "--c": "#6FF0C8" } as React.CSSProperties}
                    >
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#6FF0C8]/12 text-[#8DF5D3]">
                        <StarGlyph className="h-3.5 w-3.5" />
                      </span>
                      <h3 className={`${heading} mt-3 break-words text-base`}>{team.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill tone={team.leader_id === user.id ? "info" : "neutral"}>
                          {team.leader_id === user.id ? "Team leader" : "Team member"}
                        </StatusPill>
                        <StatusPill>{team.status}</StatusPill>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="mt-5">
                <Link href="/me/team-invites" className={textLink}>
                  Open invitation inbox ({invites.length}) <Arrow className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>

            {/* Orders */}
            <section id="order-history" className={`${panel} scroll-mt-28 p-5 sm:p-7`}>
              <SectionHeading
                eyebrow="Payments and orders"
                title="Order history"
                description="Check the status, date and amount of your orders."
              />
              {purchases.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="When you make an order, its details and current status will appear here."
                  href="/events"
                  action="Browse events"
                />
              ) : (
                <div className="divide-y divide-white/[0.08]">
                  {purchases.map((purchase) => {
                    const p = purchase as any;

                    const rawAmountInr = p.totalAmountInr;
                    const rawPaise =
                      p.totalAmountPaise ??
                      p.total_amount_paise ??
                      p.amountPaise ??
                      p.amount_paise;
                    const rawAmount = p.amount ?? p.total_amount;

                    let amountFormatted = "0.00";

                    if (
                      typeof rawAmountInr === "number" &&
                      !isNaN(rawAmountInr)
                    ) {
                      amountFormatted = rawAmountInr.toFixed(2);
                    } else if (
                      typeof rawPaise === "number" &&
                      !isNaN(rawPaise)
                    ) {
                      amountFormatted = (rawPaise / 100).toFixed(2);
                    } else if (
                      typeof rawAmount === "number" &&
                      !isNaN(rawAmount)
                    ) {
                      amountFormatted = (
                        rawAmount > 1000 ? rawAmount / 100 : rawAmount
                      ).toFixed(2);
                    } else {
                      const parsed = Number(
                        rawAmountInr ?? rawPaise ?? rawAmount
                      );

                      if (!isNaN(parsed) && parsed > 0) {
                        amountFormatted = (
                          rawPaise != null || parsed > 1000
                            ? parsed / 100
                            : parsed
                        ).toFixed(2);
                      }
                    }

                    const rawDate =
                      p.created_at ?? p.createdAt ?? p.updated_at;

                    const dateObj = rawDate ? new Date(rawDate) : null;

                    const formattedDate =
                      dateObj && !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                        : "Recent";

                    const orderTitle =
                      p.items?.[0]?.descriptionSnapshot?.title ||
                      p.registrations?.[0]?.event_title ||
                      (p.items?.[0]?.item_type === "GATE_PASS" ||
                        p.items?.[0]?.itemType === "GATE_PASS"
                        ? "Festival Gate Pass"
                        : null);

                    return (
                      <div
                        key={purchase.id}
                        className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`${heading} break-words text-sm`}>
                              Order {p.publicId || purchase.id}
                            </p>

                            <StatusPill tone={purchaseTone(purchase.status)}>
                              {purchaseStatusLabel(purchase.status)}
                            </StatusPill>
                          </div>

                          <p className="mt-1.5 text-sm text-white/60">
                            {formattedDate}
                            {orderTitle && (
                              <span className="ml-2 text-[#8BEAFF]">
                                · {orderTitle}
                              </span>
                            )}
                          </p>

                          {purchase.status === "AWAITING_PAYMENT" && (
                            <p className="mt-1.5 text-xs text-[#8BEAFF]">
                              Your reservation is active while payment is pending.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                          <p className={`${heading} text-lg tabular-nums`}>
                            ₹{amountFormatted}
                          </p>

                          {purchase.status === "AWAITING_PAYMENT" && (
                            <Link
                              href={`/checkout/${encodeURIComponent(purchase.id)}/pay`}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#8BEAFF] to-[#3FC6EE] px-3.5 py-1.5 text-xs font-semibold text-[#04101a] transition hover:from-[#B5F2FF] hover:to-[#55DFFF]"
                            >
                              Complete Payment <Arrow className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <HowToRegister />

            <footer className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm leading-6 text-white/55 sm:flex-row sm:items-center sm:justify-between">
              <p>Need a hand? Review the event instructions or contact the TechXetra team.</p>
              <Link href="/events" className={textLink}>
                Back to events <Arrow className="h-3.5 w-3.5" />
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </Shell>
  );
}