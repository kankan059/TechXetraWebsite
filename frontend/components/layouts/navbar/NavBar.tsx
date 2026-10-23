"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { navigation, mainlogo } from "@/constants/navigation";
import GooeyNav from "@/components/layouts/navbar/GooeyNav";
import type { UserProfile } from "@/types/api";
import { participantApi } from "@/services/participant-api";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const menuOpen = openMenuPath === pathname;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const activeIndex = navItems.findIndex((item) => isActive(item.href));

  const handleNavigation = (
    _index: number,
    item: { label?: string; href?: string }
  ) => {
    if (!item.href || item.href === pathname) return;

    setOpenMenuPath(null);
    setDropdownOpen(false);
    router.push(item.href);
  };

  const checkAuth = useCallback(async () => {
    try {
      const session = await participantApi.auth.session();
      if (session.authenticated && session.user) {
        return session.user;
      }
      return null;
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

  const handleLogout = async () => {
    try {
      await participantApi.auth.logout();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      setOpenMenuPath(null);
      setDropdownOpen(false);
      router.push("/login");
      router.refresh();
    }
  };

  const avatar = user?.avatar_url ?? "";
  const profileLabel = user?.name
    ? `${user.name}'s Dashboard`
    : "My Dashboard";

  return (
    <header className="fixed inset-x-0 top-0 z-50 font-pixel">
      <div className="relative border-b border-white/[0.08] bg-[#080b10]/60 backdrop-blur-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
        />

        <div className="relative mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link
            href="/"
            aria-label="TechXetra Home"
            onClick={() => {
              setOpenMenuPath(null);
              setDropdownOpen(false);
            }}
            className="flex shrink-0 items-center outline-none"
          >
            <Image
              src={mainlogo.logo}
              alt="TechXetra"
              width={200}
              height={64}
              priority
              draggable={false}
              className="h-9 w-auto max-w-[132px] object-contain sm:h-12 sm:max-w-none lg:h-[52px]"
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
                initialActiveIndex={activeIndex}
                hoverEffect
              />
            </nav>

            {authChecked && user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-label={profileLabel}
                  title={profileLabel}
                  className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border transition-colors duration-300 ${pathname.startsWith("/dashboard") || pathname.startsWith("/profile")
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
                </button>


                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden border border-[#55DFFF]/35 bg-[#09151B]/95 text-sm text-[#F5F0DE] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)]">
                    {/* User details */}
                    <div className="border-b border-[#55DFFF]/20 px-4 py-4 pr-7">
                      <p className="truncate font-[var(--font-gotham-bold)] text-sm text-white">
                        {user.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/50">
                        {user.email}
                      </p>
                      <span className="mt-3 inline-block border border-[#55DFFF]/25 bg-[#55DFFF]/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#55DFFF]">
                        {user.role.replaceAll("_", " ")}
                      </span>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-1 p-2">
                      {[
                        { href: "/dashboard", label: "Dashboard & Profile" },
                        { href: "/me/tickets", label: "My Tickets & Passes" },
                        { href: "/me/team-invites", label: "Team Invitations" },
                        { href: "/teams", label: "My Teams & Rosters" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="group flex items-center justify-between border border-transparent px-3 py-2.5 text-[12px] text-white/70 transition-colors duration-200 hover:border-[#55DFFF]/20 hover:bg-[#55DFFF]/[0.07] hover:text-[#55DFFF] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55DFFF]"
                        >
                          <span>{item.label}</span>
                          <span className="translate-x-[-4px] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                            →
                          </span>
                        </Link>
                      ))}

                      {user.role === "SUPER_ADMIN" && (
                        <>
                          <div className="mx-3 my-2 border-t border-white/10" />
                          <Link
                            href="/test"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center justify-between border border-transparent px-3 py-2.5 text-[12px] text-[#8FE388]/90 transition-colors hover:border-[#8FE388]/20 hover:bg-[#8FE388]/[0.06] hover:text-[#8FE388] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8FE388]"
                          >
                            <span>QA Route & Test Suite</span>
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                          </Link>

                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center justify-between border border-transparent px-3 py-2.5 text-[12px] text-[#FF806E]/90 transition-colors hover:border-[#FF806E]/20 hover:bg-[#FF806E]/[0.06] hover:text-[#FF806E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF806E]"
                          >
                            <span>Super Admin Portal</span>
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                          </Link>
                        </>
                      )}

                      {(user.role === "VOLUNTEER" ||
                        user.role === "LEAD" ||
                        user.role === "SUPER_ADMIN") && (
                          <Link
                            href="/staff"
                            onClick={() => setDropdownOpen(false)}
                            className="group flex items-center justify-between border border-transparent px-3 py-2.5 text-[12px] text-[#55DFFF] transition-colors hover:border-[#55DFFF]/20 hover:bg-[#55DFFF]/[0.07] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#55DFFF]"
                          >
                            <span>Staff Operations Portal</span>
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
                          </Link>
                        )}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/10 p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full border border-transparent px-3 py-2.5 text-left text-xs font-medium text-[#FF806E] transition-colors hover:border-[#FF806E]/25 hover:bg-[#FF806E]/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF806E]"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex shrink-0 items-center gap-2.5 md:hidden">
            {authChecked && user && (
              <Link
                href="/dashboard"
                aria-label={profileLabel}
                title={profileLabel}
                onClick={() => setOpenMenuPath(null)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-colors ${pathname.startsWith("/dashboard") || pathname.startsWith("/profile")
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
              className="flex min-h-10 items-center gap-2 py-2 pl-1 text-[10px] font-medium tracking-[0.12em] text-white/85 transition-colors hover:text-white"
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
          <div className="min-h-0 max-h-[calc(100dvh-68px)] overflow-y-auto overscroll-contain">
            <nav
              aria-label="Mobile navigation"
              className="border-t border-white/[0.08] px-3 pb-5 pt-2 sm:px-8"
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

              {authChecked && user ? (
                <div className="flex flex-col">
                  <Link
                    href="/dashboard"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setOpenMenuPath(null)}
                    className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${pathname.startsWith("/dashboard") || pathname.startsWith("/profile")
                        ? "text-cyan-200"
                        : "text-white/70 hover:text-white"
                      }`}
                  >
                    Dashboard &amp; Profile
                  </Link>

                  <Link
                    href="/me/tickets"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setOpenMenuPath(null)}
                    className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${isActive("/me/tickets") ? "text-cyan-200" : "text-white/70 hover:text-white"
                      }`}
                  >
                    My Passes &amp; Tickets
                  </Link>

                  <Link
                    href="/me/team-invites"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setOpenMenuPath(null)}
                    className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${isActive("/me/team-invites") ? "text-cyan-200" : "text-white/70 hover:text-white"
                      }`}
                  >
                    Team Invitations
                  </Link>

                  <Link
                    href="/teams"
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={() => setOpenMenuPath(null)}
                    className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${isActive("/teams") ? "text-cyan-200" : "text-white/70 hover:text-white"
                      }`}
                  >
                    My Teams &amp; Rosters
                  </Link>

                  {user.role === "SUPER_ADMIN" && (
                    <Link
                      href="/test"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setOpenMenuPath(null)}
                      className="border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] text-cyan-300 transition-colors duration-200 hover:text-cyan-200"
                    >
                      Route &amp; Test Suite
                    </Link>
                  )}

                  {(user.role === "VOLUNTEER" || user.role === "LEAD" || user.role === "SUPER_ADMIN") && (
                    <Link
                      href="/staff"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setOpenMenuPath(null)}
                      className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${isActive("/staff") ? "text-cyan-200" : "text-white/70 hover:text-white"
                        }`}
                    >
                      Staff Operations Portal
                    </Link>
                  )}

                  {user.role === "SUPER_ADMIN" && (
                    <Link
                      href="/admin"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setOpenMenuPath(null)}
                      className={`border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] transition-colors duration-200 ${isActive("/admin") ? "text-cyan-200" : "text-white/70 hover:text-white"
                        }`}
                    >
                      Super Admin Portal
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    tabIndex={menuOpen ? 0 : -1}
                    className="mx-auto flex w-full max-w-xs items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-5 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-red-300 transition-colors hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-200"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setOpenMenuPath(null)}
                  className="block border-b border-white/[0.07] py-4 text-sm uppercase tracking-[0.12em] text-white/70 transition-colors duration-200 hover:text-white"
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
