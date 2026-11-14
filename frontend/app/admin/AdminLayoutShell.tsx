"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#060a16] text-white">
      <AdminSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="min-h-screen lg:pl-64">
        <AdminTopbar
          menuOpen={menuOpen}
          onMenuClick={() => setMenuOpen((isOpen) => !isOpen)}
        />

        <main className="min-h-[calc(100vh-4.5rem)] bg-[radial-gradient(ellipse_at_top_right,rgba(49,106,163,0.10),transparent_42%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
