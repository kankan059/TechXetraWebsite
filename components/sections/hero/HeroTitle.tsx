"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

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
    const left = leftRef.current;
    const right = rightRef.current;
    const leftWrap = leftWrapRef.current;
    const rightWrap = rightWrapRef.current;

    if (!root || !x || !left || !right || !leftWrap || !rightWrap) {
      return;
    }

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set([left, right], { xPercent: 0 });
        gsap.set([leftWrap, rightWrap, x], {
          autoAlpha: 1,
        });
        gsap.set(x, {
          scale: 1,
          rotation: 0,
          clearProps: "filter",
        });
        return;
      }

      // Initial positions
      gsap.set(left, { xPercent: 105 });
      gsap.set(right, { xPercent: -105 });

      gsap.set([leftWrap, rightWrap], {
        autoAlpha: 0,
      });

      // X starts oversized, rotated and blurred
      gsap.set(x, {
        scale: isMobile ? 7 : 10,
        rotation: -210,
        opacity: 0,
        filter: "blur(6px)",
        transformOrigin: "50% 50%",
      });

      const tl = gsap.timeline({
        defaults: {
          overwrite: "auto",
        },
      });

      // X appears
      tl.to(x, {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });

      // X spins and returns to its normal size
      tl.to(
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

      // Small overshoot
      tl.to(x, {
        scale: 1.06,
        duration: 0.14,
        ease: "power2.out",
      });

      tl.to(x, {
        scale: 1,
        duration: 0.35,
        ease: "back.out(2)",
      });

      // Reveal both text wrappers together
      tl.set([leftWrap, rightWrap], {
        autoAlpha: 1,
      });

      // TECH enters from the left
      tl.to(
        left,
        {
          xPercent: 0,
          duration: isMobile ? 1.05 : 1.3,
          ease: "power4.out",
        },
        "-=0.28"
      );

      // ETRA enters from the right at the same time
      tl.to(
        right,
        {
          xPercent: 0,
          duration: isMobile ? 1.05 : 1.3,
          ease: "power4.out",
        },
        "<"
      );

      // Subtle final settle
      tl.to(
        root,
        {
          scale: 1.015,
          duration: 0.18,
          ease: "power2.out",
        },
        "-=0.15"
      );

      tl.to(root, {
        scale: 1,
        duration: 0.45,
        ease: "power2.out",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-10 ml-[-3%] w-full min-w-0 max-w-none font-autotech md:ml-[-2%] md:w-[90%] lg:ml-[-4%] lg:w-[110%] xl:ml-[30%] xl:w-[60%]"
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
            sizes="(max-width: 768px) 90px, 170px"
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
          className="absolute right-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:right-[64%]"
        >
          <span
            ref={leftRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.2rem,7.5vw,8.5rem)] uppercase leading-none tracking-[-0.075em]"
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
          className="absolute left-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:left-[64%]"
        >
          <span
            ref={rightRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.2rem,7.5vw,8.5rem)] uppercase leading-none tracking-[-0.075em]"
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