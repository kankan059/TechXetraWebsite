"use client";

import { useState } from "react";
import Events from "@/components/sections/events/Events";
import EventsDirectory from "@/components/sections/events/EventsDirectory";

export default function EventsPage() {
  const [activeView, setActiveView] = useState<"events" | "directory">(
    "events"
  );

  const switchView = (view: "events" | "directory") => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen">
      {activeView === "events" ? (
        <>
          <Events />

          <div className="flex justify-center px-4 pb-16 pt-6">
            <button
              onClick={() => switchView("directory")}
              className="group flex cursor-pointer items-center gap-2 text-[11px] tracking-wider text-white/45 transition-colors duration-300 hover:text-[#55DFFF]"
            >
              <span>Explore Event Directory</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>
        </>
      ) : (
        <>
          <EventsDirectory />

          <div className="flex justify-center px-4 pb-16 pt-6">
            <button
              onClick={() => switchView("events")}
              className="group flex cursor-pointer items-center gap-2 text-[11px] tracking-wider text-white/45 transition-colors duration-300 hover:text-[#55DFFF]"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-1">
                ←
              </span>
              <span>Back to Events</span>
            </button>
          </div>
        </>
      )}
    </main>
  );
}