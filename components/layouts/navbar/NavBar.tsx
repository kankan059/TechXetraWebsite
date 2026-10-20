"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { navigation, mainlogo } from "@/constants/navigation";
import GooeyNav from "@/components/layouts/navbar/GooeyNav";

const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = navigation.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.href === pathname)
  );

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`));

  const handleNavigation = (
    _index: number,
    item: { label?: string; href?: string }
  ) => {
    if (!item.href) return;

    setMenuOpen(false);

    if (item.href !== pathname) {
      router.push(item.href);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative border-b border-white/[0.08] bg-[#080b10]/60 backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
        />

        <div className="relative mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-10">
          {/* Logo / Home */}
          <Link
            href="/"
            aria-label="TechXetra Home"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center outline-none"
          >
            <Image
              src={mainlogo.logo}
              alt="TechXetra"
              width={200}
              height={64}
              priority
              draggable={false}
              className="h-11 w-auto object-contain sm:h-12 lg:h-[52px]"
              sizes="(max-width: 640px) 160px, 200px"
            />
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-7 md:flex lg:gap-9">
            <nav aria-label="Main navigation">
              <GooeyNav
                items={navItems}
                activeIndex={activeIndex}
                onChange={handleNavigation}
                color="#00E5FF"
                activeTextColor="#061018"
                theme="dark"
                size="md"
                frame={false}
                animationTime={600}
                particleCount={12}
                timeVariance={180}
                spread={38}
                gooeyness={0.55}
                wobble={0.45}
                initialActiveIndex={0}
                hoverEffect
              />
            </nav>

            <Link
              href="/register"
              className={`border px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors duration-300 ${pathname === "/register"
                  ? "border-cyan-200 bg-cyan-200 text-black"
                  : "border-white/20 text-white/80 hover:border-cyan-200/60 hover:text-cyan-100"
                }`}
            >
              Register
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-3 py-3 pl-4 text-xs font-medium tracking-[0.16em] text-white/85 transition-colors hover:text-white md:hidden"
          >
            <span>{menuOpen ? "CLOSE" : "MENU"}</span>

            <span
              aria-hidden="true"
              className="relative flex h-4 w-5 flex-col justify-center gap-[5px]"
            >
              <span
                className={`h-px w-full bg-current transition-transform duration-300 ${menuOpen ? "translate-y-[3px] rotate-45" : ""
                  }`}
              />

              <span
                className={`ml-auto h-px bg-current transition-all duration-300 ${menuOpen
                    ? "w-full -translate-y-[3px] -rotate-45"
                    : "w-3/5"
                  }`}
              />
            </span>
          </button>
        </div>

        {/* Mobile navigation */}
        <div
          id="mobile-navigation"
          aria-hidden={!menuOpen}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out md:hidden ${menuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
        >
          <div className="min-h-0 overflow-hidden">
            <nav
              aria-label="Mobile navigation"
              className="border-t border-white/[0.08] px-5 pb-5 pt-2 sm:px-8"
            >
              <div className="flex flex-col">
                {navItems.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setMenuOpen(false)}
                      className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${active
                          ? "text-cyan-200"
                          : "text-white/70 hover:text-white"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/register"
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => setMenuOpen(false)}
                className={`mt-5 flex w-full items-center justify-center border px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${pathname === "/register"
                    ? "border-cyan-200 bg-cyan-200 text-black"
                    : "border-white/20 text-white/85 hover:border-cyan-200/60 hover:text-cyan-100"
                  }`}
              >
                Register
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;