"use client";

import type { RefObject } from "react";

interface SectionTitleProps {
  title: string;
  eyebrow?: string;
  align?: "left" | "center";
  className?: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

export default function SectionTitle({
  title,
  align = "left",
  className = "",
  titleRef,
}: SectionTitleProps) {
  return (
    <div
      className={`w-full ${
        align === "center" ? "text-center" : "text-left"
      } ${className}`}
    >
      { (
        <p
          className={`section-title-eyebrow mb-4 flex items-center gap-3 font-pixel text-[8px] uppercase tracking-[0.22em] text-cyan-300/70 sm:text-[10px] ${
            align === "center" ? "justify-center" : "justify-start"
          }`}
        >
          <span className="section-title-eyebrow-line inline-block h-px w-5 shrink-0 origin-left bg-cyan-400/70 sm:w-7" />
        </p>
      )}

      <h2
        ref={titleRef}
        className="section-title-heading font-autotech text-[clamp(2.3rem,6vw,6rem)] uppercase leading-[0.95] text-white"
      >
        <span className="sr-only">{title}.</span>

        <span aria-hidden="true">
          {Array.from(title).map((character, index) => (
            <span
              key={`${character}-${index}`}
              className="section-title-char inline-block whitespace-pre"
            >
              {character}
            </span>
          ))}

          <span className="section-title-dot ml-1 inline-block text-cyan-400">
            .
          </span>
        </span>
      </h2>
    </div>
  );
}