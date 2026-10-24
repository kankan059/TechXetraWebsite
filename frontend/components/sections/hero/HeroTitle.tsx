"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

const TITLE_POSITION = {
  x: "0px",
  y: "clamp(-45px, -2.5vh, -12px)",
  maxWidth: "min(94vw, 1200px)",
};

export default function HeroTitle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const left = leftRef.current;
    const right = rightRef.current;

    if (!root || !left || !right) return;

    let frame1 = 0;
    let frame2 = 0;
    let timeline: gsap.core.Timeline | undefined;

    const ctx = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const setFinalPosition = () => {
        gsap.set([left, right], {
          x: 0,
          clearProps: "transform",
        });
      };

      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          if (
            prefersReducedMotion ||
            window.scrollY > 10
          ) {
            setFinalPosition();
            return;
          }

          const distance = window.matchMedia(
            "(max-width: 767px)"
          ).matches
            ? 180
            : 450;

          timeline = gsap.timeline();

          timeline.fromTo(
            left,
            { x: -distance },
            {
              x: 0,
              duration: 2.5,
              ease: "power3.out",
              force3D: true,
              clearProps: "transform",
            },
            0
          );

          timeline.fromTo(
            right,
            { x: distance },
            {
              x: 0,
              duration: 2.5,
              ease: "power3.out",
              force3D: true,
              clearProps: "transform",
            },
            0
          );
        });
      });
    }, root);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      timeline?.kill();
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
          className="
            absolute left-1/2 top-1/2 z-20
            aspect-square
            w-[clamp(8.5rem,27vw,25.5rem)]
            min-[768px]:w-[clamp(10.5rem,24vw,25.5rem)]
            -translate-x-1/2 -translate-y-1/2
          "
        >
          <Image
            src="/assets/x.webp"
            alt="X"
            fill
            priority
            quality={75}
            sizes="(max-width: 480px) 168px, (max-width: 767px) 27vw, (max-width: 1200px) 24vw, 408px"
            draggable={false}
            className="object-contain mix-blend-screen"
            style={{
              filter:
                "grayscale(1) brightness(2.3) contrast(1.2) drop-shadow(0 0 5px rgba(255,255,255,0.4)) drop-shadow(0 0 18px rgba(65,195,255,0.65)) drop-shadow(0 0 35px rgba(30,130,255,0.3))",
            }}
          />
        </div>

        {/* TECH */}
        <div className="absolute right-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:right-[55%]">
          <span
            ref={leftRef}
            className="
              title-gradient block whitespace-nowrap
              text-[clamp(2.5rem,min(9.2vw,12vh),8.7rem)]
              uppercase leading-none tracking-[-0.075em]
              will-change-transform
            "
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(115,205,255,0.22)) drop-shadow(0 0 14px rgba(65,150,255,0.12))",
            }}
          >
            TECH
          </span>
        </div>

        {/* ETRA */}
        <div className="absolute left-[56%] top-1/2 z-10 -translate-y-1/2 overflow-hidden xl:left-[55%]">
          <span
            ref={rightRef}
            className="
              title-gradient block whitespace-nowrap
              text-[clamp(2.5rem,min(9.2vw,12vh),8.7rem)]
              uppercase leading-none tracking-[-0.075em]
              will-change-transform
            "
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