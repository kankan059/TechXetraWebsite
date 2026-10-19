
"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";


const TITLE_POSITION = {
  x: "0px",
  y: "clamp(-45px, -2.5vh, -12px)",
  maxWidth: "min(94vw, 1200px)",
};

export default function TechXetraTitle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLDivElement>(null);
  const leftWrapRef = useRef<HTMLDivElement>(null);
  const rightWrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const x = xRef.current;
    const leftWrap = leftWrapRef.current;
    const rightWrap = rightWrapRef.current;
    const left = leftRef.current;
    const right = rightRef.current;

    if (!root || !x || !leftWrap || !rightWrap || !left || !right) {
      return;
    }

    const ctx = gsap.context(() => {
      const isMobile = window.matchMedia(
        "(max-width: 767px)"
      ).matches;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Establish a visible baseline before starting the animation.
      gsap.set([x, leftWrap, rightWrap], {
        autoAlpha: 1,
      });

      gsap.set([left, right], {
        xPercent: 0,
      });

      gsap.set(x, {
        scale: 1,
        rotation: 0,
        filter: "blur(0px)",
        transformOrigin: "50% 50%",
      });

      // Keep the title visible for users who prefer less motion.
      if (prefersReducedMotion) return;

      // Set the starting positions for the entrance animation.
      gsap.set(left, {
        xPercent: 105,
        force3D: true,
      });

      gsap.set(right, {
        xPercent: -105,
        force3D: true,
      });

      // Dramatic X entrance: oversized, rotated and blurred.
      gsap.set(x, {
        scale: isMobile ? 7 : 10,
        rotation: -210,
        autoAlpha: 0,
        filter: "blur(6px)",
        force3D: true,
      });

      const timeline = gsap.timeline({
        defaults: {
          overwrite: "auto",
        },
      });

      // Reveal the X.
      timeline.to(x, {
        autoAlpha: 1,
        duration: 0.25,
        ease: "power2.out",
      });

      // Spin and zoom into the final position.
      timeline.to(
        x,
        {
          scale: 1,
          rotation: 0,
          filter: "blur(0px)",
          duration: isMobile ? 1.6 : 2,
          ease: "expo.inOut",
        },
        0.05
      );

      // A subtle overshoot gives the X a more physical feel.
      timeline.to(x, {
        scale: 1.06,
        duration: 0.14,
        ease: "power2.out",
      });

      timeline.to(x, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });

      // Reveal the text wrappers.
      timeline.set([leftWrap, rightWrap], {
        autoAlpha: 1,
      });

      // TECH slides in from the left.
      timeline.to(
        left,
        {
          xPercent: 0,
          duration: isMobile ? 0.95 : 1.2,
          ease: "power4.out",
        },
        "-=0.2"
      );

      // ETRA slides in from the right simultaneously.
      timeline.to(
        right,
        {
          xPercent: 0,
          duration: isMobile ? 0.95 : 1.2,
          ease: "power4.out",
        },
        "<"
      );
    }, root);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-10 mx-auto w-full min-w-0 font-autotech"
      style={{
        maxWidth: TITLE_POSITION.maxWidth,
        transform: `translate3d(${TITLE_POSITION.x}, ${TITLE_POSITION.y}, 0)`,
      }}
    >
      <div className="relative h-[clamp(15rem,21vw,21rem)] w-full">
        {/* Central X */}
        <div
          ref={xRef}
          className="absolute left-1/2 top-1/2 z-20 aspect-square w-[clamp(10.5rem,24vw,25.5rem)] -translate-x-1/2 -translate-y-1/2 will-change-transform"
        >
          <Image
            src="/assets/x.png"
            alt="X"
            fill
            priority
            quality={75}
            sizes="(max-width: 480px) 168px, (max-width: 768px) 184px, (max-width: 1200px) 24vw, 408px"
            draggable={false}
            className="object-contain mix-blend-screen"
            style={{
              filter:
                "grayscale(1) brightness(2.3) contrast(1.2) drop-shadow(0 0 5px rgba(255,255,255,0.4)) drop-shadow(0 0 18px rgba(65,195,255,0.65)) drop-shadow(0 0 35px rgba(30,130,255,0.3))",
            }}
          />
        </div>

        {/* TECH */}
        <div
          ref={leftWrapRef}
          className="absolute right-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:right-[55%]"
        >
          <span
            ref={leftRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.5rem,7.6vw,8.7rem)] uppercase leading-none tracking-[-0.075em] will-change-transform"
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(115,205,255,0.22)) drop-shadow(0 0 14px rgba(65,150,255,0.12))",
            }}
          >
            TECH
          </span>
        </div>

        {/* ETRA */}
        <div
          ref={rightWrapRef}
          className="absolute left-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:left-[55%]"
        >
          <span
            ref={rightRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.5rem,7.6vw,8.7rem)] uppercase leading-none tracking-[-0.075em] will-change-transform"
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(115,205,255,0.22)) drop-shadow(0 0 14px rgba(65,150,255,0.12))",
            }}
          >
            ETRA
          </span>
        </div>
      </div>
    </div>
  );
}
