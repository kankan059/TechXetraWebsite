"use client";

import { ReactNode, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGsap } from "@/hooks/useGsap";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: ReactNode;
  className?: string;
};

export default function ScrollReveal({
  children,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGsap(ref, () => {
    gsap.to(ref.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 85%",
        once: true,
      },
    });
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(90px)",
      }}
    >
      {children}
    </div>
  );
}