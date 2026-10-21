"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Overview", href: "/admin" },
  { label: "Registrations", href: "/admin/registrations" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Passes", href: "/admin/passes" },
  { label: "Attendance", href: "/admin/attendance" },
  { label: "Competitions", href: "/admin/compititions" },
  { label: "Users & Staff", href: "/admin/users" },
];

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function AdminSidebar({
  open,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.08] bg-[#0C1017] transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center border-b border-white/[0.08] px-6">
          <Link
            href="/admin"
            onClick={onClose}
            className="text-xl font-bold tracking-tight text-[#E8EDF4]"
          >
            TechXetra
            <span className="ml-2 text-xs font-normal tracking-widest text-[#55DFFF]">
              ADMIN
            </span>
          </Link>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 space-y-1 p-4">
          <p className="mb-4 px-3 pt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Event management
          </p>

          {navigation.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center rounded-md border px-3 py-3 text-sm transition-colors ${
                  active
                    ? "border-[#55DFFF]/20 bg-[#55DFFF]/[0.08] text-[#55DFFF]"
                    : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <span className="mr-3 h-1.5 w-1.5 rounded-full bg-[#55DFFF]" />
                )}
                <span className={active ? "" : "pl-[21px]"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.08] p-5">
          <p className="text-xs text-slate-500">TechXetra 2026</p>
          <p className="mt-1 text-xs text-slate-600">
            Admin interface · UI preview
          </p>
        </div>
      </aside>
    </>
  );
}