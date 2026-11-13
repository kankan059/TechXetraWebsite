import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Esports | TechXetra 2026",
  description: "Explore esports events and register for TechXetra 2026.",
};

export default function EsportsPage() {
  return <TechnicalEvents categoryId="esports" />;
}