
"use client";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

import { platformPortals } from "@/data/info/platform";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 65,
    y: 22,
    filter: "blur(7px)",
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function Platform() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="platform-portals"
      className="relative isolate overflow-hidden px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
    >
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-cyan-400/[0.08] blur-[120px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-600/[0.09] blur-[130px]"
      />

      {/* Fine technical grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(100,220,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,220,255,0.12) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
          maskImage:
            "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Heading */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mb-14 max-w-3xl sm:mb-16"
        >
          <p
            className="mb-5 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300"
            style={{
              fontFamily:
                "var(--font-gotham-bold, var(--font-sans, Arial))",
            }}
          >
            TechXetra 2026 Platform
          </p>

          <h2
            className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-7xl"
            style={{
              fontFamily:
                "var(--font-ortigel, var(--font-gotham-bold, var(--font-sans, Arial)))",
            }}
          >
            One festival.
            <span className="mt-2 block text-cyan-300">
              Multiple portals.
            </span>
          </h2>

          <p
            className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base"
            style={{
              fontFamily:
                "var(--font-gotham-book, var(--font-sans, Arial))",
            }}
          >
            Everything you need to navigate the festival, discover
            competitions, manage your team and follow the action.
          </p>
        </motion.div>

        {/* Staggered scroll reveal */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {platformPortals.map((portal, index) => {
            // Alternate directions on mobile; use column direction on desktop.
            const direction =
              typeof window === "undefined"
                ? index % 3 === 0
                  ? -1
                  : index % 3 === 2
                    ? 1
                    : 0
                : window.innerWidth >= 1024
                  ? index % 3 === 0
                    ? -1
                    : index % 3 === 2
                      ? 1
                      : 0
                  : index % 2 === 0
                    ? -1
                    : 1;

            return (
              <motion.div
                key={portal.id}
                custom={shouldReduceMotion ? 0 : direction}
                variants={cardVariants}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -5,
                        transition: {
                          duration: 0.25,
                          ease: "easeOut",
                        },
                      }
                }
                className="group relative min-w-0"
              >
                <Link
                  href={portal.href}
                  className="portal-panel relative flex min-h-72 h-full flex-col overflow-hidden p-6 outline-none sm:p-7"
                  style={
                    {
                      "--portal-accent": portal.accent,
                    } as React.CSSProperties
                  }
                >
                  {/* Angular panel outline */}
                  <span
                    aria-hidden="true"
                    className="portal-panel-outline pointer-events-none absolute inset-0"
                  />

                  {/* Accent light */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-[0.07] blur-3xl transition-opacity duration-500 group-hover:opacity-25"
                    style={{ backgroundColor: portal.accent }}
                  />

                  {/* Top information */}
                  <div className="relative flex items-center justify-between gap-4">
                    <span
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]"
                      style={{
                        color: portal.accent,
                        fontFamily:
                          "var(--font-gotham-bold, var(--font-sans, Arial))",
                      }}
                    >
                      {portal.eyebrow}
                    </span>

                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rotate-45 border border-current opacity-80"
                      style={{ color: portal.accent }}
                    />
                  </div>

                  {/* Main content */}
                  <div className="relative mt-12 flex-1">
                    <h3
                      className="max-w-sm text-xl font-semibold leading-snug tracking-tight text-white transition-colors duration-300 group-hover:text-cyan-100 sm:text-2xl"
                      style={{
                        fontFamily:
                          "var(--font-gotham-bold, var(--font-sans, Arial))",
                      }}
                    >
                      {portal.title}
                    </h3>

                    <p
                      className="mt-3 max-w-sm text-sm leading-6 text-white/50 transition-colors duration-300 group-hover:text-white/70"
                      style={{
                        fontFamily:
                          "var(--font-gotham-book, var(--font-sans, Arial))",
                      }}
                    >
                      {portal.description}
                    </p>
                  </div>

                  {/* Bottom interaction */}
                  <div className="relative mt-8 flex items-center justify-between gap-3 border-t border-white/[0.10] pt-5">
                    <span
                      className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/40"
                      style={{
                        fontFamily:
                          "var(--font-gotham-bold, var(--font-sans, Arial))",
                      }}
                    >
                      {portal.status}
                    </span>

                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-white/55 transition-all duration-300 group-hover:border-cyan-300/60 group-hover:bg-cyan-300/10 group-hover:text-cyan-200"
                      style={{
                        clipPath:
                          "polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)",
                      }}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      >
                        <path
                          d="M4.5 10H15.5M10 4.5L15.5 10L10 15.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>

                  {/* Moving accent line */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: portal.accent }}
                  />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: shouldReduceMotion ? 0 : 0.35,
            duration: 0.6,
          }}
          className="mt-8 text-xs tracking-wide text-white/30"
          style={{
            fontFamily:
              "var(--font-gotham-book, var(--font-sans, Arial))",
          }}
        >
          Some portals may require registration or authorised access.
        </motion.p>
      </div>

      <style jsx>{`
        .portal-panel {
          isolation: isolate;
          background: linear-gradient(
            135deg,
            rgba(16, 25, 36, 0.76),
            rgba(8, 12, 19, 0.9) 65%
          );
          clip-path: polygon(
            0 0,
            calc(100% - 24px) 0,
            100% 24px,
            100% 100%,
            24px 100%,
            0 calc(100% - 24px)
          );
          transition:
            background 300ms ease,
            filter 300ms ease;
        }

        .portal-panel:hover {
          background: linear-gradient(
            135deg,
            rgba(20, 36, 49, 0.92),
            rgba(8, 13, 22, 0.96) 70%
          );
        }

        .portal-panel-outline {
          clip-path: polygon(
            0 0,
            calc(100% - 24px) 0,
            100% 24px,
            100% 100%,
            24px 100%,
            0 calc(100% - 24px),
            0 0,
            1px 1px,
            1px calc(100% - 24px - 0.4px),
            calc(24px + 0.4px) calc(100% - 1px),
            calc(100% - 1px) calc(100% - 1px),
            calc(100% - 1px) 24px,
            calc(100% - 24px) 1px,
            1px 1px
          );
          background: rgba(255, 255, 255, 0.14);
          transition: background 300ms ease;
        }

        .portal-panel:hover .portal-panel-outline {
          background: color-mix(
            in srgb,
            var(--portal-accent) 55%,
            transparent
          );
        }

        @media (prefers-reduced-motion: reduce) {
          .portal-panel,
          .portal-panel-outline {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
