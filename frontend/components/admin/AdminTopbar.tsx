"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { participantApi } from "@/services/participant-api";
import type { UserProfile } from "@/types/api";

type AdminTopbarProps = {
  onMenuClick: () => void;
  menuOpen: boolean;
};

const pageTitles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/payments": "Payments",
  "/admin/registrations": "Registrations",
  "/admin/passes": "Passes",
  "/admin/tickets": "Tickets & QR",
  "/admin/events": "Competitions",
  "/admin/compititions": "Competitions",
  "/admin/attendance": "Attendance",
  "/admin/users": "Users & Staff",
  "/admin/user-details": "User details",
  "/admin/gate-staff": "Gate staff",
  "/admin/reports": "Diagnostics",
  "/admin/settings": "Settings & days",
  "/admin/audit-logs": "Audit logs",
};

function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];

  const matchingPath = Object.keys(pageTitles)
    .filter((path) => path !== "/admin" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matchingPath ? pageTitles[matchingPath] : "Administration";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AdminTopbar({
  onMenuClick,
  menuOpen,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const adminHistory = useRef<string[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accountUnavailable, setAccountUnavailable] = useState(false);

  useEffect(() => {
    const history = adminHistory.current;
    if (history[history.length - 1] !== pathname) {
      history.push(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    participantApi.auth
      .session()
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated && session.user) {
          setUser(session.user);
        } else {
          setAccountUnavailable(true);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to load admin account:", error);
        setAccountUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const title = getPageTitle(pathname);
  const accountName = user?.name || (accountUnavailable ? "Account unavailable" : "Loading account");
  const role = user?.role
    ? user.role.toLowerCase().replaceAll("_", " ")
    : accountUnavailable
      ? "Profile could not be loaded"
      : "Loading profile";

  const goBack = () => {
    const history = adminHistory.current;
    if (history.length > 1) {
      history.pop();
      const previousAdminPath = history[history.length - 1];
      if (previousAdminPath?.startsWith("/admin")) {
        router.push(previousAdminPath);
        return;
      }
    }
    router.push("/admin");
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#BED6FF]/[0.12] bg-[#060a16]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-9">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-controls="admin-navigation"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#BED6FF]/[0.16] text-white/70 transition hover:border-[#55DFFF]/40 hover:bg-[#55DFFF]/[0.06] hover:text-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] lg:hidden"
        >
          {menuOpen ? (
            <X size={19} aria-hidden="true" />
          ) : (
            <Menu size={19} aria-hidden="true" />
          )}
        </button>

        {pathname !== "/admin" && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back to the previous admin page"
            title="Back to previous admin page"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] sm:px-2.5 sm:text-sm"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back</span>
          </button>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/50">
            Admin workspace
            <span className="px-2 text-white/25">/</span>
            <span className="text-white/90">{title}</span>
          </p>
          <p className="mt-1 hidden truncate text-xs text-white/35 sm:block">
            TechXetra event management
          </p>
        </div>
      </div>

      <div
        className="flex min-w-0 items-center gap-2.5 sm:gap-3"
        title={user?.email || role}
      >
        <div className="hidden min-w-0 text-right sm:block">
          <p className="max-w-40 truncate text-sm font-medium text-white/85">
            {accountName}
          </p>
          <p className="mt-0.5 max-w-40 truncate text-[11px] capitalize text-white/40">
            {role}
          </p>
        </div>
        <div
          aria-label={user ? `${user.name} account` : accountName}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#55DFFF]/25 bg-[#55DFFF]/[0.09] text-xs font-semibold text-[#8BEAFF]"
        >
          {user ? (
            getInitials(user.name) || <UserRound size={16} aria-hidden="true" />
          ) : (
            <UserRound size={16} aria-hidden="true" />
          )}
        </div>
        <span className="sr-only sm:hidden">{accountName}</span>
      </div>
    </header>
  );
}
