"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TeamCard from "@/components/sections/team/TeamCard";
import { teamGroups } from "@/data/team";

gsap.registerPlugin(ScrollTrigger);

type FieldNode = { x: number; y: number; py: number; vx: number; vy: number; z: number; r: number };

function ConstellationField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let nodes: FieldNode[] = [];
    const pointer = { x: -9999, y: -9999 };

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cap = w < 700 ? 36 : 68;
      const count = Math.round(Math.min(cap, Math.max(22, (w * h) / 21000)));

      nodes = Array.from({ length: count }, () => {
        const y = Math.random() * h;
        return {
          x: Math.random() * w,
          y,
          py: y,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          z: 0.35 + Math.random() * 0.65,
          r: 0.6 + Math.random() * 1.4,
        };
      });
    };

    const draw = (dt: number, time: number) => {
      ctx.clearRect(0, 0, w, h);
      const scrollY = window.scrollY;
      const link = Math.min(Math.max(Math.min(w, h) * 0.2, 90), 160);
      const link2 = link * link;

      for (const n of nodes) {
        n.x += n.vx * dt * n.z;
        n.y += n.vy * dt * n.z;
        if (n.x < -10) n.x = w + 10;
        else if (n.x > w + 10) n.x = -10;
        if (n.y < 0) n.y += h;
        else if (n.y > h) n.y -= h;
        n.py = (((n.y - scrollY * 0.14 * n.z) % h) + h) % h;
      }

      ctx.lineWidth = 0.7;

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.py - b.py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const alpha = (1 - d2 / link2) * 0.32 * Math.min(a.z, b.z) * 1.4;
          ctx.strokeStyle = `rgba(150,195,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.py);
          ctx.lineTo(b.x, b.py);
          ctx.stroke();
        }
      }

      if (pointer.x > -999) {
        const reach = link * 1.4;
        const reach2 = reach * reach;
        for (const n of nodes) {
          const dx = n.x - pointer.x;
          const dy = n.py - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= reach2) continue;
          const alpha = (1 - d2 / reach2) * 0.45;
          ctx.strokeStyle = `rgba(205,228,255,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.py);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0011 + n.x);
        const alpha = (0.3 + 0.52 * n.z) * twinkle;
        ctx.fillStyle = `rgba(225,238,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.py, n.r * n.z + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 16.67, 3);
      last = ts;
      draw(dt, ts);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };

    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        setup();
        if (reduce) draw(0, 0);
      });
    });

    setup();
    if (reduce) draw(0, 0);
    else start();

    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer && !reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Team = () => {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = gsap.matchMedia();

    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const hero = root.querySelector<HTMLElement>("[data-hero]");
        const inner = root.querySelector<HTMLElement>("[data-hero-inner]");

        if (hero && inner) {
          gsap.from(Array.from(inner.children), {
            y: 30,
            opacity: 0,
            duration: 1,
            stagger: 0.09,
            ease: "power3.out",
          });

          gsap.to(inner, {
            yPercent: -8,
            opacity: 0.15,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        const heads = gsap.utils.toArray<HTMLElement>("[data-group-head]");
        heads.forEach((head) => {
          gsap.fromTo(
            head,
            { y: 34, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: head,
                start: "top 94%",
                end: "top 66%",
                scrub: 0.8,
              },
            }
          );
        });

        const cards = gsap.utils.toArray<HTMLElement>("[data-member]");
        gsap.set(cards, { y: 44, opacity: 0 });

        ScrollTrigger.batch(cards, {
          start: "top 95%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.08,
              ease: "power3.out",
              overwrite: true,
              clearProps: "transform,opacity",
            });
          },
        });
      },
      root
    );

    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(frame);
      media.revert();
    };
  }, []);

  return (
    <main
      ref={rootRef}
      className="relative isolate min-h-dvh w-full overflow-x-clip bg-black text-white [font-family:var(--font-gotham-book)]"
    >
      {/* Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#0a1430_0%,#04060f_54%,#000000_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_62%,rgba(85,223,255,0.12)_0%,transparent_58%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.05)_38%,rgba(0,0,0,0.15)_64%,rgba(0,0,0,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_52%,rgba(0,0,0,0.62)_100%)]" />
          <ConstellationField />
        </div>
      </div>

      {/* Hero */}
      <header
        data-hero
        className="relative flex min-h-[62svh] flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-32 text-center sm:px-8"
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(120vw,900px)] w-[min(120vw,900px)] -translate-x-1/2 -translate-y-1/2 opacity-40">
          <div className="h-full w-full animate-[spin_150s_linear_infinite] motion-reduce:animate-none">
            <svg viewBox="0 0 400 400" fill="none" className="h-full w-full">
              <circle cx="200" cy="200" r="190" stroke="#8FB4FF" strokeOpacity="0.3" strokeDasharray="1 7" />
              <circle cx="200" cy="200" r="142" stroke="#8FB4FF" strokeOpacity="0.2" strokeDasharray="2 11" />
              <circle cx="390" cy="200" r="3" fill="#CFE0FF" />
              <circle cx="58" cy="262" r="2.2" fill="#CFE0FF" />
            </svg>
          </div>
        </div>

        <div data-hero-inner className="relative flex w-full max-w-3xl flex-col items-center">
          <p className="mb-6 text-[9px] uppercase tracking-[0.34em] text-[#A9B5E8]/85 sm:text-[10px] [font-family:var(--font-pixel)]">
            TechXetra 2026
          </p>

          <h1 className="m-0 bg-gradient-to-b from-white via-[#D4D5DE] to-[#5E6272] bg-clip-text text-[clamp(2.8rem,10vw,7rem)] font-normal leading-[0.98] tracking-[-0.055em] text-transparent [font-family:var(--font-roboto)]">
            Meet the Team
          </h1>

          <p className="mt-6 max-w-[48ch] text-sm leading-[1.8] text-white/70 sm:text-base">
            The people who plan, build and run TechXetra.
          </p>

          <nav aria-label="Team groups" className="mt-9 flex max-w-full flex-wrap justify-center gap-2">
            {teamGroups.map((group) => (
              <a
                key={group.title}
                href={`#${slugify(group.title)}`}
                className="inline-flex font-roboto min-h-10 items-center rounded-full border border-[#BED6FF]/20 px-4 text-xs text-white/80 transition-colors hover:border-[#55DFFF]/70 hover:bg-[#55DFFF]/[0.08] hover:text-[#8BEAFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF]"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-5 pb-28 pt-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="space-y-24">
          {teamGroups.map((group) => (
            <section key={group.title} id={slugify(group.title)} className="scroll-mt-28">
              <div
                data-group-head
                className="mb-10 flex items-end justify-between gap-4 border-b border-[#BED6FF]/15 pb-5"
              >
                <div className="min-w-0">
                  <h2 className="text-2xl uppercase tracking-[0.04em] text-[#55DFFF] sm:text-3xl lg:text-4xl [font-family:var(--font-roboto)]">
                    {group.title}
                  </h2>

                  {group.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                      {group.description}
                    </p>
                  )}
                </div>

                <span
                  aria-hidden="true"
                  className="hidden h-px w-24 shrink-0 bg-gradient-to-r from-[#55DFFF] to-transparent sm:block"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-8">
                {group.members.map((member) => (
                  <div
                    key={`${group.title}-${member.name}`}
                    data-member
                    className="w-full max-w-[320px] font-heading"
                  >
                    <TeamCard
                      name={member.name}
                      title={member.role}
                      email={member.email}
                      instagram={member.insta}
                      handle={member.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "")}
                      status={group.showContact ? "Core Team" : "Team Member"}
                      contactText="Email"
                      avatarUrl={member.image}
                      iconUrl="assets/logo1.png"
                      holo={0}
                      glare={0.3}
                      tiltStrength={16}
                      parallax={9}
                      radius={14}
                      enableTilt
                      intro
                      showUserInfo
                      enableMobileTilt
                      theme="dark"
                      onContactClick={() => {
                        if (group.showContact && member.email) {
                          window.location.href = `mailto:${member.email}`;
                        } else if (group.showContact && member.phone) {
                          window.location.href = `tel:${member.phone}`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Team;