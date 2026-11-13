import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Recreational Events | TechXetra 2026",
  description: "Explore recreational events and register for TechXetra 2026.",
};

export default function RecreationalEventsPage() {
  return <TechnicalEvents categoryId="recreational" />;
}
