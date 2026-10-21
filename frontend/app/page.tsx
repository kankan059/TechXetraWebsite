"use client";

import Link from "next/link";
import About from "@/components/sections/about/About";
import EventGlimpse from "@/components/sections/events/EventGlimpse";
import Hero from "@/components/sections/hero/Hero";
import {
  Ticket,
  Trophy,
  Users,
  QrCode,
  Shield,
  ArrowRight,
  Compass,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-[#07090e] text-white">
      <main>
        <Hero />
        <About />
        <EventGlimpse />

        {/* Feature Launchpad & Quick Portals */}
        <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-[#07090e] to-[#040609] px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl space-y-12">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                TECHXETRA 2026 PLATFORM
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Festival Portals & Competitions
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
                Explore passes, team rosters, public leaderboards, volunteer scanning, and admin operations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Gate Pass & Checkout */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Festival Gate Pass</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    15-minute reservation hold, manual UPI payment with QR code, and instant pass issuance.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <Link
                    href="/checkout"
                    className="inline-flex w-full items-center justify-between rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200"
                  >
                    <span>Get Festival Pass</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Dynamic Events Directory */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/10 text-purple-300">
                    <Compass className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Events & Competitions</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    Live events catalog with category pills, Day 1–3 schedule filters, and solo/team requirements.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <Link
                    href="/events?view=directory"
                    className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <span>Browse All Events</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Teams & Squads */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Teams & Squads</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    Form teams, invite teammates by email, manage rosters, and respond to invitations.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <Link
                    href="/teams"
                    className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <span>Manage My Teams</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Tournament Leaderboards */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Public Leaderboards</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    Real-time tournament scoreboards, round points, and rankings for esports events.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <Link
                    href="/leaderboards"
                    className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <span>View Scoreboards</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Staff Scanner & Scoring */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Staff Scanner & Console</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    Gate QR scanning, physical student ID check toggle, and referee round-by-round scoring.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4">
                  <Link
                    href="/staff"
                    className="inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    <span>Open Staff Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Super Admin & QA Test Suite */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition duration-200 hover:border-cyan-300/40 hover:bg-white/[0.04]">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Admin & Testing Suite</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    UPI verification review queue, BI reports, user management, and full route test directory.
                  </p>
                </div>
                <div className="mt-6 border-t border-white/5 pt-4 flex gap-2">
                  <Link
                    href="/admin"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Admin Portal
                  </Link>
                  <Link
                    href="/test"
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-300 px-3 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200"
                  >
                    Test Suite →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
