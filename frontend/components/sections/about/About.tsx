"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import LogoTech from "@/components/animations/LogoTech";
import SectionTitle from "@/components/ui/SectionTitle";
import TextReveal from "@/components/ui/TextReveal";
import aboutInfo from "@/data/info/about";

gsap.registerPlugin(ScrollTrigger);

const Corners = ({ className = "" }: { className?: string }) => (
  <>
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[#8ED8E8]/60 ${className}`}
    />
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-[#8ED8E8]/60 ${className}`}
    />
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[#8ED8E8]/60 ${className}`}
    />
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[#8ED8E8]/60 ${className}`}
    />
  </>
);

const Constellation = ({
  className = "",
}: {
  className?: string;
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 320 240"
    fill="none"
    className={`pointer-events-none absolute ${className}`}
  >
    <g
      stroke="#8ED8E8"
      strokeWidth="0.8"
      strokeOpacity="0.35"
    >
      <path d="M35 175 L85 135 L125 150 L165 85 L215 105 L265 45" />
      <path d="M85 135 L105 65 L165 85" />
      <path d="M125 150 L155 205 L215 105" />
      <path d="M215 105 L250 155 L290 130" />
    </g>

    <g fill="#A9E8F4">
      <circle cx="35" cy="175" r="2.2" />
      <circle cx="85" cy="135" r="2.8" />
      <circle cx="125" cy="150" r="1.8" />
      <circle cx="165" cy="85" r="3" />
      <circle cx="215" cy="105" r="2.3" />
      <circle cx="265" cy="45" r="2.6" />
      <circle cx="105" cy="65" r="1.8" />
      <circle cx="155" cy="205" r="2" />
      <circle cx="250" cy="155" r="1.8" />
      <circle cx="290" cy="130" r="2.2" />
    </g>

    <g fill="#8ED8E8" fillOpacity="0.45">
      <circle cx="35" cy="175" r="5" />
      <circle cx="165" cy="85" r="6" />
      <circle cx="265" cy="45" r="5" />
    </g>
  </svg>
);

const About = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  const logoProgressRef = useRef({ value: 0 });
  const logoOpacityRef = useRef({ value: 0.7 });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    section.dataset.aboutActive = "false";

    const io = new IntersectionObserver(
      ([entry]) => {
        section.dataset.aboutActive = entry.isIntersecting
          ? "true"
          : "false";
      },
      { rootMargin: "100px 0px" }
    );

    io.observe(section);

    const ctx = gsap.context(() => {
      const q = <T extends HTMLElement | SVGElement>(sel: string) =>
        Array.from(section.querySelectorAll<T>(sel));

      const cards = q<HTMLElement>(".about-card");

      section
        .querySelectorAll<HTMLElement>(
          ".section-title-char, .section-title-dot, .section-title-eyebrow-char, .section-title-eyebrow-line"
        )
        .forEach((el) => {
          gsap.set(el, {
            clearProps: "all",
            autoAlpha: 1,
            visibility: "visible",
            opacity: 1,
          });
        });

      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reducedMotion) {
        if (logoRef.current) {
          gsap.set(logoRef.current, {
            autoAlpha: 1,
            scale: 1,
          });
        }

        logoProgressRef.current.value = 1;
        logoOpacityRef.current.value = 1;
        return;
      }

      if (cards.length) {
        gsap.set(cards, {
          autoAlpha: 0,
          y: 18,
        });

        ScrollTrigger.create({
          trigger: cards[0],
          start: "top 92%",
          once: true,
          onEnter: () =>
            gsap.to(cards, {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.1,
              ease: "power3.out",
              clearProps: "transform",
            }),
        });
      }

      const logo = logoRef.current;
      if (!logo) return;

      gsap.set(logo, {
        autoAlpha: 1,
        scale: 1,
        transformOrigin: "center center",
      });

      if (isMobile) {
        logoProgressRef.current.value = 0;
        logoOpacityRef.current.value = 1;

        gsap.to(logoProgressRef.current, {
          value: 1,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: logo,
            start: "top 85%",
            once: true,
          },
        });
      } else {
        gsap
          .timeline({
            scrollTrigger: {
              id: "TECHXETRA-ABOUT-LOGO",
              trigger: section,
              start: "top 70%",
              end: "bottom 20%",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          })
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
            { scale: 0.86, autoAlpha: 0, duration: 1, ease: "none" },
            3.3
          );
      }
    }, section);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      data-about-active="false"
      className="relative isolate w-full overflow-hidden px-4 py-16 text-[#F5F0DE] sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12 lg:py-28 xl:px-20"
    >
      {/* DARK SPACE BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-black" />

        {/* Central dark space gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#102B3B_0%,#0B1C27_32%,#080F16_58%,#000000_100%)]" />

        {/* Subtle cyan lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_30%,rgba(25,105,135,0.16)_0%,transparent_48%)]" />

        {/* Minimal burgundy contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_75%,rgba(95,35,48,0.07)_0%,transparent_45%)]" />

        {/* Glossy reflection */}
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(85,223,255,0.035)_0%,transparent_35%,transparent_70%,rgba(255,128,110,0.015)_100%)]" />

        {/* Space particles */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(180,220,235,0.7) 0.65px, transparent 0.65px)",
            backgroundSize: "5px 5px",
          }}
        />

        {/* Black edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(0,0,0,0.55)_65%,#000000_100%)]" />
      </div>

      {/* CONSTELLATIONS */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Top right constellation */}
        <Constellation className="right-[-65px] top-[-35px] w-[240px] opacity-45 sm:right-[-25px] sm:top-[-20px] sm:w-[300px] md:w-[340px]" />

        {/* Bottom left constellation */}
        <Constellation className="bottom-[-65px] left-[-100px] w-[250px] -rotate-[18deg] opacity-35 sm:bottom-[-35px] sm:left-[-55px] sm:w-[310px] md:w-[350px]" />

        {/* Tiny distant stars */}
        <div className="absolute right-[28%] top-[18%] h-1 w-1 rounded-full bg-[#A9E8F4]/60 shadow-[0_0_8px_2px_rgba(85,223,255,0.25)]" />
        <div className="absolute bottom-[20%] right-[12%] h-1 w-1 rounded-full bg-[#A9E8F4]/50 shadow-[0_0_8px_2px_rgba(85,223,255,0.2)]" />
        <div className="absolute bottom-[35%] left-[8%] h-1 w-1 rounded-full bg-[#A9E8F4]/50 shadow-[0_0_8px_2px_rgba(85,223,255,0.2)]" />
      </div>
      {/* BOTTOM BLACK TRANSITION */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-[1] h-[180px] w-full bg-gradient-to-b from-transparent via-black/80 to-black sm:h-[220px] md:h-[260px]"
      />

      {/* CONTENT */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        {/* HEADING */}
        <header className="relative z-10 mb-6 sm:mb-8 md:mb-9 lg:mb-10">
          <SectionTitle
            title={aboutInfo.title}
            eyebrow={aboutInfo.eyebrow}
            align="left"
          />
        </header>

        <div className="relative z-10 grid grid-cols-1 items-start gap-8 md:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-16 2xl:gap-24">
          {/* LOGO */}
          <div
            ref={logoRef}
            className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center sm:max-w-[360px] md:max-w-[380px] lg:max-w-[380px] xl:max-w-[420px]"
          >
            {/* Cyan glow directly behind logo */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[65%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(35,145,185,0.24)_0%,rgba(25,105,145,0.12)_38%,rgba(10,45,65,0.05)_62%,transparent_75%)]"
            />


            <div className="relative z-10 h-full w-full">
              <LogoTech
                progressRef={logoProgressRef}
                opacityRef={logoOpacityRef}
              />
            </div>
          </div>

          {/* TEXT PANEL */}
          <div className="min-w-0">
            <div className="group relative overflow-hidden rounded-sm border border-[#8ED8E8]/15 bg-gradient-to-br from-[#10232D]/95 via-[#0B151D]/95 to-[#111014]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md sm:p-7 md:p-8 xl:p-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[1px] border border-white/[0.035]"
              />

              <Corners />

              <div
                aria-hidden="true"
                className="relative mb-6 flex items-center gap-3 sm:mb-7"
              >
                <span className="about-pulse h-2 w-2 rounded-full bg-[#8ED8E8] shadow-[0_0_10px_2px_rgba(103,232,249,0.5)]" />

                <span className="h-px w-16 bg-gradient-to-r from-[#8ED8E8] via-[#8ED8E8]/50 to-transparent sm:w-24" />

                <span className="text-[9px] tracking-[0.3em] text-[#A8C5B5]/70">
                  ABOUT TECHXETRA
                </span>
              </div>

              <TextReveal
                text={aboutInfo.description}
                as="p"
                split="words"
                stagger={0.025}
                duration={0.85}
                y={24}
                rotateX={-15}
                className="relative w-full max-w-[58ch] font-pixel text-[clamp(0.9rem,0.45vw+0.8rem,1.15rem)] leading-[1.9] tracking-[0.005em] text-[#F5F0DE]/80 sm:text-base sm:leading-[1.95] md:text-[1.05rem] lg:text-[clamp(0.9rem,0.35vw+0.75rem,1.1rem)] lg:leading-[1.9] xl:text-[1.15rem] xl:leading-[1.95]"
              />

              <div className="relative mt-7 border-t border-[#B6DCE0]/15 pt-5 sm:mt-9 sm:pt-6">
                <div className="absolute left-0 top-0 h-px w-20 bg-gradient-to-r from-[#8ED8E8]/50 to-transparent" />

                <TextReveal
                  text={aboutInfo.tagline}
                  as="p"
                  split="chars"
                  stagger={0.025}
                  duration={0.6}
                  y={12}
                  rotateX={-30}
                  delay={0.2}
                  className="max-w-[52ch] font-heading text-[clamp(0.7rem,0.55vw+0.55rem,0.95rem)] uppercase leading-[1.9] tracking-[0.12em] text-[#A9C6A1]/80 sm:tracking-[0.17em] md:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;