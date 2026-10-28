import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AdminLayoutShell from "./AdminLayoutShell";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuperAdminSession(value: unknown): boolean {
  if (
    !isRecord(value) ||
    value.success !== true ||
    !isRecord(value.data) ||
    value.data.authenticated !== true ||
    !isRecord(value.data.user)
  ) {
    return false;
  }

  return value.data.user.role === "SUPER_ADMIN";
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  if (!cookie) {
    redirect("/login");
  }

  const backendBaseUrl = (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://techxetra-backend.onrender.com"
  )
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "")
    .replace(/\/api$/, "");

  const response = await fetch(
    `${backendBaseUrl}/api/v1/auth/session`,
    {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    }
  );

  if (response.status === 401 || response.status === 403) {
    redirect("/login");
  }

  if (!response.ok) {
    throw new Error(`Admin session check failed (${response.status})`);
  }

  const session: unknown = await response.json();

  if (!isSuperAdminSession(session)) {
    redirect("/login");
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
