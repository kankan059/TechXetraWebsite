"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useLenis() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mobileQuery = window.matchMedia(
      "(max-width: 767px), (pointer: coarse)"
    );
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let lenis: Lenis | null = null;
    let update: ((time: number) => void) | null = null;

    const updateLenis = () => {
      const shouldUseNativeScroll =
        mobileQuery.matches || reducedMotionQuery.matches;

      if (shouldUseNativeScroll && lenis && update) {
        gsap.ticker.remove(update);
        lenis.destroy();
        lenis = null;
        update = null;
      } else if (!shouldUseNativeScroll && !lenis) {
        lenis = new Lenis({
          duration: 0.9,
          smoothWheel: true,
          wheelMultiplier: 1,
        });
        lenis.on("scroll", ScrollTrigger.update);
        update = (time: number) => {
          lenis?.raf(time * 1000);
        };
        gsap.ticker.add(update);
      }
    };

    updateLenis();
    mobileQuery.addEventListener("change", updateLenis);
    reducedMotionQuery.addEventListener("change", updateLenis);
    window.addEventListener("resize", updateLenis);

    return () => {
      mobileQuery.removeEventListener("change", updateLenis);
      reducedMotionQuery.removeEventListener("change", updateLenis);
      window.removeEventListener("resize", updateLenis);

      if (lenis && update) {
        gsap.ticker.remove(update);
        lenis.destroy();
      }
    };
  }, []);
}