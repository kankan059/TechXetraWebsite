"use client";

import { usePathname } from "next/navigation";
import BackGround from "@/components/animations/BackGround";
import GlobalEffect from "@/components/effects/GlobalEffect";
import Navbar from "@/components/layouts/navbar/NavBar";
import SmoothScroll from "@/components/layouts/SmoothScroll";
import Footer from "@/components/layouts/Footer";

export default function RouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <GlobalEffect />
      <BackGround />
      <Navbar />
      <SmoothScroll />
      {children}
      <Footer />
    </>
  );
}