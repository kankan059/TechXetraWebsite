import ContactPage from "@/components/sections/contact/ContactPage";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "contact | TechXetra 2026",
  description: "contacts TechXetra.",
};
const page = () => {
  return (
    <ContactPage/>
  )
}

export default page