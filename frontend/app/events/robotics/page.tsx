import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Robotics Events | TechXetra 2026",
  description: "Explore robotics events at TechXetra 2026.",
};

export default function RoboticsEventsPage() {
  return <TechnicalEvents categoryId="robotics" />;
}
