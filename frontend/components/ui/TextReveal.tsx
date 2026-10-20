
"use client";

import {
  createElement,
  useEffect,
  useRef,
  type ElementType,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type TextRevealProps = {
  text: string;
  as?: ElementType;
  split?: "words" | "chars";
  className?: string;
  stagger?: number;
  duration?: number;
  y?: number;
  rotateX?: number;
  delay?: number;
  once?: boolean;
};

export default function TextReveal({
  text,
  as = "p",
  split = "words",
  className = "",
  stagger = 0.035,
  duration = 0.8,
  y = 35,
  rotateX = -35,
  delay = 0,
  once = true,
}: TextRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const targets = element.querySelectorAll<HTMLElement>(
      ".text-reveal-item"
    );

    if (!targets.length) return;
    const trigger = element.firstElementChild ?? element;

    const ctx = gsap.context(() => {
      gsap.set(targets, {
        opacity: 0,
        y,
        rotateX,
        transformOrigin: "50% 100%",
        willChange: "transform, opacity",
      });

      gsap.to(targets, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration,
        delay,
        stagger,
        ease: "power3.out",
        clearProps: "willChange",
        scrollTrigger: {
          trigger,
          start: "top 85%",
          once,
        },
      });
    }, element);

    return () => ctx.revert();
  }, [text, split, stagger, duration, y, rotateX, delay, once]);

  const parts = text.split(/(\s+)/);
  let itemIndex = 0;

  const content = parts.map((part, index) => {
    if (/^\s+$/.test(part)) {
      return part;
    }

    if (split === "chars") {
      return (
        <span key={index} className="inline-block whitespace-nowrap">
          {Array.from(part).map((char, charIndex) => (
            <span
              key={charIndex}
              className="text-reveal-item inline-block"
            >
              {char}
            </span>
          ))}
        </span>
      );
    }

    itemIndex++;

    return (
      <span
        key={index}
        className="text-reveal-item inline-block"
      >
        {part}
      </span>
    );
  });

  return (
    <div ref={elementRef} style={{ display: "contents" }}>
      {createElement(
        as,
        {
          className,
          style: { perspective: "800px" },
        },
        content
      )}
    </div>
  );
}
