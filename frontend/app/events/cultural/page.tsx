import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Cultural Events | TechXetra 2026",
  description: "Explore cultural events and register for TechXetra 2026.",
};

export default function CulturalEventsPage() {
  return <TechnicalEvents categoryId="cultural" />;
}
