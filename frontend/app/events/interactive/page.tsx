import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Interactive Events | TechXetra 2026",
  description: "Explore interactive events and register for TechXetra 2026.",
};

export default function InteractiveEventsPage() {
  return <TechnicalEvents categoryId="interactive" />;
}
