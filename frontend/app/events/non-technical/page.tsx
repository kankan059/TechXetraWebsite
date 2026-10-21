import NonTechnicalEvents from "@/components/sections/events/NonTechnicalEvent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Non-Technical Events | TechXetra 2026",
  description:
    "Explore creative contests, performances and other non-technical events at TechXetra 2026.",
};


const page = () => {
  return (
    <NonTechnicalEvents/>
  )
}

export default page