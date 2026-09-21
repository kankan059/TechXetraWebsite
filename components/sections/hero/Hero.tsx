"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const lineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {


            gsap.to(titleRef.current, {
                y: -120,
                opacity: 0.25,
                scale: 0.92,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });

            gsap.to(subtitleRef.current, {
                y: -60,
                opacity: 0,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "70% top",
                    scrub: true,
                },
            });

        }, sectionRef);

        gsap.registerPlugin(ScrollTrigger);
        return () => ctx.revert();
    }, []);

    return (
        <section
        id="hero"
            ref={sectionRef}
            className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24 lg:px-10"
        >
            <div className="mx-auto w-full max-w-1400px">
                <div className="max-w-6xl">
                    <p className="mb-6 text-xs uppercase tracking-[0.4em] text-cyan-300/80">
                        Annual Tech Fest
                    </p>

                    <div className="overflow-hidden">
                        <h1
                            ref={titleRef}
                            className="text-[clamp(4rem,12vw,11rem)] font-black uppercase leading-[0.82] tracking-[-0.06em] text-white"
                        >
                            Tech<span className="font-black text-red-500">X</span>etra
                        </h1>
                    </div>

                    <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <p
                            ref={subtitleRef}
                            className="max-w-xl text-sm uppercase leading-7 tracking-[0.18em] text-white/60 md:text-base"
                        >
                            loru , lorem , klaka
                        </p>

                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">
                            2026
                        </p>
                    </div>

                    <div
                        ref={lineRef}
                        className="mt-8 h-px w-full bg-gradient-to-r from-cyan-300 via-cyan-300/40 to-transparent"
                    />
                </div>
            </div>

            <div className="absolute bottom-8 left-6 lg:left-10">
                <div className="flex items-center gap-3">
                    <span className="h-8 w-px bg-cyan-300/60" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                        Scroll
                    </span>
                </div>
            </div>
        </section>
    );
}