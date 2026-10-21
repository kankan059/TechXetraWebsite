import EventsDirectory from "@/components/sections/events/EventsDirectory";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events Directory | TechXetra 2026",
  description: "Browse, filter and register for events at TechXetra 2026.",
};

export default function EventsDirectoryPage() {
  return (
    <main className="min-h-screen bg-[#07090e] text-white">
      <EventsDirectory />
    </main>
  );
}
