
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

export default function TechXetraTitle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLDivElement>(null);
  const leftWrapRef = useRef<HTMLDivElement>(null);
  const rightWrapRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
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
      gsap.set(left, { xPercent: 105 });
      gsap.set(right, { xPercent: -105 });
      gsap.set([leftWrap, rightWrap], { opacity: 0 });

      gsap.set(x, {
        scale: isMobile ? 7 : 10,
        rotation: -210,
        opacity: 0,
        filter: "blur(6px)",
      });

      const tl = gsap.timeline();

      tl.to(x, {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });

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

      tl.set([leftWrap, rightWrap], { opacity: 1 });

      tl.to(
        left,
        {
          xPercent: 0,
          duration: 1.2,
          ease: "power4.out",
        },
        "-=0.28"
      );

      tl.to(
        right,
        {
          xPercent: 0,
          duration: 1.2,
          ease: "power4.out",
        },
        "<0.04"
      );

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
    }, rootRef);

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
    "grayscale(1) brightness(2.3) contrast(1.2) drop-shadow(0 0 5px rgba(255,255,255,0.3)) drop-shadow(0 0 16px rgba(255,75,43,0.25))",
}}
          />
        </div>

        {/* TECH */}
        <div
          ref={leftWrapRef}
          className="absolute right-[56%] xl:right-[64%] top-1/2 z-10 -translate-y-1/2 overflow-hidden"
        >
          <span
            ref={leftRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.2rem,7.5vw,8.5rem)] uppercase leading-none tracking-[-0.075em]"
          >
            TECH
          </span>
        </div>

        {/* ETRA */}
        <div
          ref={rightWrapRef}
          className="absolute left-[56%] xl:left-[64%] top-1/2 z-10 -translate-y-1/2 overflow-hidden"
        >
          <span
            ref={rightRef}
            className="title-gradient block whitespace-nowrap text-[clamp(2.2rem,7.5vw,8.5rem)] uppercase leading-none tracking-[-0.075em]"
          >
            ETRA
          </span>
        </div>
      </div>
    </div>
  );
}
