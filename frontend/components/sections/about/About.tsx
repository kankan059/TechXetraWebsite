"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import LogoTech from "@/components/animations/LogoTech";
import SectionTitle from "@/components/ui/SectionTitle";
import TextReveal from "@/components/ui/TextReveal";
import aboutInfo from "@/data/info/about";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* Static star field, generated once from a fixed seed so the server   */
/* and the client always render the exact same background.             */
/* ------------------------------------------------------------------ */
const STAR_FIELD = (() => {
  let seed = 23;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const layers: string[] = [];
  for (let i = 0; i < 46; i++) {
    const x = (next() * 100).toFixed(2);
    const y = (next() * 100).toFixed(2);
    const a = (0.25 + next() * 0.5).toFixed(2);
    const big = next() > 0.82;
    const c = `rgba(${big ? "225,242,255" : "170,205,240"},${a})`;
    layers.push(
      `radial-gradient(circle at ${x}% ${y}%, ${c} 0, ${c} ${big ? 1.1 : 0.7}px, transparent ${big ? 1.8 : 1.2}px)`
    );
  }
  return layers.join(",");
})();

const SECTION_BG = [
  "radial-gradient(ellipse 60% 50% at 18% 22%, rgba(40,80,210,0.22), transparent 70%)",
  "radial-gradient(ellipse 50% 45% at 86% 78%, rgba(20,130,170,0.16), transparent 70%)",
  "radial-gradient(ellipse 45% 40% at 70% 20%, rgba(100,90,230,0.10), transparent 70%)",
].join(",");

const CSS = `
@keyframes ab-spin { to { transform: rotate(360deg); } }
@keyframes ab-spin-rev { to { transform: rotate(-360deg); } }
@keyframes ab-twinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes ab-pulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.25); } }
.ab-spin-a, .ab-spin-b, .ab-spin-c { transform-box: view-box; transform-origin: 50% 50%; will-change: transform; }
.ab-spin-a { animation: ab-spin 80s linear infinite; }
.ab-spin-b { animation: ab-spin-rev 120s linear infinite; }
.ab-spin-c { animation: ab-spin 160s linear infinite; }
.ab-twinkle { animation: ab-twinkle 3.6s ease-in-out infinite; }
.ab-pulse { animation: ab-pulse 2.8s ease-in-out infinite; }
#about[data-about-active="false"] .ab-spin-a,
#about[data-about-active="false"] .ab-spin-b,
#about[data-about-active="false"] .ab-spin-c,
#about[data-about-active="false"] .ab-twinkle,
#about[data-about-active="false"] .ab-pulse { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .ab-spin-a, .ab-spin-b, .ab-spin-c, .ab-twinkle, .ab-pulse { animation: none; }
}
`;

/** A four point star, drawn around the origin. */
const SPARK = "M0 -10 Q1.4 -1.4 10 0 Q1.4 1.4 0 10 Q-1.4 1.4 -10 0 Q-1.4 -1.4 0 -10Z";

