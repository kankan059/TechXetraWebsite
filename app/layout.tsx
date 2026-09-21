import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SmoothScroll from "@/components/layouts/SmoothScroll";
import "./globals.css";
import BackGround from "@/components/animations/BackGround";
import Navbar from "@/components/layouts/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechXetra 2026",
  description: "TechXetra",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        
        <BackGround />
        <SmoothScroll />
        <Navbar/>
        {children}
      </body>
    </html>
  );
}
