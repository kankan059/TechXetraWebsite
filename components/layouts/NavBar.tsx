"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/constants/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <div className="mx-auto flex h-20 max-w-1400px items-center justify-between px-6 lg:px-10">
        <Link href="/" className="text-xl font-semibold tracking-[0.2em] text-white">
          TECHXETRA
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-xs font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${
                  active ? "text-cyan-300" : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}

                <span
                  className={`absolute -bottom-2 left-0 h-px bg-cyan-300 transition-all duration-300 ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <Link
          href="/register"
          className="border border-cyan-300/60 px-5 py-2 text-xs uppercase tracking-[0.18em] text-cyan-200 transition-all duration-300 hover:bg-cyan-300 hover:text-black"
        >
          Register
        </Link>
      </div>
    </header>
  );
}