"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const SilverFlight = () => {
  const flightRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGGElement>(null);
  const particlesRef = useRef<SVGGElement>(null);
  const engineRef = useRef<SVGEllipseElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    const flight = flightRef.current;
    const trail = trailRef.current;
    const particles = particlesRef.current;
    const engine = engineRef.current;
    const core = coreRef.current;

    if (!flight || !trail || !particles || !engine || !core) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;

      const getStartX = () => -flight.offsetWidth - 100;
      const getEndX = () => window.innerWidth + 100;

      gsap.set(flight, {
        x: getStartX(),
        y: 20,
        rotation: -7,
        scale: mobile ? 0.72 : 1,
        opacity: 0,
        transformOrigin: "50% 50%",
      });

      gsap.set(trail, { opacity: 0 });
      gsap.set(particles.children, { opacity: 0 });

      const flightTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 3.2,
        delay: 1.5,
      });

      flightTimeline
        .set(flight, {
          x: getStartX(),
          y: 20,
          opacity: 0,
        })
        .set(trail, { opacity: 0 })
        .to(
          flight,
          {
            opacity: 1,
            duration: 0.18,
            ease: "power1.out",
          },
          0
        )
        .to(
          trail,
          {
            opacity: 1,
            duration: 0.3,
          },
          0.05
        )
        .to(
          flight,
          {
            x: getEndX(),
            y: -35,
            duration: 2.5,
            ease: "power2.inOut",
          },
          0
        )
        .to(
          flight,
          {
            rotation: -3,
            duration: 1.15,
            ease: "sine.inOut",
          },
          0.2
        )
        .to(
          flight,
          {
            rotation: -9,
            duration: 1.15,
            ease: "sine.inOut",
          },
          1.35
        )
        .to(
          flight,
          {
            opacity: 0,
            duration: 0.25,
            ease: "power2.in",
          },
          2.25
        )
        .to(
          trail,
          {
            opacity: 0,
            duration: 0.3,
          },
          2.2
        );

      // Engine glow pulses while the spacecraft is visible.
      gsap.to(engine, {
        opacity: 0.5,
        attr: { rx: 17 },
        duration: 0.22,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(core, {
        attr: { r: 5 },
        opacity: 0.65,
        duration: 0.3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Small particles travel along the wake.
      Array.from(particles.children).forEach((particle, index) => {
        const delay = index * 0.075;

        gsap.fromTo(
          particle,
          {
            x: -12,
            y: index % 2 === 0 ? -4 : 4,
            opacity: 0,
            scale: 0.4,
          },
          {
            x: 14,
            y: index % 2 === 0 ? 5 : -5,
            opacity: 0.9,
            scale: 1,
            duration: 0.55 + (index % 3) * 0.12,
            repeat: -1,
            repeatDelay: 0.15,
            delay,
            ease: "power1.out",
            yoyo: true,
          }
        );
      });
    }, flight);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={flightRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-[48%] z-[5] w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px]"
    >
      <svg
        viewBox="0 0 500 150"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient
            id="sf-chrome"
            x1="265"
            y1="22"
            x2="345"
            y2="128"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.17" stopColor="#8295A8" />
            <stop offset="0.34" stopColor="#F7FCFF" />
            <stop offset="0.53" stopColor="#9BAFC1" />
            <stop offset="0.72" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#60788E" />
          </linearGradient>

          <linearGradient
            id="sf-wing"
            x1="300"
            y1="30"
            x2="355"
            y2="120"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#DDF8FF" />
            <stop offset="0.45" stopColor="#70899F" />
            <stop offset="1" stopColor="#F9FDFF" />
          </linearGradient>

          <linearGradient
            id="sf-wake"
            x1="8"
            y1="75"
            x2="315"
            y2="75"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#12BFFF" stopOpacity="0" />
            <stop offset="0.45" stopColor="#18AFFF" stopOpacity="0.16" />
            <stop offset="0.8" stopColor="#79E8FF" stopOpacity="0.65" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient
            id="sf-engine"
            x1="245"
            y1="75"
            x2="310"
            y2="75"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#087DFF" stopOpacity="0" />
            <stop offset="0.55" stopColor="#27C8FF" stopOpacity="0.65" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>

          <filter id="sf-glow" x="-60%" y="-100%" width="220%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sf-soft-glow" x="-60%" y="-100%" width="220%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Layered energy wake */}
        <g ref={trailRef}>
          <path
            d="M 5 75 L 301 62 L 330 75 L 301 88 Z"
            fill="url(#sf-wake)"
            filter="url(#sf-soft-glow)"
          />

          <path
            d="M 15 75 L 305 74"
            stroke="#B4F5FF"
            strokeWidth="1.4"
            strokeOpacity="0.9"
          />

          <path
            d="M 40 64 L 268 72"
            stroke="#26AFFF"
            strokeWidth="1"
            strokeOpacity="0.65"
          />

          <path
            d="M 65 87 L 280 78"
            stroke="#64DFFF"
            strokeWidth="0.8"
            strokeOpacity="0.55"
          />

          <path
            d="M 125 57 L 290 70"
            stroke="#FFFFFF"
            strokeWidth="0.6"
            strokeOpacity="0.45"
          />

          <path
            d="M 105 94 L 282 80"
            stroke="#FFFFFF"
            strokeWidth="0.6"
            strokeOpacity="0.3"
          />
        </g>

        {/* Spark particles */}
        <g ref={particlesRef} filter="url(#sf-glow)">
          <circle cx="145" cy="69" r="1.7" fill="#FFFFFF" />
          <circle cx="175" cy="81" r="1.2" fill="#69DEFF" />
          <circle cx="205" cy="71" r="2" fill="#C9F8FF" />
          <circle cx="225" cy="83" r="1.2" fill="#FFFFFF" />
          <circle cx="250" cy="67" r="1.5" fill="#46CFFF" />
          <circle cx="270" cy="79" r="1.1" fill="#FFFFFF" />
          <circle cx="190" cy="91" r="0.9" fill="#65D8FF" />
          <circle cx="115" cy="78" r="1.2" fill="#FFFFFF" />
        </g>

        {/* Engine exhaust */}
        <g filter="url(#sf-glow)">
          <path
            d="M 244 75 L 310 68 L 310 82 Z"
            fill="url(#sf-engine)"
          />

          <ellipse
            ref={engineRef}
            cx="292"
            cy="75"
            rx="12"
            ry="4"
            fill="#2FCBFF"
            opacity="0.8"
            filter="url(#sf-soft-glow)"
          />
        </g>

        {/* Sharp metallic spacecraft */}
        <g strokeLinejoin="round">
          {/* Rear stabilizers */}
          <path
            d="M 291 66 L 314 39 L 337 64 L 316 70 Z"
            fill="url(#sf-wing)"
            stroke="#E5F8FF"
            strokeWidth="1"
          />

          <path
            d="M 291 84 L 314 111 L 337 86 L 316 80 Z"
            fill="url(#sf-wing)"
            stroke="#E5F8FF"
            strokeWidth="1"
          />

          {/* Main blade body */}
          <path
            d="M 267 75 L 335 20 L 318 65 L 390 75 L 318 85 L 335 130 Z"
            fill="url(#sf-chrome)"
            stroke="#DFF7FF"
            strokeWidth="1.2"
          />

          {/* Upper faceted panel */}
          <path
            d="M 267 75 L 335 20 L 318 65 Z"
            fill="#8CA2B6"
            fillOpacity="0.92"
          />

          <path
            d="M 335 20 L 318 65 L 350 70 Z"
            fill="#FFFFFF"
            fillOpacity="0.88"
          />

          {/* Lower facets */}
          <path
            d="M 267 75 L 335 130 L 318 85 Z"
            fill="#70879C"
            fillOpacity="0.88"
          />

          <path
            d="M 335 130 L 318 85 L 350 80 Z"
            fill="#EAF8FF"
            fillOpacity="0.9"
          />

          {/* Center blade */}
          <path
            d="M 267 75 L 318 65 L 390 75 L 318 85 Z"
            fill="#FFFFFF"
          />

          <path
            d="M 279 75 L 318 70 L 359 75 L 318 80 Z"
            fill="#9CAFC0"
            fillOpacity="0.65"
          />

          {/* Fine illuminated panel lines */}
          <path
            d="M 295 54 L 319 68 L 350 72"
            stroke="#FFFFFF"
            strokeWidth="1"
            strokeOpacity="0.9"
          />

          <path
            d="M 295 96 L 319 82 L 350 78"
            stroke="#A6EDFF"
            strokeWidth="1"
            strokeOpacity="0.9"
          />

          <path
            d="M 318 65 L 390 75 L 318 85"
            stroke="#FFFFFF"
            strokeWidth="1.3"
          />

          {/* Energy core */}
          <path
            d="M 290 75 L 316 71 L 333 75 L 316 79 Z"
            fill="#27CFFF"
          />

          <circle
            ref={coreRef}
            cx="318"
            cy="75"
            r="3.8"
            fill="#FFFFFF"
            filter="url(#sf-glow)"
          />
        </g>
      </svg>
    </div>
  );
};

export default SilverFlight;