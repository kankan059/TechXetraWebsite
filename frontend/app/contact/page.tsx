import ContactPage from "@/components/sections/contact/ContactPage";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Gallery | TechXetra 2026",
  description: "Photos and moments from TechXetra.",
};
const page = () => {
  return (
    <ContactPage/>
  )
}

export default page