const Constellation = ({ className = "" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 320 240"
    fill="none"
    className={`pointer-events-none absolute ${className}`}
  >
    <g stroke="#9AD7FF" strokeWidth="0.8" strokeOpacity="0.4">
      <path className="ab-line" pathLength={1} d="M35 175 L85 135 L125 150 L165 85 L215 105 L265 45" />
      <path className="ab-line" pathLength={1} d="M85 135 L105 65 L165 85" />
      <path className="ab-line" pathLength={1} d="M125 150 L155 205 L215 105" />
      <path className="ab-line" pathLength={1} d="M215 105 L250 155 L290 130" />
    </g>

    <g fill="#BFE6FF">
      <circle className="ab-dot" cx="35" cy="175" r="1.8" />
      <circle className="ab-dot" cx="125" cy="150" r="1.6" />
      <circle className="ab-dot" cx="215" cy="105" r="1.9" />
      <circle className="ab-dot" cx="105" cy="65" r="1.5" />
      <circle className="ab-dot" cx="155" cy="205" r="1.6" />
      <circle className="ab-dot" cx="250" cy="155" r="1.5" />
      <circle className="ab-dot" cx="290" cy="130" r="1.8" />
    </g>

    <g fill="#E6F6FF">
      <path className="ab-dot" transform="translate(85 135) scale(0.7)" d={SPARK} />
      <path className="ab-dot" transform="translate(165 85) scale(0.9)" d={SPARK} />
      <path className="ab-dot" transform="translate(265 45) scale(0.8)" d={SPARK} />
    </g>
  </svg>
);

/** Thin orbits that slowly turn around the logo. Only the inner groups rotate, so GSAP can fade the outer layers freely. */
const Orbits = () => (
  <>
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      className="ab-ring pointer-events-none absolute inset-[-6%] h-[112%] w-[112%] overflow-visible"
    >
      <g className="ab-spin-a">
        <ellipse cx="200" cy="200" rx="196" ry="74" transform="rotate(-28 200 200)" stroke="#9AD7FF" strokeOpacity="0.22" strokeWidth="0.8" />
        <path
          d="M 330 130 A 196 74 -28 0 1 388 205"
          stroke="#DDF2FF"
          strokeOpacity="0.7"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <g transform="translate(332 134) scale(0.55)" fill="#E6F6FF">
          <path d={SPARK} />
        </g>
      </g>
    </svg>

    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      className="ab-ring pointer-events-none absolute inset-[-6%] h-[112%] w-[112%] overflow-visible"
    >
      <g className="ab-spin-b">
        <ellipse cx="200" cy="200" rx="150" ry="62" transform="rotate(32 200 200)" stroke="#9AD7FF" strokeOpacity="0.18" strokeWidth="0.8" />
        <g transform="translate(88 262) scale(0.42)" fill="#BFE6FF">
          <path d={SPARK} />
        </g>
      </g>
    </svg>

    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      fill="none"
      className="ab-ring pointer-events-none absolute inset-[-6%] h-[112%] w-[112%] overflow-visible"
    >
      <g className="ab-spin-c">
        <circle cx="200" cy="200" r="178" stroke="#9AD7FF" strokeOpacity="0.1" strokeWidth="0.8" strokeDasharray="1 7" strokeLinecap="round" />
      </g>
    </svg>

    {/* The North Star, fixed above the orbits. */}
    <svg
      aria-hidden="true"
      viewBox="-12 -12 24 24"
      className="ab-ring ab-twinkle pointer-events-none absolute right-[2%] top-[4%] h-6 w-6 sm:h-7 sm:w-7"
    >
      <path d={SPARK} fill="#F2FAFF" />
      <circle r="2.2" fill="#FFFFFF" />
    </svg>
  </>
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

    // Decorative loops and the logo only run while the section is near the screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        section.dataset.aboutActive = entry.isIntersecting ? "true" : "false";
      },
      { rootMargin: "100px 0px" }
    );

    io.observe(section);

    const ctx = gsap.context(() => {
      const q = <T extends HTMLElement | SVGElement>(sel: string) =>
        Array.from(section.querySelectorAll<T>(sel));

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
          gsap.set(logoRef.current, { autoAlpha: 1, scale: 1 });
        }
        logoProgressRef.current.value = 1;
        logoOpacityRef.current.value = 1;
        return;
      }

      const reveals = q<HTMLElement>(".ab-reveal");
      const rings = q<SVGElement>(".ab-ring");
      const lines = q<SVGPathElement>(".ab-line");
      const dots = q<SVGElement>(".ab-dot");
      const rule = section.querySelector<HTMLElement>(".ab-rule");
      const sheen = section.querySelector<HTMLElement>(".ab-sheen");

      gsap.set(reveals, { autoAlpha: 0, y: 28 });
      gsap.set(rings, { autoAlpha: 0 });
      gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(dots, { autoAlpha: 0 });
      if (rule) gsap.set(rule, { scaleY: 0, transformOrigin: "top center" });

      // One calm entrance when the section arrives.
      ScrollTrigger.create({
        trigger: section,
        start: "top 72%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

          tl.to(rings, { autoAlpha: 1, duration: 1.4, stagger: 0.15 }, 0)
            .to(
              lines,
              { strokeDashoffset: 0, duration: 1.8, stagger: 0.12, ease: "power2.inOut" },
              0.2
            )
            .to(dots, { autoAlpha: 1, duration: 0.7, stagger: 0.06 }, 0.5)
            .to(
              reveals,
              { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.14, clearProps: "transform" },
              0.15
            );

          if (rule) {
            tl.to(rule, { scaleY: 1, duration: 1.1, ease: "power2.inOut" }, 0.3);
          }
          if (sheen) {
            tl.fromTo(
              sheen,
              { xPercent: -130, autoAlpha: 1 },
              { xPercent: 130, duration: 1.4, ease: "power2.inOut" },
              0.7
            ).set(sheen, { autoAlpha: 0 });
          }
        },
      });

      // Slow drift on the corner constellations (desktop only, transform only).
      if (!isMobile) {
        q<HTMLElement>(".ab-drift").forEach((el, i) => {
          gsap.to(el, {
            yPercent: i % 2 ? 10 : -10,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
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
          .to(logoProgressRef.current, { value: 1, duration: 2, ease: "none" }, 0)
          .to(logoOpacityRef.current, { value: 1, duration: 1.5, ease: "none" }, 0)
          .to(logoProgressRef.current, { value: 0, duration: 2, ease: "none" }, 3)
          .to(logoOpacityRef.current, { value: 0, duration: 1.5, ease: "none" }, 3.2)
          .to(logo, { scale: 0.86, autoAlpha: 0, duration: 1, ease: "none" }, 3.3);
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
      className="relative isolate w-full overflow-hidden bg-[#030610] px-4 py-16 text-[#E6ECFF] sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12 lg:py-28 xl:px-20"
    >
      <style>{CSS}</style>

      {/* BACKGROUND */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ backgroundImage: SECTION_BG }} />
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: STAR_FIELD }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,3,10,0.7)_100%)]" />
      </div>

      {/* Blend from the hero above */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-b from-[#030610] to-transparent sm:h-32"
      />

      {/* CONSTELLATIONS */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="ab-drift absolute inset-0 will-change-transform">
          <Constellation className="right-[-65px] top-[-20px] w-[240px] opacity-60 sm:right-[-25px] sm:w-[300px] md:w-[340px]" />
        </div>
        <div className="ab-drift absolute inset-0 will-change-transform">
          <Constellation className="bottom-[-45px] left-[-100px] w-[250px] -rotate-[18deg] opacity-45 sm:bottom-[-20px] sm:left-[-55px] sm:w-[310px] md:w-[350px]" />
        </div>
      </div>

      {/* Blend into the next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-[1] h-[180px] w-full bg-gradient-to-b from-transparent via-black/80 to-black sm:h-[220px] md:h-[260px]"
      />

      {/* CONTENT */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <header className="relative z-10 mb-8 sm:mb-10 md:mb-12 lg:mb-14">
          <SectionTitle title={aboutInfo.title} eyebrow={aboutInfo.eyebrow} align="left" />
        </header>

        <div className="relative z-10 grid grid-cols-1 items-center gap-12 md:gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-20 2xl:gap-28">
          {/* LOGO */}
          <div
            ref={logoRef}
            className="relative mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center sm:max-w-[330px] md:max-w-[360px] lg:max-w-[380px] xl:max-w-[420px]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(60,150,230,0.26)_0%,rgba(40,100,200,0.12)_40%,rgba(20,50,120,0.04)_62%,transparent_75%)]"
            />

            {/* <Orbits /> */}

            <div className="relative z-10 h-[98%] w-[98%]">
              <LogoTech progressRef={logoProgressRef} opacityRef={logoOpacityRef} />
            </div>
          </div>

          {/* TEXT PANEL */}
          <div className="min-w-0">
            <div className="ab-reveal group relative overflow-hidden rounded-md border border-white/10 bg-[linear-gradient(160deg,rgba(14,30,52,0.82)_0%,rgba(6,12,24,0.92)_55%,rgba(4,8,18,0.96)_100%)] p-5 pl-7 shadow-[0_24px_70px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] transition-colors duration-500 hover:border-[#9AD7FF]/30 sm:p-7 sm:pl-10 md:p-8 md:pl-11 xl:p-10 xl:pl-14">
              {/* top hairline */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#9AD7FF]/60 via-[#9AD7FF]/15 to-transparent"
              />

              {/* left rule with a node */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-6 left-3 top-6 w-px sm:left-4 xl:left-6"
              >
                <span className="ab-rule absolute inset-0 bg-gradient-to-b from-[#9AD7FF]/70 via-[#9AD7FF]/25 to-transparent" />
                <span className="ab-pulse absolute -left-[3px] top-0 h-[7px] w-[7px] rounded-full bg-[#CFEAFF] shadow-[0_0_10px_2px_rgba(120,200,255,0.55)]" />
              </div>

              {/* light sweep, plays once */}
              <div
                aria-hidden="true"
                className="ab-sheen pointer-events-none absolute inset-0 opacity-0 bg-[linear-gradient(105deg,transparent_35%,rgba(154,215,255,0.11)_50%,transparent_65%)]"
              />

              <div aria-hidden="true" className="relative mb-6 flex items-center gap-3 sm:mb-7">
                <span className="text-[9px] tracking-[0.3em] text-[#9AD7FF]/80">
                  ABOUT TECHXETRA
                </span>
                <span className="h-px w-16 bg-gradient-to-r from-[#9AD7FF]/60 to-transparent sm:w-24" />
              </div>

              <TextReveal
                text={aboutInfo.description}
                as="p"
                split="words"
                stagger={0.025}
                duration={0.85}
                y={24}
                rotateX={-15}
                className="relative w-full max-w-[58ch] font-pixel text-[clamp(0.9rem,0.45vw+0.8rem,1.15rem)] leading-[1.9] tracking-[0.005em] text-[#DFE6FF]/85 sm:text-base sm:leading-[1.95] md:text-[1.05rem] lg:text-[clamp(0.9rem,0.35vw+0.75rem,1.1rem)] lg:leading-[1.9] xl:text-[1.15rem] xl:leading-[1.95]"
              />

              <div className="relative mt-7 border-t border-white/10 pt-5 sm:mt-9 sm:pt-6">
                <div className="absolute left-0 top-0 h-px w-20 bg-gradient-to-r from-[#9AD7FF]/60 to-transparent" />

                <TextReveal
                  text={aboutInfo.tagline}
                  as="p"
                  split="chars"
                  stagger={0.025}
                  duration={0.6}
                  y={12}
                  rotateX={-30}
                  delay={0.2}
                  className="max-w-[52ch] font-heading text-[clamp(0.7rem,0.55vw+0.55rem,0.95rem)] uppercase leading-[1.9] tracking-[0.12em] text-[#9AD7FF]/85 sm:tracking-[0.17em] md:text-sm"
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