"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  QrCode,
  Trophy,
} from "lucide-react";

interface StaffEventNavProps {
  eventId: string;
  currentTab: "overview" | "registrations" | "payments" | "settings";
  isLeadOrAdmin: boolean;
  isEsports?: boolean;
}

export default function StaffEventNav({
  eventId,
  currentTab,
  isLeadOrAdmin,
  isEsports = false,
}: StaffEventNavProps) {
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      href: `/staff/events/${eventId}`,
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: "registrations",
      label: "Attendee Roster",
      href: `/staff/events/${eventId}/registrations`,
      icon: Users,
      visible: true,
    },
    {
      id: "payments",
      label: "Payment Review",
      href: `/staff/events/${eventId}/payments`,
      icon: CreditCard,
      visible: isLeadOrAdmin,
    },
    {
      id: "settings",
      label: "Event Settings",
      href: `/staff/events/${eventId}/settings`,
      icon: Settings,
      visible: isLeadOrAdmin,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {tabs
          .filter((t) => t.visible)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="flex items-center gap-2">
        {isEsports && (
          <Link
            href={`/staff/events/${eventId}/scores`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Score Tournament</span>
          </Link>
        )}

        <Link
          href={`/staff/scan?event_id=${encodeURIComponent(eventId)}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>Launch Scanner</span>
        </Link>
      </div>
    </div>
  );
}
