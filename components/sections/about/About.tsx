"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
        },
      });

      gsap.from(textRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        delay: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
      });

      gsap.from(numberRef.current, {
        scale: 0.5,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen px-6 py-32 lg:px-10"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 overflow-hidden">
          <h2
            ref={headingRef}
            className="text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-none tracking-[-0.05em]"
          >
            About Us
          </h2>
        </div>

        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <span
              ref={numberRef}
              className="text-[clamp(6rem,15vw,14rem)] font-black leading-none text-cyan-300/20"
            >
              01
            </span>
          </div>

          <div className="flex items-center">
            <p
              ref={textRef}
              className="max-w-2xl text-lg leading-8 text-white/70 md:text-xl md:leading-9"
            >
              TechXetra is a platform where technology, innovation and ideas
              come together. It brings students, creators and thinkers together
              through competitions, workshops, talks and technical experiences.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}