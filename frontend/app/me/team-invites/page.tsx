"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar,
  Loader2,
  X,
  Inbox,
  Users,
  Sparkles,
} from "lucide-react";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";
import type { TeamMember } from "@/types/api";

type Invite = TeamMember & {
  team_name?: string;
  event_title?: string;
};

type ActionKind = "accept" | "decline";

/* ------------------------------------------------------------------ */
/* Pink space backdrop (stars + constellations, deterministic)         */
/* ------------------------------------------------------------------ */

function makeStars(count: number) {
  let seed = 20261112;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: Number((rnd() * 100).toFixed(2)),
    y: Number((rnd() * 100).toFixed(2)),
    r: Number((0.1 + rnd() * 0.28).toFixed(2)),
    g: i % 3,
  }));
}

const STARS = makeStars(90);

const CONSTELLATIONS: Array<{ path: string; pts: Array<[number, number]> }> = [
  {
    path: "M5 16 L13 10 L21 19 L30 9 L39 15 L46 8",
    pts: [[5, 16], [13, 10], [21, 19], [30, 9], [39, 15], [46, 8]],
  },
  {
    path: "M68 74 L76 64 L85 73 L93 58 M76 64 L80 50",
    pts: [[68, 74], [76, 64], [85, 73], [93, 58], [80, 50]],
  },
  {
    path: "M8 86 L18 79 L27 89 L39 81 L48 90",
    pts: [[8, 86], [18, 79], [27, 89], [39, 81], [48, 90]],
  },
  {
    path: "M72 14 L80 22 L90 12 L96 26",
    pts: [[72, 14], [80, 22], [90, 12], [96, 26]],
  },
];

const BACKDROP_CSS = `
.pk-tw-a{animation:pk-tw 3.4s ease-in-out infinite}
.pk-tw-b{animation:pk-tw 5s ease-in-out -1.8s infinite}
.pk-tw-c{opacity:.7}
@keyframes pk-tw{0%,100%{opacity:.2}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.pk-tw-a,.pk-tw-b{animation:none}}
`;

function PinkBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#14041f]"
    >
      <style dangerouslySetInnerHTML={{ __html: BACKDROP_CSS }} />

      {/* pink nebula */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 50% at 85% 0%, rgba(255,70,170,0.30) 0%, transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(236,72,153,0.26) 0%, transparent 70%), radial-gradient(50% 40% at 50% 45%, rgba(217,70,239,0.16) 0%, transparent 72%), linear-gradient(180deg, #1c0630 0%, #12031c 55%, #0d0215 100%)",
        }}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        {[0, 1, 2].map((g) => (
          <g
            key={g}
            className={g === 0 ? "pk-tw-a" : g === 1 ? "pk-tw-b" : "pk-tw-c"}
            fill="#ffe3f3"
          >
            {STARS.filter((s) => s.g === g).map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} />
            ))}
          </g>
        ))}

        {CONSTELLATIONS.map((c, i) => (
          <g key={i}>
            <path
              d={c.path}
              stroke="#ff9ad5"
              strokeOpacity="0.4"
              strokeWidth="0.14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {c.pts.map(([cx, cy], j) => (
              <g key={j}>
                <circle cx={cx} cy={cy} r="1" fill="#ff5fb8" fillOpacity="0.2" />
                <circle cx={cx} cy={cy} r="0.3" fill="#fff0f8" fillOpacity="0.95" />
              </g>
            ))}
          </g>
        ))}
      </svg>

      {/* soft vignette keeps text readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(8,1,14,0.55) 100%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value: string) {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  return day < 30 ? `${day} day${day > 1 ? "s" : ""} ago` : "";
}

const STEPS: Array<[string, string, string]> = [
  ["1", "Review", "Check which team and event invited you."],
  ["2", "Accept", "Join the roster and compete together."],
  ["3", "Or decline", "No pressure, the captain gets notified."],
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TeamInvitesPage() {
  const router = useRouter();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ id: string; kind: ActionKind } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchInvites = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);

        const data = await participantApi.teams.myInvites();
        setInvites((data || []) as Invite[]);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/me/team-invites");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load your invitations. Try refreshing."
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(t);
  }, [success]);

  const runAction = useCallback(
    async (inviteId: string, kind: ActionKind) => {
      setBusy({ id: inviteId, kind });
      setError(null);
      setSuccess(null);
      setConfirmId(null);

      try {
        if (kind === "accept") {
          await participantApi.teams.acceptInvite(inviteId);
          setSuccess("Invitation accepted! You are now part of the team roster.");
        } else {
          await participantApi.teams.declineInvite(inviteId);
          setSuccess("Invitation declined.");
        }
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
        void fetchInvites(true);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : kind === "accept"
            ? "Could not accept the invitation."
            : "Could not decline the invitation."
        );
      } finally {
        setBusy(null);
      }
    },
    [fetchInvites]
  );

  const count = invites.length;

  const subtitle = useMemo(() => {
    if (loading) return "Checking your inbox...";
    if (count === 0) return "You're all caught up.";
    return `${count} pending invitation${count > 1 ? "s" : ""} waiting for your reply.`;
  }, [loading, count]);

  return (
    <>
      <PinkBackdrop />

      <main className="relative z-10 min-h-screen px-4 pb-24 pt-28 text-white sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-[1120px] space-y-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/60 transition-colors hover:text-pink-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          {/* Header */}
          <div className="flex flex-col justify-between gap-5 border-b border-pink-200/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-300">
                <Sparkles className="h-3 w-3" />
                Team management
              </span>
              <h1 className="mt-4 text-3xl tracking-tight text-white font-roboto sm:text-5xl">
                Team invitations
              </h1>
              <p
                aria-live="polite"
                className="mt-3 max-w-[56ch] text-sm leading-relaxed text-pink-100/60"
              >
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchInvites()}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-pink-200/15 bg-white/[0.05] px-4 py-2 text-xs text-pink-50 transition-colors hover:border-pink-300/50 hover:text-pink-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* How it works */}
          {!loading && count > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {STEPS.map(([n, t, d]) => (
                <div
                  key={n}
                  className="flex items-start gap-3 rounded-2xl border border-pink-200/10 bg-white/[0.04] p-4 backdrop-blur-sm"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-pink-400/20 text-[11px] font-bold text-pink-200">
                    {n}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{t}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-pink-100/55">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
                className="text-red-300/70 transition-colors hover:text-red-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span className="flex-1">{success}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setSuccess(null)}
                className="text-emerald-200/70 transition-colors hover:text-emerald-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Content */}
          {loading && count === 0 ? (
            <div
              aria-busy="true"
              aria-label="Loading invitations"
              className="grid gap-5 md:grid-cols-2"
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-3xl border border-pink-200/10 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : count === 0 ? (
            <div className="rounded-3xl border border-dashed border-pink-200/20 bg-white/[0.02] py-20 text-center backdrop-blur-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-400/30 bg-pink-400/10">
                <Inbox className="h-7 w-7 text-pink-300" />
              </div>
              <h3 className="text-lg text-white font-roboto">No pending invitations</h3>
              <p className="mx-auto mt-1 max-w-[44ch] text-xs leading-5 text-pink-100/55">
                When a team captain invites you with your email address, the invitation will
                show up here.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-2.5 text-xs font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,70,180,0.8)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {invites.map((invite) => {
                const isBusy = busy?.id === invite.id;
                const confirming = confirmId === invite.id;
                const ago = timeAgo(invite.invited_at);
                const teamLabel = invite.team_name || "this team";
                const initial = (invite.team_name || "T").charAt(0).toUpperCase();

                return (
                  <li
                    key={invite.id}
                    className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-pink-200/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-pink-300/45 hover:shadow-[0_24px_60px_-30px_rgba(255,80,180,0.55)] sm:p-6"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-pink-500/20 blur-3xl"
                    />

                    <div className="relative flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-pink-400/35 bg-gradient-to-br from-pink-500/30 to-fuchsia-600/20 text-lg font-bold text-pink-100">
                        {initial}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pink-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pink-400" />
                            Pending
                          </span>
                          {ago && <span className="text-[11px] text-pink-100/40">{ago}</span>}
                        </div>

                        <h2 className="break-words text-base font-semibold leading-snug text-white font-roboto sm:text-lg">
                          {invite.team_name
                            ? `Join ${invite.team_name}`
                            : "You've been invited to join a team"}
                        </h2>

                        {invite.event_title && (
                          <p className="text-xs font-medium text-pink-300">
                            Event: {invite.event_title}
                          </p>
                        )}
                      </div>
                    </div>

                    <dl className="relative grid gap-2.5 rounded-2xl border border-pink-200/10 bg-black/30 p-3.5 text-xs text-pink-50/65">
                      <div className="flex items-center gap-2.5 break-all">
                        <Mail className="h-3.5 w-3.5 flex-none text-pink-300/80" />
                        <dt className="sr-only">Invited email</dt>
                        <dd>{invite.invited_email}</dd>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-3.5 w-3.5 flex-none text-pink-300/80" />
                        <dt className="sr-only">Invited on</dt>
                        <dd>Invited on {formatDate(invite.invited_at)}</dd>
                      </div>
                      <div className="flex items-center gap-2.5 break-all text-pink-100/40">
                        <Users className="h-3.5 w-3.5 flex-none text-pink-300/55" />
                        <dt className="sr-only">Team ID</dt>
                        <dd>Team ID: {invite.team_id}</dd>
                      </div>
                    </dl>

                    {/* Actions */}
                    <div className="relative mt-auto">
                      {confirming ? (
                        <div className="flex flex-col gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3.5">
                          <p className="text-xs text-red-100">
                            Decline the invitation to {teamLabel}?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void runAction(invite.id, "decline")}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-red-500/85 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
                            >
                              {isBusy && busy?.kind === "decline" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Yes, decline
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void runAction(invite.id, "accept")}
                            className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_30px_-12px_rgba(255,70,180,0.8)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300 disabled:opacity-60"
                          >
                            {isBusy && busy?.kind === "accept" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Accept invite
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmId(invite.id)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-pink-200/15 bg-white/[0.05] px-5 py-3 text-xs font-medium text-pink-50/80 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-300 disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}