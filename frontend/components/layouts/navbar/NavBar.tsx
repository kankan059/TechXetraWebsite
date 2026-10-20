
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { navigation, mainlogo } from "@/constants/navigation";
import GooeyNav from "@/components/layouts/navbar/GooeyNav";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  avatar_url?: string;
};

type AuthResponse = {
  success?: boolean;
  data?: {
    user?: AuthUser;
    profile?: AuthUser;
  } & AuthUser;
  user?: AuthUser;
};

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const navItems = [
    ...navigation.map((item) => ({
      label: item.label,
      href: item.href,
    })),
    ...(!user
      ? [
          {
            label: "Login",
            href: "/login",
          },
        ]
      : []),
  ];

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`));

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => isActive(item.href))
  );

  const handleNavigation = (
    _index: number,
    item: { label?: string; href?: string }
  ) => {
    if (!item.href || item.href === pathname) return;

    setOpenMenuPath(null);
    router.push(item.href);
  };

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) return null;

      const result = (await response.json()) as AuthResponse;

      const currentUser =
        result.data?.user ??
        result.data?.profile ??
        result.user ??
        (result.data && result.success ? result.data : null);

      return result.success !== false && currentUser?.email
        ? currentUser
        : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void checkAuth().then((currentUser) => {
      if (cancelled) return;

      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [checkAuth, pathname]);

  const avatar = user?.picture ?? user?.avatar_url ?? "";
  const profileLabel = user?.name
    ? `${user.name}'s profile`
    : "My profile";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative border-b border-white/[0.08] bg-[#080b10]/60 backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
        />

        <div className="relative mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link
            href="/"
            aria-label="TechXetra Home"
            onClick={() => setOpenMenuPath(null)}
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

            {authChecked && user && (
              <Link
                href="/profile"
                aria-label={profileLabel}
                title={profileLabel}
                className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border transition-colors duration-300 ${
                  pathname === "/profile"
                    ? "border-cyan-200 bg-cyan-200/15 text-cyan-200"
                    : "border-white/20 bg-white/[0.04] text-white/80 hover:border-cyan-200/60 hover:text-cyan-100"
                }`}
              >
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    width={44}
                    height={44}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProfileIcon />
                )}
              </Link>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-4 md:hidden">
            {authChecked && user && (
              <Link
                href="/profile"
                aria-label={profileLabel}
                title={profileLabel}
                onClick={() => setOpenMenuPath(null)}
                className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-colors ${
                  pathname === "/profile"
                    ? "border-cyan-200 bg-cyan-200/15 text-cyan-200"
                    : "border-white/20 text-white/85 hover:border-cyan-200/70 hover:text-cyan-200"
                }`}
              >
                {avatar ? (
                  <Image
                    src={avatar}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProfileIcon />
                )}
              </Link>
            )}

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() =>
                setOpenMenuPath((openPath) =>
                  openPath === pathname ? null : pathname
                )
              }
              className="flex items-center gap-3 py-3 pl-2 text-xs font-medium tracking-[0.16em] text-white/85 transition-colors hover:text-white"
            >
              <span>{menuOpen ? "CLOSE" : "MENU"}</span>

              <span
                aria-hidden="true"
                className="relative flex h-4 w-5 flex-col justify-center gap-[5px]"
              >
                <span
                  className={`h-px w-full bg-current transition-transform duration-300 ${
                    menuOpen ? "translate-y-[3px] rotate-45" : ""
                  }`}
                />

                <span
                  className={`ml-auto h-px bg-current transition-all duration-300 ${
                    menuOpen
                      ? "w-full -translate-y-[3px] -rotate-45"
                      : "w-3/5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div
          id="mobile-navigation"
          aria-hidden={!menuOpen}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out md:hidden ${
            menuOpen
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
                {navigation.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setOpenMenuPath(null)}
                      className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${
                        active
                          ? "text-cyan-200"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {authChecked && user ? (
                <Link
                  href="/profile"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setOpenMenuPath(null)}
                  className={`mt-5 flex w-full items-center justify-center gap-3 border px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                    pathname === "/profile"
                      ? "border-cyan-200 bg-cyan-200 text-black"
                      : "border-white/20 text-white/85 hover:border-cyan-200/60 hover:text-cyan-100"
                  }`}
                >
                  <ProfileIcon />
                  My Profile
                </Link>
              ) : (
                <Link
                  href="/login"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setOpenMenuPath(null)}
                  className={`mt-5 flex w-full items-center justify-center border px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] transition-colors duration-300 ${
                    pathname === "/login"
                      ? "border-cyan-200 bg-cyan-200 text-black"
                      : "border-white/20 text-white/85 hover:border-cyan-200/60 hover:text-cyan-100"
                  }`}
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 shrink-0"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.6-3.5 3.2-5.5 7-5.5s6.4 2 7 5.5" />
    </svg>
  );
}
