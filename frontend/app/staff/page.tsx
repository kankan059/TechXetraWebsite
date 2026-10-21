"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Trophy,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Users,
  CheckCircle,
} from "lucide-react";
import type { UserProfile, EventItem } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function StaffPortalHubPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [esportsEvents, setEsportsEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStaffData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Check user profile & role
        const meRes = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
        if (meRes.status === 401) {
          router.push("/login?redirect=/staff");
          return;
        }
        const meData = await meRes.json();
        if (!meData.success) {
          throw new Error("Unable to authenticate staff session");
        }

        const role = meData.data.role;
        if (role !== "VOLUNTEER" && role !== "LEAD" && role !== "SUPER_ADMIN") {
          router.push("/dashboard");
          return;
        }

        setUser(meData.data);

        // 2. Fetch esports tournament events that staff can score
        const evtRes = await fetch(`${API_BASE}/api/events?category=E_SPORTS&limit=20`, {
          credentials: "include",
        });
        const evtData = await evtRes.json();
        if (evtData.success) {
          setEsportsEvents(evtData.data?.events || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading staff portal");
      } finally {
        setLoading(false);
      }
    }

    void loadStaffData();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Staff Access Restricted</h1>
          <p className="mt-2 text-sm text-white/50">{error || "Volunteer, Lead, or Super Admin session required."}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                STAFF OPERATIONS PORTAL
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-white/70">
                {user.role}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Volunteer & Referee Console
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Logged in as {user.name} ({user.email}). Select an operational tool below.
            </p>
          </div>

          {user.role === "SUPER_ADMIN" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-400 hover:text-black"
            >
              Super Admin Dashboard →
            </Link>
          )}
        </div>

        {/* Operational Tool Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* QR Scanner Tool */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 shadow-xl">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">Digital Ticket Scanner</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                Scan attendee digital passes at Festival Main Gates (multi-entry) or specific event arenas (single-use admission).
                Includes mandatory physical student ID card verification check.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <Link
                href="/staff/scan"
                className="inline-flex w-full items-center justify-between rounded-xl bg-cyan-300 px-5 py-3 text-xs font-bold text-black transition hover:bg-cyan-200"
              >
                <span>Launch QR Scanner Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Tournament Scoring Tool */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 shadow-xl">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                <Trophy className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">E-Sports Scoring & Referees</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                Enter round-by-round kill points and placement scores for BGMI, Valorant, and other esports tournaments.
                Protected by optimistic concurrency and immutable audit history.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              {esportsEvents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Active Tournaments to Score:
                  </p>
                  <div className="space-y-1.5">
                    {esportsEvents.map((e) => (
                      <Link
                        key={e.id}
                        href={`/staff/events/${e.id}/scores`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white transition hover:bg-white/10 hover:text-cyan-300"
                      >
                        <span className="truncate">{e.title}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  href="/events?view=directory"
                  className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <span>Browse Events Directory</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
