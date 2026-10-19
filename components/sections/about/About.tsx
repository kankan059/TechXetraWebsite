
"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import LogoTech from "@/components/animations/LogoTech";
import SectionTitle from "@/components/ui/SectionTitle";
import TextReveal from "@/components/ui/TextReveal";
import aboutInfo from "@/data/info/about";

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  const logoProgressRef = useRef({ value: 0 });
  const logoOpacityRef = useRef({ value: 0.7 });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const titleChars = Array.from(
        section.querySelectorAll<HTMLElement>(".section-title-char")
      );

      const titleDot = section.querySelector<HTMLElement>(
        ".section-title-dot"
      );

      const eyebrowChars = Array.from(
        section.querySelectorAll<HTMLElement>(
          ".section-title-eyebrow-char"
        )
      );

      const eyebrowLine = section.querySelector<HTMLElement>(
        ".section-title-eyebrow-line"
      );

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reducedMotion) {
        gsap.set(
          [...titleChars, ...eyebrowChars, titleDot, eyebrowLine].filter(
            (element): element is HTMLElement => element !== null
          ),
          { clearProps: "all", autoAlpha: 1 }
        );

        if (logoRef.current) {
          gsap.set(logoRef.current, { autoAlpha: 1 });
        }

        logoProgressRef.current.value = 1;
        logoOpacityRef.current.value = 1;

        return;
      }

      // Animate heading only when matching elements exist.
      if (titleChars.length) {
        gsap.set(titleChars, {
          autoAlpha: 0,
          yPercent: 110,
          rotationX: -65,
          transformOrigin: "50% 100%",
        });
      }

      if (titleDot) {
        gsap.set(titleDot, {
          autoAlpha: 0,
          scale: 0.3,
        });
      }

      if (eyebrowChars.length) {
        gsap.set(eyebrowChars, {
          autoAlpha: 0,
          y: 8,
        });
      }

      if (eyebrowLine) {
        gsap.set(eyebrowLine, {
          scaleX: 0,
          transformOrigin: "left center",
        });
      }

      const textTimeline = gsap.timeline({
        scrollTrigger: {
          id: "TECHXTRA-ABOUT-HEADING",
          trigger: section,
          start: "top 82%",
          end: "top 28%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      if (eyebrowLine) {
        textTimeline.fromTo(
          eyebrowLine,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.4, ease: "none" },
          0
        );
      }

      if (eyebrowChars.length) {
        textTimeline.to(
          eyebrowChars,
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.012,
            duration: 0.7,
            ease: "none",
          },
          0.05
        );
      }

      if (titleChars.length) {
        textTimeline.to(
          titleChars,
          {
            autoAlpha: 1,
            yPercent: 0,
            rotationX: 0,
            stagger: 0.035,
            duration: 1.2,
            ease: "none",
          },
          0.12
        );
      }

      if (titleDot) {
        textTimeline.to(
          titleDot,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.25,
            ease: "none",
          },
          0.7
        );
      }

      // Preserve the existing logo animation.
      const logo = logoRef.current;

      if (logo) {
        gsap.set(logo, {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "center center",
        });

        const logoTimeline = gsap.timeline({
          scrollTrigger: {
            id: "TECHXTRA-ABOUT-LOGO",
            trigger: section,
            start: "top 70%",
            end: "bottom 20%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        logoTimeline
          .to(
            logoProgressRef.current,
            { value: 1, duration: 2, ease: "none" },
            0
          )
          .to(
            logoOpacityRef.current,
            { value: 1, duration: 1.5, ease: "none" },
            0
          )
          .to(
            logoProgressRef.current,
            { value: 0, duration: 2, ease: "none" },
            3
          )
          .to(
            logoOpacityRef.current,
            { value: 0, duration: 1.5, ease: "none" },
            3.2
          )
          .to(
            logo,
            {
              scale: 0.86,
              autoAlpha: 0,
              duration: 1,
              ease: "none",
            },
            3.3
          );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative isolate min-h-[100svh] overflow-hidden px-5 text-white sm:px-8 lg:px-12 xl:px-20"
    >
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col justify-center">
        <header className="relative z-10 mb-10 sm:mb-12 lg:mb-14">
          <SectionTitle
            title={aboutInfo.title}
            eyebrow={aboutInfo.eyebrow}
            align="left"
          />
        </header>

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16 xl:gap-24">
          <div
            ref={logoRef}
            className="relative mx-auto h-[300px] w-full max-w-[420px] sm:h-[380px] sm:max-w-[500px] lg:h-[440px] lg:max-w-none xl:h-[500px]"
          >
            <LogoTech
              progressRef={logoProgressRef}
              opacityRef={logoOpacityRef}
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center lg:py-8">
            <TextReveal
              text={aboutInfo.description}
              as="p"
              split="words"
              stagger={0.025}
              duration={0.85}
              y={28}
              rotateX={-25}
              className="w-full max-w-[65ch] font-pixel text-[clamp(1rem,1.1vw+0.65rem,1.5rem)] leading-[1.8] tracking-[0.015em] text-white/80 sm:leading-[1.85] lg:text-[clamp(1.35rem,1.5vw,2rem)] lg:leading-[1.65] xl:text-[clamp(1.5rem,1.6vw,2.1rem)]"
            />

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
              {/* <span className="about-label-line inline-block h-px w-8 shrink-0 bg-cyan-400 sm:w-10" /> */}

              <TextReveal
                text={aboutInfo.tagline}
                as="span"
                split="chars"
                stagger={0.025}
                duration={0.6}
                y={12}
                rotateX={-45}
                delay={0.2}
               className="font-heading text-[clamp(0.7rem,0.8vw+0.45rem,0.95rem)] uppercase leading-relaxed tracking-[0.14em] text-cyan-300/90 sm:tracking-[0.2em]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
