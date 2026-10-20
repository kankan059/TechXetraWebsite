import SchedulePage from "@/components/sections/schedule/Schedulepage";
import type { Metadata } from "next"
export const metadata: Metadata = {
  title: "schedule | TechXetra 2026",
  description: "timing of the TechXetra.",
};


const page = () => {
  return (
    <SchedulePage/>
  )
}

export default page