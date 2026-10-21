import TeamsDirectoryPage from "@/app/teams/page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Teams | TechXetra 2026",
  description: "View and manage your competition teams and rosters.",
};

export default function MyTeamsPage() {
  return <TeamsDirectoryPage />;
}
