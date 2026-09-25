"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/constants/navigation";

function NavIcon({ href }: { href: string }) {
  const common = "h-[18px] w-[18px]";

  if (href === "/") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M3 10.8 12 3l9 7.8V21h-6v-6H9v6H3V10.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (href.includes("events")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M5 4h14v16H5V4Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (href.includes("schedule")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4M4 9h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (href.includes("sponsors")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <path d="M12 3 15 9l6 .9-4.5 4.4 1.1 6.2L12 17.6l-5.6 2.9 1.1-6.2L3 9.9 9 9l3-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (href.includes("gallery")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="m5 18 5-5 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (href.includes("team")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common}>
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 15c3 0 5 1.5 5.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={common}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RegisterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <path d="M5 5h14v14H5V5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 12h6M12 9l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


const NavBar = () => {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop navbar */}
      <header className="fixed left-0 top-0 z-50 hidden w-full md:block">
        <div className="mx-auto flex h-20 max-w-1400px items-center justify-between px-6 lg:px-10">
          <Link href="/" className="text-xl font-semibold tracking-[0.2em] text-white">
            TECHXETRA
          </Link>

          <nav className="flex items-center gap-8">
            {navigation.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-xs font-medium uppercase tracking-[0.18em] transition-colors duration-300 ${active ? "text-cyan-300" : "text-white/70 hover:text-white"
                    }`}
                >
                  {item.label}

                  <span className={`absolute -bottom-2 left-0 h-px bg-cyan-300 transition-all duration-300 ${active ? "w-full" : "w-0"}`} />
                </Link>
              );
            })}
          </nav>

          <Link href="/register" className="border border-cyan-300/60 px-5 py-2 text-xs uppercase tracking-[0.18em] text-cyan-200 transition-all duration-300 hover:bg-cyan-300 hover:text-black">
            Register
          </Link>
        </div>
      </header>

      {/* Mobile bottom navbar */}
      <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-24px)] max-w-[430px] -translate-x-1/2 items-center justify-around rounded-[22px] border border-white/10 bg-black/65 px-2 py-2 shadow-[0_15px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl md:hidden">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`group relative flex h-11 min-w-11 flex-col items-center justify-center rounded-[14px] transition-all duration-300 ${active ? "bg-white/[0.07] text-cyan-300" : "text-white/45 hover:text-white"
                }`}
            >
              {active && <span className="absolute -top-[2px] left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />}

              <span className={`transition-all duration-300 ${active ? "-translate-y-[2px] scale-110" : "group-hover:-translate-y-[1px]"}`}>
                <NavIcon href={item.href} />
              </span>

              <span className={`absolute bottom-[3px] font-pixel text-[5px] uppercase tracking-[0.08em] transition-all duration-300 ${active ? "translate-y-0 opacity-60" : "translate-y-1 opacity-0"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <Link href="/register" aria-label="Register" className={`group relative flex h-11 min-w-11 items-center justify-center rounded-[14px] border transition-all duration-300 ${pathname === "/register" ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_20px_rgba(103,232,249,0.25)]" : "border-cyan-300/30 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-300 hover:text-black"}`}>
          <RegisterIcon />
        </Link>
      </nav>
    </>
  );
}

export default NavBar