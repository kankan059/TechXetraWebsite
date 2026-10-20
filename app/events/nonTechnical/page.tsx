import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Non-Technical Events | TechXetra 2026",
  description: "Explore cultural and non-technical events for TechXetra 2026.",
};

export default function NonTechnicalEventsPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto text-white">
      <h1 className="text-4xl font-bold tracking-tight mb-4">Non-Technical Events</h1>
      <p className="text-zinc-400">Cultural and non-technical events schedule will be revealed soon.</p>
    </main>
  );
}
