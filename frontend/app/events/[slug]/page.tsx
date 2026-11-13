"use client";

import { useEffect, useRef, useState, use, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Tag,
  Shield,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Trophy,
  BookOpen,
  Sparkles,
  Layers,
  Scale,
  Compass,
} from "lucide-react";
import type { EventItem, UserProfile, FormFieldDefinition } from "@/types/api";
import DynamicQuestionnaireModal from "@/components/forms/DynamicQuestionnaireModal";
import { participantApi } from "@/services/participant-api";

interface EventMetadata {
  sub_category?: string;
  organizer?: string;
  tagline?: string;
  full_name?: string;
  eligibility?: string;
  rules?: string[] | string;
  tracks?: { name?: string; title?: string; scope?: string; description?: string }[];
  evaluation_criteria?: { criterion?: string; weight_percentage?: number; focus?: string }[];
  prizes?:
  | {
    total_prize_pool_inr?: number;
    breakdown?: { position?: string; prize_inr?: number; reward?: string }[];
    notes?: string;
  }
  | string;
  prize_pool_inr?: number;
  timeline?: { stage?: string; activities?: string }[];
  rounds?: { stage?: number | string; name?: string; details?: string }[];
  event_format?: { stage?: number | string; name?: string; details?: string }[];
  software_required?: string;
  tools_allowed?: string;
  materials_provided?: string;
  device_requirement?: string;
  coordinators?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  leadership?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  event_heads?:
  | { name?: string; phone?: string; email?: string; role?: string }[]
  | string;
  submitted_by?: string;
  mode?: string;
  tournament_format?: string;
  structure_and_rules?: string;
  duration_and_rules?: string;
  timing_rules?: string;
  registration?: {
    platform?: string;
    registration_fee_inr?: number;
    fee_type?: string;
    accommodation_and_food_fee_inr?: number;
    accommodation_notes?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Theme + shared styling                                              */
/* ------------------------------------------------------------------ */

const STAR_PATH = "M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z";

const FONT = {
  display: "[font-family:var(--font-roboto)]",
  body: "[font-family:var(--font-gotham-book)]",
  pixel: "font-pixel",
} as const;

const GRADIENT_TEXT =
  "bg-gradient-to-b from-white via-[#D4D5DE] to-[#5E6272] bg-clip-text text-transparent";

const BTN_PRIMARY = `inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-[#FFB3DE] to-[#FF6DB4] px-5 py-3 text-sm font-semibold text-[#1a0612] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(255,109,180,0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF8AC8] ${FONT.display}`;

const BTN_SECONDARY = `inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[rgba(190,214,255,0.18)] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/85 transition duration-300 hover:-translate-y-0.5 hover:border-[#FF8AC8]/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF8AC8] ${FONT.display}`;

const GUIDE_STEPS = [
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

const css = `
.ev-root{--a:#FF8AC8;--a-soft:rgba(255,138,200,.16);--a2:#FFD27A;--a2-soft:rgba(255,210,122,.14);--line:rgba(190,214,255,.12)}

.ev-card{position:relative;border:1px solid var(--line);border-radius:16px;
  background:linear-gradient(180deg,#0e1630,#060a16);box-shadow:0 24px 60px -34px rgba(0,0,0,.9)}
.ev-card::after{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;pointer-events:none;opacity:.6;
  background:linear-gradient(90deg,transparent,var(--a),transparent)}
.ev-card::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .4s ease;
  background:radial-gradient(300px circle at var(--mx,70%) var(--my,0%),var(--a-soft),transparent 70%)}
@media (hover:hover){.ev-card:hover::before{opacity:1}}

.ev-tile{border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.025)}
.ev-link-card{transition:border-color .35s ease,transform .45s cubic-bezier(.22,1,.36,1)}
.ev-link-card:hover{border-color:rgba(255,138,200,.45);transform:translateY(-3px)}

.ev-chip{transition:border-color .3s ease,color .3s ease,background .3s ease}
.ev-chip:hover{border-color:rgba(255,138,200,.5);color:#fff;background:rgba(255,138,200,.08)}
.ev-chips{scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ev-chips::-webkit-scrollbar{display:none}

.ev-rise{animation:ev-rise .75s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0) * 70ms)}
.ev-orbit{animation:ev-orbit 140s linear infinite}
.ev-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:ev-draw 2.4s .5s cubic-bezier(.6,0,.2,1) forwards}
.ev-ring{animation:ev-ring 2.4s ease-out infinite}
.ev-skel{animation:ev-skel 1.6s ease-in-out infinite}

@keyframes ev-rise{from{opacity:0;transform:translate3d(0,16px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
@keyframes ev-orbit{to{transform:rotate(360deg)}}
@keyframes ev-draw{to{stroke-dashoffset:0}}
@keyframes ev-ring{0%{transform:scale(.9);opacity:.7}100%{transform:scale(2.2);opacity:0}}
@keyframes ev-skel{0%,100%{opacity:.35}50%{opacity:.7}}

@media (prefers-reduced-motion:reduce){
  .ev-rise,.ev-orbit,.ev-ring,.ev-skel{animation:none!important}
  .ev-draw{animation:none!important;stroke-dashoffset:0}
  .ev-link-card,.ev-chip{transition:none!important}
}
`;

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Star({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`${FONT.pixel} flex items-center gap-2.5 text-[9px] uppercase tracking-[0.24em] text-[#FF8AC8] sm:text-[10px] ${className}`}
    >
      <Star className="h-2.5 w-2.5 shrink-0" />
      {children}
    </p>
  );
}

function SectionHead({
  icon,
  title,
  sub,
  gold = false,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  gold?: boolean;
}) {
  const tone = gold ? "#FFD27A" : "#FF8AC8";
  return (
    <div className="flex items-center gap-3.5">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
        style={{
          color: tone,
          borderColor: `${tone}40`,
          background: gold ? "rgba(255,210,122,0.1)" : "rgba(255,138,200,0.1)",
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className={`${FONT.display} text-lg leading-tight text-white sm:text-xl`}>{title}</h2>
        {sub && <p className="mt-1 text-xs leading-5 text-white/65 sm:text-[13px]">{sub}</p>}
      </div>
    </div>
  );
}

function Panel({
  id,
  delay = 0,
  className = "",
  children,
}: {
  id?: string;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`ev-card ev-rise scroll-mt-28 p-5 sm:p-7 ${className}`}
      style={{ "--i": delay } as CSSProperties}
    >
      {children}
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(190,214,255,0.12)] bg-white/[0.03] text-[#FF8AC8]">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className={`${FONT.pixel} text-[9px] uppercase tracking-[0.18em] text-white/60`}>{label}</dt>
        <dd className="mt-1 text-sm font-medium leading-5 text-white/90">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Lightweight constellation: drifting stars with depth parallax tied to scrollY,
 * lines between nearby stars and to the cursor on fine pointers.
 * DPR capped at 1.5, 72 nodes desktop / 38 mobile, pauses when the tab is hidden,
 * single static frame for reduced motion.
 */
function ConstellationField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    type Node = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number; c: string };
    const TINTS = ["225,238,255", "225,238,255", "225,238,255", "255,170,214", "255,214,140"];

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let nodes: Node[] = [];
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

      nodes = Array.from({ length: count }, (_, i) => {
        const y = Math.random() * h;
        return {
          x: Math.random() * w,
          y,
          py: y,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          z: 0.35 + Math.random() * 0.65,
          r: 0.6 + Math.random() * 1.4,
          c: TINTS[i % TINTS.length],
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
          ctx.strokeStyle = `rgba(175,200,255,${alpha.toFixed(3)})`;
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
          ctx.strokeStyle = `rgba(255,150,208,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.55 * n.z) * twinkle;
        ctx.fillStyle = `rgba(${n.c},${alpha.toFixed(3)})`;
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

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

/** Page shell: backdrop lives in a sticky h-svh layer so it stays light on long pages. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      className={`ev-root relative isolate min-h-svh overflow-x-clip bg-black text-white ${FONT.body}`}
    >
      <style>{css}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at 50% 30%, #0a1430 0%, #04060f 52%, #000 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 85% 14%, rgba(255,138,200,0.13) 0%, transparent 55%), radial-gradient(ellipse at 8% 78%, rgba(255,210,122,0.09) 0%, transparent 55%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.16) 64%, rgba(0,0,0,0.72) 100%)",
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

      <div className="relative z-10 px-4 pb-24 pt-28 sm:px-8 sm:pt-32">{children}</div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [categoryEvents, setCategoryEvents] = useState<EventItem[]>([]);
  const [isCategoryView, setIsCategoryView] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team creation modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Questionnaire modal state
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [registrationModalError, setRegistrationModalError] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<"team" | "solo">("team");
  const [pendingFormResponses, setPendingFormResponses] = useState<Record<string, any> | null>(null);

  const parsedSchema: FormFieldDefinition[] = useMemo(() => {
    const rawSchema = (event as any)?.formSchema ?? event?.form_schema;
    if (!rawSchema) return [];
    if (Array.isArray(rawSchema)) return rawSchema;
    if (typeof rawSchema === "object") {
      return Array.isArray((rawSchema as any).fields) ? (rawSchema as any).fields : [];
    }
    if (typeof rawSchema === "string") {
      try {
        const parsed = JSON.parse(rawSchema);
        return Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.fields) ? parsed.fields : []);
      } catch {
        return [];
      }
    }
    return [];
  }, [event?.form_schema, (event as any)?.formSchema]);

  useEffect(() => {
    async function loadEventData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch user auth status quietly
        participantApi.auth.me()
          .then((d) => {
            if (d) setUser(d);
          })
          .catch(() => null);

        // 1. Try fetching single event details first
        try {
          const singleData = await participantApi.events.get(slug);
          if (singleData && (singleData.id || singleData.slug)) {
            setEvent(singleData);
            setIsCategoryView(false);
            return;
          }
        } catch {
          // If single event fails, try category view
        }

        // 2. If not a single event, check if it's a category match
        const normalizedCategory = slug.toUpperCase().replace("-", "_");
        try {
          const catData = await participantApi.events.list({ category: normalizedCategory });
          const catItems = catData.events;
          if (Array.isArray(catItems) && catItems.length > 0) {
            setCategoryEvents(catItems);
            setIsCategoryView(true);
            return;
          }
        } catch {
          // Category lookup fallback
        }

        // 3. Fallback: list all events and see if slug matches title or slug
        try {
          const listData = await participantApi.events.list({ limit: 100 });
          const listItems = listData.events;
          const matched = listItems?.find(
            (e: EventItem) => e.slug === slug || e.id === slug,
          );
          if (matched) {
            setEvent(matched);
            setIsCategoryView(false);
            return;
          }
        } catch {
          // Fallback list failed
        }

        throw new Error("The requested event or category could not be found.");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load event details");
      } finally {
        setLoading(false);
      }
    }

    void loadEventData();
  }, [slug]);

  // Soft cursor spotlight on cards (fine pointers only, one delegated listener, rAF throttled).
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let lastEvent: PointerEvent | null = null;

    const onMove = (e: PointerEvent) => {
      lastEvent = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = lastEvent?.target as HTMLElement | null;
        const card = target?.closest?.<HTMLElement>(".ev-card");
        if (!card || !lastEvent) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(((lastEvent.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(((lastEvent.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  const handleStartTeamRegistration = () => {
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    const isComplete = Boolean(user.profileComplete ?? user.profile_complete);
    if (!isComplete) {
      router.push("/profile-completion");
      return;
    }

    if (!event) return;

    setRegistrationMode("team");

    if (parsedSchema.length > 0) {
      setRegistrationModalError(null);
      setShowQuestionnaireModal(true);
    } else {
      setShowTeamModal(true);
    }
  };

  const handleStartSoloRegistration = () => {
    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    const isComplete = Boolean(user.profileComplete ?? user.profile_complete);
    if (!isComplete) {
      router.push("/profile-completion");
      return;
    }

    if (!event) return;

    setRegistrationMode("solo");

    if (parsedSchema.length > 0) {
      setRegistrationModalError(null);
      setShowQuestionnaireModal(true);
    } else {
      void executeCheckout({});
    }
  };

  const handleQuestionnaireSubmit = async (responses: Record<string, any>) => {
    if (!event || !user) return;

    const isTeamEvent = event.max_team_size > 1 || event.is_team_event;

    if (registrationMode === "team" || (isTeamEvent && registrationMode !== "solo")) {
      setPendingFormResponses(responses);
      try {
        sessionStorage.setItem(`team_form_${event.id}`, JSON.stringify(responses));
      } catch {
        // ignore
      }
      setShowQuestionnaireModal(false);
      setShowTeamModal(true);
    } else {
      await executeCheckout(responses);
    }
  };

  const executeCheckout = async (responses: Record<string, any>) => {
    if (!event || !user) return;

    setSubmittingRegistration(true);
    setRegistrationModalError(null);

    try {
      const data = await participantApi.purchases.create({
        items: [
          {
            item_type: "EVENT_PASS",
            event_id: event.id,
            form_response:
              Object.keys(responses).length > 0 ? responses : undefined,
          } as any,
        ],
        acknowledge_student_id_policy: Boolean(
          user.isStudent ?? user.is_student
        ),
      });

      const purchase = data.purchase;

      if (!purchase?.id) {
        throw new Error("Purchase ID is missing from the response.");
      }

      setShowQuestionnaireModal(false);

      if (purchase.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(
          `/checkout/${encodeURIComponent(purchase.id)}/pay`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Registration error";

      if (parsedSchema.length > 0) {
        setRegistrationModalError(msg);
      } else {
        alert(msg);
      }
    } finally {
      setSubmittingRegistration(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !event) return;

    if (!user) {
      router.push(`/login?redirect=/events/${slug}`);
      return;
    }

    const isComplete = Boolean(user.profileComplete ?? user.profile_complete);
    if (!isComplete) {
      router.push("/profile-completion");
      return;
    }

    setCreatingTeam(true);
    setTeamError(null);

    try {
      const data = await participantApi.teams.create({
        eventId: event.id,
        name: teamName.trim(),
      });

      const teamId = data?.id || (data as any)?.team?.id;

      if (!teamId) {
        throw new Error("Team was created but could not retrieve team ID.");
      }

      if (pendingFormResponses) {
        try {
          sessionStorage.setItem(`team_form_${teamId}`, JSON.stringify(pendingFormResponses));
          sessionStorage.setItem(`team_form_${event.id}`, JSON.stringify(pendingFormResponses));
        } catch {
          // ignore
        }
      }

      setShowTeamModal(false);
      router.push(`/teams/${teamId}`);
    } catch (err: unknown) {
      setTeamError(err instanceof Error ? err.message : "Team creation failed");
    } finally {
      setCreatingTeam(false);
    }
  };

  /* ---------------------------- Loading ---------------------------- */

  if (loading) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-live="polite">
          <div className="ev-skel h-4 w-40 rounded-full bg-white/10" />
          <div className="ev-skel h-12 w-3/4 max-w-xl rounded-2xl bg-white/10" />
          <div className="ev-skel h-5 w-full max-w-2xl rounded-full bg-white/[0.07]" />
          <div className="grid gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div className="ev-skel h-56 rounded-2xl bg-white/[0.06]" />
              <div className="ev-skel h-40 rounded-2xl bg-white/[0.05]" />
            </div>
            <div className="ev-skel h-72 rounded-2xl bg-white/[0.06]" />
          </div>
        </div>
      </Shell>
    );
  }

  /* ----------------------------- Error ----------------------------- */

  if (error || (!event && !isCategoryView)) {
    return (
      <Shell>
        <div className="ev-card ev-rise mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FFD27A]/30 bg-[#FFD27A]/10 text-[#FFD27A]">
            <AlertCircle className="h-7 w-7" />
          </span>
          <h1 className={`${FONT.display} mt-5 text-2xl ${GRADIENT_TEXT}`}>Event Unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">{error || "Event not found."}</p>
          <Link href="/events" className={`${BTN_PRIMARY} mt-6 !w-auto`}>
            <ArrowLeft className="h-4 w-4" />
            Return to Events Directory
          </Link>
        </div>
      </Shell>
    );
  }

  /* ------------------------ Category track view ------------------------ */

  if (isCategoryView) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl">
          <Link
            href="/events"
            className="ev-rise inline-flex min-h-10 items-center gap-2 text-xs text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All categories
          </Link>

          <header className="ev-rise mt-4" style={{ "--i": 1 } as CSSProperties}>
            <Eyebrow>Event track</Eyebrow>
            <h1
              className={`${FONT.display} mt-4 text-[clamp(2.2rem,7vw,4.2rem)] uppercase leading-[1.02] tracking-[-0.04em] ${GRADIENT_TEXT}`}
            >
              {slug.replace("-", " ")} Events
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              Explore and register for events scheduled in this track.
            </p>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categoryEvents.map((item, i) => (
              <article
                key={item.id}
                className="ev-card ev-link-card ev-rise flex flex-col justify-between p-6"
                style={{ "--i": Math.min(i, 8) + 2 } as CSSProperties}
              >
                <div>
                  <p className={`${FONT.pixel} flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>
                    <Star className="h-2.5 w-2.5" />
                    Day {item.day_of_event} · {item.category}
                  </p>
                  <h2 className={`${FONT.display} mt-3 text-xl leading-snug text-white`}>{item.title}</h2>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-white/70">{item.description}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className={`${FONT.pixel} text-xs tracking-[0.1em] text-[#FFD27A]`}>
                    {item.price_model === "FREE"
                      ? "FREE"
                      : `₹${(item.pricePaise ? item.pricePaise / 100 : 0).toFixed(0)}`}
                  </span>
                  <Link
                    href={`/events/${item.slug || item.id}`}
                    className="group inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-white transition hover:text-[#FF8AC8]"
                  >
                    View details
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (!event) return null;

  /* ------------------------- Data preparation ------------------------- */

  // Parse rich metadata JSON
  let meta: EventMetadata = {};
  if (event.metadata) {
    try {
      meta = typeof event.metadata === "string" ? JSON.parse(event.metadata) : event.metadata;
    } catch {
      meta = {};
    }
  }

  const priceFormatted =
    event.price_model === "FREE"
      ? "FREE"
      : `₹${(event.pricePaise ? event.pricePaise / 100 : 0).toFixed(0)} (${event.price_model === "PER_PARTICIPANT" ? "Per Person" : "Per Team"
      })`;

  // Extract rules
  const rulesList: string[] = [];
  if (Array.isArray(meta.rules)) {
    rulesList.push(...meta.rules);
  } else if (typeof meta.rules === "string" && meta.rules.trim()) {
    rulesList.push(...meta.rules.split("\n").map((r) => r.trim()).filter(Boolean));
  } else if (typeof event.rules === "string" && event.rules.trim()) {
    rulesList.push(...event.rules.split("\n").map((r) => r.trim()).filter(Boolean));
  } else if (Array.isArray(event.rules)) {
    rulesList.push(...(event.rules as string[]));
  }
  if (typeof meta.structure_and_rules === "string") {
    rulesList.push(meta.structure_and_rules);
  } else if (typeof meta.structure_and_rules === "object" && meta.structure_and_rules !== null) {
    Object.entries(meta.structure_and_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }
  if (typeof meta.duration_and_rules === "string") {
    rulesList.push(meta.duration_and_rules);
  } else if (typeof meta.duration_and_rules === "object" && meta.duration_and_rules !== null) {
    Object.entries(meta.duration_and_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }
  if (typeof meta.timing_rules === "string") {
    rulesList.push(meta.timing_rules);
  } else if (typeof meta.timing_rules === "object" && meta.timing_rules !== null) {
    Object.entries(meta.timing_rules).forEach(([k, v]) => {
      rulesList.push(`${k.replace(/_/g, " ")}: ${v}`);
    });
  }

  // Extract prizes
  let prizePoolDisplay: string | null = null;
  let prizeBreakdown: { position?: string; prize_inr?: number; reward?: string }[] = [];
  let prizeNotes: string | null = null;

  const rawPrizes = Array.isArray(event.prizes) && event.prizes.length > 0
    ? event.prizes
    : Array.isArray(meta.prizes) && meta.prizes.length > 0
      ? meta.prizes
      : meta.prizes && typeof meta.prizes === "object"
        ? [meta.prizes]
        : [];

  if (rawPrizes.length > 0) {
    const firstItem = rawPrizes[0] as any;
    if (firstItem && typeof firstItem === "object" && Array.isArray(firstItem.breakdown)) {
      if (firstItem.total_prize_pool_inr) {
        prizePoolDisplay = `₹${firstItem.total_prize_pool_inr.toLocaleString("en-IN")}`;
      }
      prizeBreakdown = firstItem.breakdown;
      if (firstItem.notes) {
        prizeNotes = firstItem.notes;
      }
    } else {
      prizeBreakdown = rawPrizes as { position?: string; prize_inr?: number; reward?: string }[];
    }
  }

  if (!prizePoolDisplay) {
    if (meta.prize_pool_inr) {
      prizePoolDisplay = `₹${meta.prize_pool_inr.toLocaleString("en-IN")}`;
    } else if (prizeBreakdown.length > 0) {
      const sum = prizeBreakdown.reduce((acc, p) => acc + (p.prize_inr || 0), 0);
      if (sum > 0) {
        prizePoolDisplay = `₹${sum.toLocaleString("en-IN")}`;
      }
    }
  }

  const scheduleStages: {
    stage?: string | number;
    name?: string;
    activities?: string;
    details?: string;
  }[] = (Array.isArray(event.timeline) && event.timeline.length > 0)
      ? (event.timeline as any)
      : meta.timeline
        ? meta.timeline
        : meta.rounds
          ? meta.rounds
          : meta.event_format ?? [];

  // Extract coordinators
  const coordinatorsList: { name?: string; phone?: string; email?: string; role?: string }[] = [];
  if (Array.isArray(meta.coordinators)) {
    coordinatorsList.push(...meta.coordinators);
  }
  if (Array.isArray(meta.leadership)) {
    coordinatorsList.push(...meta.leadership);
  }
  if (Array.isArray(meta.event_heads)) {
    meta.event_heads.forEach((head) => {
      if (typeof head === "string") {
        coordinatorsList.push({ name: head, role: "Event Head" });
      } else if (typeof head === "object" && head !== null) {
        coordinatorsList.push(head);
      }
    });
  }

  const isTeamEvent = event.max_team_size > 1 || event.is_team_event;
  const hasPrizes = Boolean(prizePoolDisplay) || prizeBreakdown.length > 0;
  const hasTracks = Array.isArray(meta.tracks) && meta.tracks.length > 0;
  const hasCriteria = Array.isArray(meta.evaluation_criteria) && meta.evaluation_criteria.length > 0;

  const navItems = [
    hasPrizes ? { id: "ev-prizes", label: "Prizes" } : null,
    hasTracks ? { id: "ev-tracks", label: "Tracks" } : null,
    { id: "ev-rules", label: "Rules" },
    { id: "ev-schedule", label: "Schedule" },
    hasCriteria ? { id: "ev-judging", label: "Judging" } : null,
    { id: "ev-requirements", label: "Requirements" },
    { id: "ev-contacts", label: "Contacts" },
    { id: "registration-guide", label: "How to register" },
  ].filter(Boolean) as { id: string; label: string }[];

  const statusOpen = event.status === "OPEN";

  /* Registration actions (same handlers as before, new look). */
  const actions = (
    <div className="space-y-3">
      {isTeamEvent ? (
        <>
          <button type="button" onClick={handleStartTeamRegistration} className={`${BTN_PRIMARY} cursor-pointer`}>
            <Users className="h-4 w-4" />
            Create a Team
            <ArrowRight className="h-4 w-4" />
          </button>

          {event.min_team_size === 1 && (
            <button type="button" onClick={handleStartSoloRegistration} className={`${BTN_SECONDARY} cursor-pointer`}>
              Register as Solo
            </button>
          )}
        </>
      ) : (
        <button type="button" onClick={handleStartSoloRegistration} className={`${BTN_PRIMARY} cursor-pointer`}>
          Register Now
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {event.leaderboard_public && (
        <Link href={`/events/${event.id}/leaderboard`} className={BTN_SECONDARY}>
          <Trophy className="h-4 w-4 text-[#FFD27A]" />
          Leaderboard
        </Link>
      )}
    </div>
  );

  return (
    <Shell>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/events"
          className="ev-rise inline-flex min-h-10 items-center gap-2 text-xs text-white/70 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events Directory
        </Link>

        {/* Header */}
        <header className="relative mt-3">
          {/* Slow rotating dashed orbit ring (transform only) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 hidden h-[460px] w-[460px] sm:block lg:-right-10"
          >
            <div className="ev-orbit h-full w-full">
              <svg viewBox="0 0 400 400" fill="none" className="h-full w-full opacity-60">
                <circle cx="200" cy="200" r="190" stroke="#FF8AC8" strokeOpacity="0.3" strokeDasharray="1 7" />
                <circle cx="200" cy="200" r="140" stroke="#FFD27A" strokeOpacity="0.22" strokeDasharray="2 11" />
                <circle cx="390" cy="200" r="3" fill="#FFD27A" />
                <circle cx="62" cy="262" r="2.2" fill="#FF8AC8" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <div className="ev-rise flex flex-wrap items-center gap-2.5" style={{ "--i": 1 } as CSSProperties}>
              <span
                className={`${FONT.pixel} inline-flex items-center gap-2 rounded-full border border-[#FF8AC8]/35 bg-[#FF8AC8]/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}
              >
                <Star className="h-2.5 w-2.5" />
                {event.category}
              </span>
              {meta.sub_category && (
                <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80">
                  {meta.sub_category}
                </span>
              )}
              <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80">
                Day {event.day_of_event}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusOpen
                  ? "border-[#6FF0C8]/35 bg-[#6FF0C8]/10 text-[#6FF0C8]"
                  : "border-[#FFD27A]/35 bg-[#FFD27A]/10 text-[#FFD27A]"
                  }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="ev-ring absolute inset-0 rounded-full bg-current" />
                  <span className="relative h-2 w-2 rounded-full bg-current" />
                </span>
                {event.status}
              </span>
            </div>

            <h1
              className={`${FONT.display} ev-rise mt-5 max-w-3xl text-[clamp(2.2rem,7vw,4.6rem)] leading-[1.02] tracking-[-0.04em] ${GRADIENT_TEXT}`}
              style={{ "--i": 2 } as CSSProperties}
            >
              {event.title}
            </h1>

            {meta.tagline && (
              <p
                className="ev-rise mt-4 flex max-w-2xl items-start gap-2.5 text-sm font-medium italic leading-6 text-[#FFD27A] sm:text-base"
                style={{ "--i": 3 } as CSSProperties}
              >
                <Star className="mt-1.5 h-2.5 w-2.5 shrink-0" />
                <span>&ldquo;{meta.tagline}&rdquo;</span>
              </p>
            )}

            <p
              className="ev-rise mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base"
              style={{ "--i": 4 } as CSSProperties}
            >
              {event.description || "No description provided."}
            </p>

            {(meta.organizer || event.organizer) && (
              <p className="ev-rise mt-4 text-xs text-white/70" style={{ "--i": 5 } as CSSProperties}>
                Organized by <strong className="font-semibold text-white">{meta.organizer || event.organizer}</strong>
              </p>
            )}
          </div>
        </header>

        {/* Quick section navigation */}
        <nav
          aria-label="Jump to section"
          className="ev-rise mt-8 -mx-4 sm:mx-0"
          style={{ "--i": 5 } as CSSProperties}
        >
          <ul className="ev-chips flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
            {navItems.map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className={`ev-chip ${FONT.pixel} inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(190,214,255,0.16)] bg-white/[0.02] px-4 text-[10px] uppercase tracking-[0.16em] text-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8AC8]`}
                >
                  <Star className="h-2 w-2 text-[#FF8AC8]" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          {/* Registration card (first on mobile, sticky on desktop) */}
          <aside className="order-first lg:order-last lg:sticky lg:top-28">
            <div className="ev-card ev-rise p-5 sm:p-6" style={{ "--i": 6 } as CSSProperties}>
              <Eyebrow>Registration</Eyebrow>

              <p className={`${FONT.display} mt-4 text-3xl leading-tight tracking-[-0.03em] text-white sm:text-[2rem]`}>
                {priceFormatted}
              </p>
              <p className="mt-1 text-xs text-white/65">Registration fee</p>

              <dl className="mt-6 space-y-4 border-t border-white/10 pt-5">
                <Fact icon={<MapPin className="h-4 w-4" />} label="Venue">
                  {event.venue || "Campus Arena"}
                </Fact>
                <Fact icon={<Calendar className="h-4 w-4" />} label="Festival day">
                  Day {event.day_of_event}
                </Fact>
                <Fact icon={<Users className="h-4 w-4" />} label="Format">
                  {event.is_team_event
                    ? `Team (${event.min_team_size}–${event.max_team_size})`
                    : "Solo Event"}
                </Fact>
                <Fact icon={<CheckCircle className="h-4 w-4 text-[#6FF0C8]" />} label="Availability">
                  {event.seats_remaining !== null
                    ? `${event.seats_remaining} seats remaining`
                    : "Seats available"}
                </Fact>
              </dl>

              <div className="mt-6 border-t border-white/10 pt-5">{actions}</div>

              <a
                href="#registration-guide"
                className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#FFD27A] transition hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5" />
                First time registering? Read the guide
              </a>
            </div>
          </aside>

          {/* Content column */}
          <div className="min-w-0 space-y-6">
            {/* Prize Pool & Awards */}
            {hasPrizes && (
              <Panel id="ev-prizes" delay={7}>
                <SectionHead
                  gold
                  icon={<Trophy className="h-5 w-5" />}
                  title="Prize Pool & Awards"
                  sub="What the winners take home"
                />

                {prizePoolDisplay && (
                  <div className="ev-tile mt-6 flex flex-wrap items-end justify-between gap-3 p-5">
                    <div>
                      <p className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-white/65`}>
                        Total prize pool
                      </p>
                      <p
                        className={`${FONT.display} mt-2 bg-gradient-to-b from-[#FFF3D0] via-[#FFD27A] to-[#FF8AC8] bg-clip-text text-4xl leading-none tracking-[-0.03em] text-transparent sm:text-5xl`}
                      >
                        {prizePoolDisplay}
                      </p>
                    </div>
                    <Sparkles className="h-6 w-6 text-[#FFD27A]" />
                  </div>
                )}

                {prizeBreakdown.length > 0 && (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {prizeBreakdown.map((p, idx) => (
                      <li key={idx} className="ev-tile flex items-center justify-between gap-3 p-4">
                        <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-white">
                          <Star className="h-3 w-3 shrink-0 text-[#FFD27A]" />
                          <span className="min-w-0 break-words">{p.position}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-white/80">
                          {p.prize_inr ? (
                            <strong className="text-sm text-[#FFD27A]">₹{p.prize_inr.toLocaleString("en-IN")}</strong>
                          ) : null}
                          {p.reward && <span className="block">{p.reward}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {prizeNotes && <p className="mt-4 text-xs leading-6 text-white/70">{prizeNotes}</p>}
              </Panel>
            )}

            {/* Tracks */}
            {hasTracks && (
              <Panel id="ev-tracks" delay={8}>
                <SectionHead
                  icon={<Layers className="h-5 w-5" />}
                  title="Competition Tracks & Domains"
                  sub="Choose a focus area for your submission"
                />

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {meta.tracks!.map((track, idx) => (
                    <div key={idx} className="ev-tile ev-link-card p-5">
                      <p className={`${FONT.pixel} flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>
                        <Star className="h-2.5 w-2.5" />
                        Track
                      </p>
                      <h3 className={`${FONT.display} mt-2 text-base leading-snug text-white`}>
                        {track.name || track.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-6 text-white/75">
                        {track.scope || track.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Rules */}
            <Panel id="ev-rules" delay={9}>
              <SectionHead
                icon={<Shield className="h-5 w-5" />}
                title="Rules & Guidelines"
                sub="Official criteria and participation constraints"
              />

              {rulesList.length > 0 ? (
                <ul className="mt-6 space-y-3.5">
                  {rulesList.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] leading-6 text-white/85 sm:text-sm sm:leading-7">
                      <Star className="mt-2 h-2.5 w-2.5 shrink-0 text-[#FF8AC8]" />
                      <span className="min-w-0 break-words">{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ev-tile mt-6 p-4 text-[13px] leading-6 text-white/75">
                  Standard festival and fair-play regulations apply. Specific tournament rulebooks, match round draws, and evaluation criteria will be briefed by event coordinators at the venue ({event.venue || "Campus Arena"}).
                </div>
              )}
            </Panel>

            {/* Schedule */}
            <Panel id="ev-schedule" delay={10}>
              <SectionHead
                icon={<Calendar className="h-5 w-5" />}
                title="Event Timeline & Schedule"
                sub="Scheduled festival day and timeline"
              />

              {scheduleStages.length > 0 ? (
                <div className="relative mt-7">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-[9px] top-2 w-px bg-gradient-to-b from-[#FF8AC8]/60 via-white/15 to-transparent"
                  />
                  <ol className="space-y-5">
                    {scheduleStages.map((stage, idx) => (
                      <li key={idx} className="relative flex gap-4">
                        <span className="relative z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center bg-[#0a1020] text-[#FF8AC8]">
                          <Star className="h-4 w-4" />
                        </span>
                        <div className="ev-tile min-w-0 flex-1 p-4">
                          <p className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FFD27A]`}>
                            {stage.name ? "Stage" : "Round"}
                          </p>
                          {stage.name && (
                            <h4 className={`${FONT.display} mt-1.5 text-sm text-white sm:text-base`}>{stage.name}</h4>
                          )}
                          <p className="mt-1.5 text-[13px] leading-6 text-white/75">
                            {stage.activities || stage.details}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="ev-tile mt-6 flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className={`${FONT.display} text-sm text-white`}>Festival Day {event.day_of_event}</p>
                    <p className="mt-1 text-[13px] leading-6 text-white/70">
                      {event.venue ? `Venue: ${event.venue}` : "Venue to be announced"} · Event desk check-in starts in the morning
                    </p>
                  </div>
                  <span className={`${FONT.pixel} self-start rounded-full border border-[#FF8AC8]/35 bg-[#FF8AC8]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#FF8AC8] sm:self-auto`}>
                    Day {event.day_of_event}
                  </span>
                </div>
              )}
            </Panel>

            {/* Judging */}
            {hasCriteria && (
              <Panel id="ev-judging" delay={11}>
                <SectionHead
                  gold
                  icon={<Scale className="h-5 w-5" />}
                  title="Judging & Evaluation Criteria"
                  sub="Score weights and assessment parameters"
                />

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {meta.evaluation_criteria!.map((c, idx) => (
                    <div key={idx} className="ev-tile p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className={`${FONT.display} text-sm leading-snug text-white`}>{c.criterion}</h4>
                        {c.weight_percentage !== undefined && (
                          <span className={`${FONT.pixel} shrink-0 text-xs text-[#FFD27A]`}>{c.weight_percentage}%</span>
                        )}
                      </div>
                      {c.focus && <p className="mt-1.5 text-[13px] leading-6 text-white/70">{c.focus}</p>}
                      {c.weight_percentage !== undefined && (
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#FF8AC8] to-[#FFD27A]"
                            style={{ width: `${Math.min(100, Math.max(0, c.weight_percentage))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Requirements */}
            <Panel id="ev-requirements" delay={12}>
              <SectionHead
                icon={<Compass className="h-5 w-5" />}
                title="Requirements & Eligibility"
                sub="Prerequisites and participation mode"
              />

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="ev-tile p-4">
                  <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Eligibility</span>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">
                    {event.eligibility || meta.eligibility || "Open to all registered festival delegates and students with valid ID."}
                  </p>
                </div>

                <div className="ev-tile p-4">
                  <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Format & Capacity</span>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">
                    {event.is_team_event
                      ? `Team event (${event.min_team_size}–${event.max_team_size} members)`
                      : "Individual (Solo) competition"}
                    {event.capacity ? ` · Max ${event.capacity} ${event.capacity_unit || "seats"}` : ""}
                  </p>
                </div>

                {meta.software_required && (
                  <div className="ev-tile p-4">
                    <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Required Software</span>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">{meta.software_required}</p>
                  </div>
                )}

                {meta.tools_allowed && (
                  <div className="ev-tile p-4">
                    <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Allowed Tools</span>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">{meta.tools_allowed}</p>
                  </div>
                )}

                {meta.device_requirement && (
                  <div className="ev-tile p-4">
                    <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Device Requirement</span>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">{meta.device_requirement}</p>
                  </div>
                )}

                {meta.materials_provided && (
                  <div className="ev-tile p-4 sm:col-span-2">
                    <span className={`${FONT.pixel} text-[9px] uppercase tracking-[0.2em] text-[#FF8AC8]`}>Materials Provided by Fest</span>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-white/90">{meta.materials_provided}</p>
                  </div>
                )}
              </div>
            </Panel>

            {/* Coordinators */}
            <Panel id="ev-contacts" delay={13}>
              <SectionHead
                icon={<Users className="h-5 w-5" />}
                title="Student Coordinators & Support"
                sub="Contact organizers for queries and assistance"
              />

              {coordinatorsList.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {coordinatorsList.map((coord, idx) => (
                    <div key={idx} className="ev-tile p-4 text-sm">
                      <p className={`${FONT.display} text-base text-white`}>{coord.name}</p>
                      {coord.role && (
                        <p className={`${FONT.pixel} mt-1 text-[9px] uppercase tracking-[0.18em] text-[#FFD27A]`}>
                          {coord.role}
                        </p>
                      )}
                      {coord.phone && (
                        <a
                          href={`tel:${coord.phone}`}
                          className="mt-3 flex min-h-9 items-center text-[13px] text-white/80 transition hover:text-[#FF8AC8]"
                        >
                          {coord.phone}
                        </a>
                      )}
                      {coord.email && (
                        <a
                          href={`mailto:${coord.email}`}
                          className="flex min-h-9 items-center break-all text-[13px] text-white/80 transition hover:text-[#FF8AC8]"
                        >
                          {coord.email}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ev-tile mt-6 p-4 text-[13px] leading-6 text-white/75">
                  <p className={`${FONT.display} text-sm text-white`}>
                    {event.organizer || meta.organizer || "TechXetra 2026 Core Organizing Committee"}
                  </p>
                  <p className="mt-1.5">
                    For queries or assistance, contact the festival desk at {event.venue || "the festival grounds"} or reach out to our team at{" "}
                    <a href="mailto:techxetra.soe@gmail.com" className="text-[#FF8AC8] underline underline-offset-4">
                      techxetra.soe@gmail.com
                    </a>
                    .
                  </p>
                </div>
              )}

              {meta.submitted_by && (
                <p className="mt-4 text-[11px] text-white/60">Submitted by: {meta.submitted_by}</p>
              )}
            </Panel>

            {/* Registration guide */}
            <Panel id="registration-guide" delay={14}>
              <SectionHead
                gold
                icon={<BookOpen className="h-5 w-5" />}
                title="How to register for this event"
                sub="Follow these steps. The exact next step depends on whether this is a solo or team event and whether a fee applies."
              />

              <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                {GUIDE_STEPS.map((step) => (
                  <li key={step.title} className="ev-tile flex gap-3 p-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FF8AC8]/30 bg-[#FF8AC8]/10 text-[#FF8AC8]">
                      <Star className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <h3 className={`${FONT.display} text-sm leading-snug text-white`}>{step.title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-white/70">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={isTeamEvent ? handleStartTeamRegistration : handleStartSoloRegistration}
                  className={`${BTN_PRIMARY} cursor-pointer sm:!w-auto`}
                >
                  {isTeamEvent ? "Create a team" : "Register for this event"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link href="/dashboard" className={`${BTN_SECONDARY} sm:!w-auto`}>
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Panel>
          </div>
        </div>

        {/* Create Team Modal */}
        {showTeamModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
            data-lenis-prevent="true"
            role="dialog"
            aria-modal="true"
            aria-label={`Create team for ${event.title}`}
          >
            <div className="ev-card ev-rise w-full max-w-md p-6 shadow-2xl">
              <Eyebrow>New team</Eyebrow>
              <h3 className={`${FONT.display} mt-3 text-xl leading-snug text-white`}>
                Create Team for {event.title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-white/70">
                You will be assigned as the Team Leader. You can invite {event.min_team_size - 1} to{" "}
                {event.max_team_size - 1} additional members.
              </p>

              {teamError && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                  {teamError}
                </div>
              )}

              <form onSubmit={handleCreateTeamSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/85">
                    Team Name <span className="text-[#FF8AC8]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. CyberKnights"
                    minLength={2}
                    maxLength={50}
                    className="min-h-12 w-full rounded-xl border border-[rgba(190,214,255,0.18)] bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/55 focus:border-[#FF8AC8] focus:ring-2 focus:ring-[#FF8AC8]/25"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTeamModal(false)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 px-5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam}
                    className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#FFB3DE] to-[#FF6DB4] px-6 text-xs font-semibold text-[#1a0612] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${FONT.display}`}
                  >
                    {creatingTeam ? "Creating..." : "Confirm & Continue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dynamic Questionnaire Modal */}
        {event && (
          <DynamicQuestionnaireModal
            isOpen={showQuestionnaireModal}
            onClose={() => setShowQuestionnaireModal(false)}
            eventTitle={event.title}
            formSchema={parsedSchema}
            onSubmit={handleQuestionnaireSubmit}
            isSubmitting={submittingRegistration}
            externalError={registrationModalError}
            submitLabel={
              registrationMode === "team"
                ? "Continue to Team Creation"
                : "Continue to Checkout"
            }
          />
        )}
      </div>
    </Shell>
  );
}