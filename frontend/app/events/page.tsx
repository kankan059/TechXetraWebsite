"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Events from "@/components/sections/events/Events";
import EventsDirectory from "@/components/sections/events/EventsDirectory";

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e]" />}>
      <EventsDirectory />
    </Suspense>
  );
}
