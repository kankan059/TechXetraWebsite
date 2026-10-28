"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const BackGround = dynamic(
  () => import("@/components/animations/BackGround")
);
const GlobalEffect = dynamic(
  () => import("@/components/effects/GlobalEffect")
);
const Navbar = dynamic(
  () => import("@/components/layouts/navbar/NavBar")
);
const SmoothScroll = dynamic(
  () => import("@/components/layouts/SmoothScroll")
);
const Footer = dynamic(
  () => import("@/components/layouts/Footer")
);

export default function RouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAdmin) {
    return <>{children}</>;
  }

  if (isAuthPage) {
    return (
      <>
        <Navbar />
        <div className="relative z-10 flex-1">{children}</div>
      </>
    );
  }

  return (
    <>
      <BackGround />
      <GlobalEffect />
      <Navbar />
      <SmoothScroll />
      <div className="relative z-10 flex-1">{children}</div>
      <Footer />
    </>
  );
}