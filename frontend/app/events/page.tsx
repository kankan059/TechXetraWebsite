"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Events from "@/components/sections/events/Events";
import EventsDirectory from "@/components/sections/events/EventsDirectory";
function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDirectory = searchParams.get("view") === "directory";

  return (
    <div className="relative min-h-screen">
      {/* Floating View Switcher */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-white/20 bg-[#0d131f]/80 p-1.5 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.push("/events")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              !isDirectory
                ? "bg-cyan-300 text-black shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            Featured Tracks
          </button>

          <button
            type="button"
            onClick={() => router.push("/events?view=directory")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
              isDirectory
                ? "bg-cyan-300 text-black shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            All Events Directory
          </button>
        </div>
      </div>

      {isDirectory ? (
        <EventsDirectory />
      ) : (
        <div className="relative">
          <Events />
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e]" />}>
      <EventsContent />
    </Suspense>
  );
}
