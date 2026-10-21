import DashboardPage from "@/app/dashboard/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile & Passes | TechXetra 2026",
  description: "View your TechXetra profile, passes, and registered teams.",
};

export default function ProfilePage() {
  return <DashboardPage />;
}
