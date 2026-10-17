import type { Metadata } from "next";
import TechnicalEvents from "@/components/sections/events/TechnicalEvent";

export const metadata: Metadata = {
  title: "Technical Events | TechXetra 2026",
  description: "Explore technical events, read participation details and register for TechXetra 2026.",
};


const page = () => {
  return (
    <TechnicalEvents/>
  )
}

export default page