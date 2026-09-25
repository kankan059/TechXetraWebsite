import type { Metadata } from "next";
import localFont from "next/font/local";
import SmoothScroll from "@/components/layouts/SmoothScroll";
import "./globals.css";
import BackGround from "@/components/animations/BackGround";
import Navbar from "@/components/layouts/NavBar";
import LogoTech from "@/components/animations/LogoTech";
import GlobalEffect from "@/components/effects/GlobalEffect";

const ortigel = localFont({
  src: "../public/fonts/Ortigel-Demo-Regular.otf",
  variable: "--font-ortigel",
  display: "swap",
});

const gothamBook = localFont({
  src: "../public/fonts/Gotham-Book.woff2",
  variable: "--font-gotham-book",
  display: "swap",
});

const gothamBold = localFont({
  src: "../public/fonts/Gotham-Bold.ttf",
  variable: "--font-gotham-bold",
  display: "swap",
});

const multiTypePixel = localFont({
  src: "../public/fonts/MultiTypePixel-RegularSC.otf",
  variable: "--font-pixel",
  display: "swap",
});


export const metadata: Metadata = {
  title: "TechXetra 2026",
  description: "TechXetra",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`
          ${ortigel.variable}
          ${gothamBook.variable}
          ${gothamBold.variable}
          ${multiTypePixel.variable}
          bg-[#090909]
          antialiased
        `}
    >
      <body className="min-h-full flex flex-col">
        <GlobalEffect />

        <BackGround />
        <Navbar />
       
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}





