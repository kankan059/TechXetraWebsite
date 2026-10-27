
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
      className="relative isolate w-full overflow-hidden px-4 py-16 text-white sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12 lg:py-28 xl:px-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 top-1/4 h-72 w-72 rounded-full bg-cyan-400/[0.045] blur-[120px] sm:h-96 sm:w-96" />

        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-blue-600/[0.06] blur-[130px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />
      </div>

      <div className="mx-auto w-full max-w-[1440px]">
        <header className="relative z-10 mb-10 sm:mb-12 md:mb-14 lg:mb-16">
          <SectionTitle
            title={aboutInfo.title}
            eyebrow={aboutInfo.eyebrow}
            align="left"
          />
        </header>

        <div className="relative z-10 grid grid-cols-1 items-center gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-16 2xl:gap-24">
          <div
            ref={logoRef}
            className="relative mx-auto flex h-[260px] w-full max-w-[340px] items-center justify-center sm:h-[340px] sm:max-w-[440px] md:h-[390px] md:max-w-[500px] lg:h-[420px] lg:max-w-none xl:h-[500px]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[12%] rounded-full border border-cyan-300/[0.08]"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[22%] rounded-full border border-dashed border-blue-300/[0.12]"
            />

            <div className="relative h-full w-full">
              <LogoTech
                progressRef={logoProgressRef}
                opacityRef={logoOpacityRef}
              />
            </div>
          </div>

          <div className="min-w-0 lg:py-4 xl:py-8">
            <div
              aria-hidden="true"
              className="mb-6 h-px w-16 bg-gradient-to-r from-cyan-300 via-blue-400/70 to-transparent sm:mb-8 sm:w-20"
            />

            <TextReveal
              text={aboutInfo.description}
              as="p"
              split="words"
              stagger={0.025}
              duration={0.85}
              y={24}
              rotateX={-15}
              className="w-full max-w-[58ch] font-pixel text-[clamp(0.9rem,0.45vw+0.8rem,1.15rem)] leading-[1.9] tracking-[0.005em] text-white/75 sm:text-base sm:leading-[1.95] md:text-[1.05rem] lg:text-[clamp(0.9rem,0.35vw+0.75rem,1.1rem)] lg:leading-[1.9] xl:text-[1.15rem] xl:leading-[1.95]"
            />

            <div className="mt-7 border-t border-white/10 pt-5 sm:mt-9 sm:pt-6 md:mt-10">
              <TextReveal
                text={aboutInfo.tagline}
                as="p"
                split="chars"
                stagger={0.025}
                duration={0.6}
                y={12}
                rotateX={-30}
                delay={0.2}
                className="max-w-[52ch] font-heading text-[clamp(0.7rem,0.55vw+0.55rem,0.95rem)] uppercase leading-[1.9] tracking-[0.12em] text-cyan-300/90 sm:tracking-[0.17em] md:text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
