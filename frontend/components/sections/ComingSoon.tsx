"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

import Star from "@/components/ui/Star";

const highlights = [
  { label: "Events", status: "Compiling" },
  { label: "Experience", status: "Booting up" },
  { label: "Reveal", status: "Incoming" },
];

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: "easeOut" },
  },
};

export default function ComingSoon() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="coming-soon"
      className="relative isolate flex min-h-[85vh] w-full items-center justify-center overflow-hidden border-y border-white/[0.06]  px-5 py-24 text-white sm:px-8 sm:py-28 lg:px-12 xl:px-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(247,243,222,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(247,243,222,0.03)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]" />

        <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-cyan-400/[0.05] blur-[130px] sm:h-96 sm:w-96" />

        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-blue-600/[0.07] blur-[140px]" />

        <div className="absolute left-1/2 top-1/2 aspect-square w-[clamp(320px,72vw,760px)] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 rounded-full border border-white/[0.05]" />

          <div className="absolute inset-[12%] rounded-full border border-dashed border-cyan-300/[0.12]" />

          <div className="absolute inset-[27%] rounded-full border border-white/[0.05]" />

          <motion.div
            className="absolute inset-[12%] rounded-full border border-transparent border-t-cyan-300/30"
            animate={reducedMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 26, ease: "linear", repeat: Infinity }}
          />

          <motion.div
            className="absolute inset-[27%] rounded-full border border-transparent border-b-blue-400/25"
            animate={reducedMotion ? undefined : { rotate: -360 }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
          />
        </div>

        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.06] blur-[100px]" />

        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent"
          style={{ top: "12%" }}
          animate={reducedMotion ? undefined : { top: ["12%", "88%"] }}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        />
      </div>

      <motion.div
        variants={container}
        initial={reducedMotion ? false : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center text-center"
      >
        <motion.p
          variants={fadeUp}
          className="flex items-center justify-center gap-3 font-pixel text-[9px] uppercase tracking-[0.32em] text-cyan-300/80 sm:text-[10px]"
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-400/70 sm:w-12" />
          Signal locked
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-cyan-400/70 sm:w-12" />
        </motion.p>

        <motion.h2
          variants={fadeUp}
          className="mt-6 font-roboto uppercase leading-[0.85] tracking-[0.01em]"
        >
          <span className="title-gradient block text-[clamp(3.4rem,13vw,10.5rem)]">
            Coming
          </span>

          <span className="block text-[clamp(3.4rem,13vw,10.5rem)] text-transparent [-webkit-text-stroke:1.5px_rgba(247,243,222,0.55)]">
            Soon
          </span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-8 max-w-[46ch] font-pixel text-[clamp(0.85rem,0.4vw+0.75rem,1.05rem)] leading-[1.9] text-white/65"
        >
          TechXetra 2026 is compiling something bigger. New arenas, sharper
          challenges and a whole lot more are on the way. Stay tuned.
        </motion.p>

        <motion.ul
          variants={fadeUp}
          className="mt-12 grid w-full max-w-3xl grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {highlights.map(({ label, status }) => (
            <li
              key={label}
              className="flex items-center justify-between gap-4 px-5 py-4 sm:flex-col sm:items-start sm:gap-3 sm:py-6"
            >
              <span className="font-pixel text-[9px] uppercase tracking-[0.24em] text-white/35">
                {label}
              </span>

              <span className="flex items-center gap-2 font-pixel text-[10px] uppercase tracking-[0.2em] text-cyan-300/90">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60 motion-reduce:animate-none" />

                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </span>

                {status}
              </span>
            </li>
          ))}
        </motion.ul>

        <motion.p
          variants={fadeUp}
          className="mt-12 flex flex-wrap items-center justify-center gap-3 font-pixel text-[9px] uppercase tracking-[0.26em] text-white/30"
        >
          <Star className="bg-cyan-300/60" size="0.5rem" />
          TechXetra 2026 — Transmission incoming
          <Star className="bg-cyan-300/60" size="0.5rem" />
        </motion.p>
      </motion.div>
    </section>
  );
}
