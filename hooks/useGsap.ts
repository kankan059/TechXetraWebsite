"use client";

import { useLayoutEffect, RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsap(
  scope: RefObject<HTMLElement | null>,
  callback: () => void
) {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      callback();
    }, scope);

    return () => ctx.revert();
  }, [scope, callback]);
}