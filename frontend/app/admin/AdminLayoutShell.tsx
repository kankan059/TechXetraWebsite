"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080B10] text-[#E8EDF4]">
      <AdminSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="min-h-screen lg:pl-64">
        <AdminTopbar onMenuClick={() => setMenuOpen(true)} />

        <main className="min-h-[calc(100vh-5rem)] px-4 py-7 sm:px-6 sm:py-9 lg:px-9">
          {children}
        </main>
      </div>
    </div>
  );
}
