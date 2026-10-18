
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { footerInfo } from "@/data/info/footer";
import { TECHXETRA_COLORS } from "@/constants/colors";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

function SocialIcon({ type }: { type: string }) {
  const iconClass = "h-6 w-6";

  switch (type) {
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
        </svg>
      );

    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
          <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.2c-.8-.1-1.6-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
        </svg>
      );

    case "instagram":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="17.5" cy="6.8" r="1" fill="currentColor" />
        </svg>
      );

    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass}>
          <path d="M5.2 3.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM3.3 9.5h3.8V21H3.3V9.5Zm6.2 0h3.6v1.6h.1a4 4 0 0 1 3.6-2c3.9 0 4.6 2.5 4.6 5.7V21h-3.8v-5.5c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9.5V9.5Z" />
        </svg>
      );

    default:
      return null;
  }
}

function FooterMark({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <motion.span
          key={index}
          initial={reducedMotion ? false : { opacity: 0, scaleY: 0.3 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: reducedMotion ? 0 : 0.35,
            delay: reducedMotion ? 0 : index * 0.07,
            ease: "easeOut",
          }}
          className="h-7 w-2.5 origin-bottom -skew-x-[18deg] sm:h-8 sm:w-3"
          style={{ backgroundColor: TECHXETRA_COLORS.cream }}
        />
      ))}
    </div>
  );
}

export default function Footer() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <footer
      className="relative isolate overflow-hidden border-t"
      style={{
        backgroundColor: TECHXETRA_COLORS.black,
        color: TECHXETRA_COLORS.cream,
        borderColor: `${TECHXETRA_COLORS.cream}30`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(247,243,222,0.55) 0.7px, transparent 1px)",
          backgroundSize: "43px 43px",
          backgroundPosition: "8px 12px",
        }}
      />

      <div className="mx-auto grid min-h-[440px] w-full max-w-[1600px] grid-cols-1 items-center gap-10 px-6 py-12 sm:px-10 lg:min-h-[480px] lg:grid-cols-[1fr_2fr_1fr] lg:gap-8 lg:px-10">
        <motion.div
          variants={reveal}
          initial={reducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="flex flex-col items-center gap-7 sm:items-start lg:self-end lg:pb-2"
        >
          <h2 className="font-pixel text-sm uppercase tracking-wide">
            Follow us on
          </h2>

          <div className="flex items-center gap-6">
            <motion.div
              whileHover={reducedMotion ? undefined : { x: 3 }}
              whileTap={reducedMotion ? undefined : { scale: 0.94 }}
            >
              <Link
                href="/"
                aria-label="TechXetra home"
                className="block text-3xl font-bold tracking-[-0.12em] transition-colors duration-300 hover:text-cyan-300"
              >
                »
              </Link>
            </motion.div>

            {footerInfo.socialLinks.map((social, index) => (
              <motion.a
                key={social.type}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: reducedMotion ? 0 : 0.4,
                  delay: reducedMotion ? 0 : 0.15 + index * 0.08,
                }}
                whileHover={reducedMotion ? undefined : { y: -4 }}
                whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                className="transition-colors duration-300 hover:text-cyan-300"
              >
                <SocialIcon type={social.type} />
              </motion.a>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={
            reducedMotion
              ? false
              : { opacity: 0, scale: 0.94, y: 16 }
          }
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: reducedMotion ? 0 : 0.9,
            ease: "easeOut",
          }}
          className="flex items-center justify-center lg:self-center"
        >
          <Link
            href="/"
            aria-label="TechXetra home"
            className="block w-full max-w-[720px]"
          >
            <Image
              src={footerInfo.wordmark}
              alt="TechXetra"
              width={1440}
              height={480}
              sizes="(max-width: 768px) 90vw, 720px"
              className="h-auto w-full object-contain"
            />
          </Link>
        </motion.div>

        <motion.div
          variants={reveal}
          initial={reducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="flex flex-col items-center gap-5 sm:items-end lg:self-end lg:pb-2"
        >
          <div className="text-center sm:text-right">
            <h2 className="font-pixel text-sm sm:text-base">
              {footerInfo.university}
            </h2>

            <a
              href="https://www.google.com/maps/search/?api=1&query=Tezpur+University+Napaam+Assam"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-start gap-3 text-sm leading-6 transition-opacity hover:opacity-70"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mt-1 h-6 w-6 shrink-0"
                aria-hidden="true"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 5.7 8 12 8 12s8-6.3 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>

              <span>
                {footerInfo.address[0]}
                <br />
                {footerInfo.address[1]}
              </span>
            </a>
          </div>

          <FooterMark reducedMotion={reducedMotion} />
        </motion.div>
      </div>
    </footer>
  );
}
