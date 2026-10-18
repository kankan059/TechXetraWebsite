"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis"; // Ensure Lenis is installed: npm i @studio-freight/lenis

gsap.registerPlugin(ScrollTrigger);

export default function OptimizedScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const artifactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initialize Lenis for buttery smooth native scroll hijacking
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 2. GPU-Accelerated GSAP Animation
    const ctx = gsap.context(() => {
      gsap.fromTo(
        artifactRef.current,
        { scale: 8, y: "50vh" }, // Start massive and lower on screen
        {
          scale: 1, // Shrink to normal size
          y: "0vh", // Move to center
          ease: "none",
          force3D: true, // IMPORTANT: Forces GPU hardware acceleration to eliminate lag
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5, // 1.5 adds a slight smoothing delay to the scrub
          },
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  return (
    // Set a tall height (e.g., 300vh) to give us room to scroll
    <main ref={containerRef} className="relative w-full h-[300vh] bg-[#060606] text-[#F3EAD4]">
      
      {/* Sticky container keeps the viewport locked while scrolling down */}
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden">
        
        {/* will-change-transform tells the browser to prep the GPU for this element */}
        <div 
          ref={artifactRef} 
          className="relative w-64 h-64 will-change-transform"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[#A9E635] rounded-full blur-[80px] opacity-20" />
          
          {/* Drop your generated SVG or PNG here */}
          <img 
            src="/test/spacecraft.png" 
            alt="Spacecraft" 
            className="relative z-10 w-full h-full object-contain" 
          />
        </div>
        
        {/* Background Typography */}
        <h1 className="absolute z-0 text-[10vw] font-light text-white/5 tracking-tighter pointer-events-none">
          TECHXETRA
        </h1>
        
      </div>
    </main>
  );
}