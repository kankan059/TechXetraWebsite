"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ClipboardList,
  CreditCard,
  FileClock,
  LayoutDashboard,
  QrCode,
  Settings,
  Ticket,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Registrations", href: "/admin/registrations", icon: ClipboardList },
  { label: "Passes", href: "/admin/passes", icon: Ticket },
  { label: "Tickets & QR", href: "/admin/tickets", icon: QrCode },
  { label: "Competitions", href: "/admin/events", icon: Trophy },
  { label: "Attendance", href: "/admin/attendance", icon: Activity },
  { label: "Users & Staff", href: "/admin/users", icon: UsersRound },
  { label: "User Details", href: "/admin/user-details", icon: UserRound },
  { label: "Gate Staff", href: "/admin/gate-staff", icon: UsersRound },
  { label: "Diagnostics", href: "/admin/reports", icon: Activity },
  { label: "Settings & Days", href: "/admin/settings", icon: Settings },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: FileClock },
];

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#020611]/75 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      <aside
        id="admin-navigation"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[#BED6FF]/[0.12] bg-gradient-to-b from-[#0e1630] to-[#060a16] transition-transform duration-200 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#BED6FF]/[0.12] px-5">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-lg text-white outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#55DFFF]/25 bg-[#55DFFF]/[0.09] text-xs font-semibold tracking-wide text-[#8BEAFF]">
              TX
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                TechXetra
              </span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                Admin workspace
              </span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Event management
          </p>

          <div className="space-y-1">
            {navigation.map(({ label, href, icon: Icon }) => {
              const active =
                href === "/admin"
                  ? pathname === "/admin"
                  : pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] ${
                    active
                      ? "bg-[#55DFFF]/[0.11] font-medium text-[#8BEAFF]"
                      : "text-white/60 hover:bg-white/[0.045] hover:text-white/90"
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.7}
                    aria-hidden="true"
                    className={
                      active
                        ? "text-[#55DFFF]"
                        : "text-white/40 transition-colors group-hover:text-white/75"
                    }
                  />
                  <span>{label}</span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-[#55DFFF]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[#BED6FF]/[0.12] px-5 py-4">
          <p className="text-xs font-medium text-white/65">TechXetra 2026</p>
          <p className="mt-1 text-[11px] text-white/35">
            Event operations
          </p>
        </div>
      </aside>
    </>
  );
}
