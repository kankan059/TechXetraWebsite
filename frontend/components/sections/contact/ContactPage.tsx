
"use client";

import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import SectionTitle from "@/components/ui/SectionTitle";

gsap.registerPlugin(ScrollTrigger);

const contactDetails = [
  {
    title: "General Enquiries",
    description: "Questions about TechXetra, registration or the event.",
    email: "general",
  },
  {
    title: "Sponsorship",
    description: "Interested in partnering with our technology festival?",
    email: "sponsorship",
  },
  {
    title: "Technical Support",
    description: "Need help with the website or registration process?",
    email: "support",
  },
];

export default function ContactPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Connect the form to your API or email service before enabling submissions.
    setSubmitted(true);
  }

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reducedMotion) return;

      gsap.fromTo(
        ".contact-intro",
        { autoAlpha: 0, y: 28 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".contact-intro",
            start: "top 85%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".contact-card",
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".contact-cards",
            start: "top 85%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".contact-form-panel",
        { autoAlpha: 0, x: 35 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".contact-form-panel",
            start: "top 85%",
            once: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-20 text-white sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-20 size-96 rounded-full bg-[#55DFFF]/[0.06] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Intro */}
        <header className="contact-intro mb-16 sm:mb-20 lg:mb-24">
          <SectionTitle title="Contact Us" />

          <div className="mt-10 max-w-4xl">
            <p className="font-autotech text-sm uppercase tracking-[0.22em] text-[#55DFFF] sm:text-base">
              Have an idea? Let&apos;s talk.
            </p>

            <h1 className="mt-5 font-heading text-4xl leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              LET&apos;S{" "}
              <span className="text-[#55DFFF]">CONNECT.</span>
            </h1>

            <p className="mt-6 max-w-2xl font-pixel text-sm leading-7 text-white/55 sm:text-base sm:leading-8">
              Got a question, an exciting idea, or want to be part of
              TechXetra? We&apos;d love to hear from you. Reach out to our
              team and let&apos;s make something extraordinary happen.
            </p>
          </div>
        </header>

        {/* Contact categories */}
        <div className="contact-cards mb-20 grid gap-4 sm:mb-28 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {contactDetails.map((item, index) => (
            <article
              key={item.email}
              className="contact-card group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors duration-300 hover:border-[#55DFFF]/40 hover:bg-[#55DFFF]/[0.04] sm:p-8"
            >
              <p className="font-autotech text-sm tracking-wider text-[#55DFFF]">
                0{index + 1}
              </p>

              <h2 className="mt-8 font-heading text-xl sm:text-2xl">
                {item.title}
              </h2>

              <p className="mt-4 font-pixel text-sm leading-7 text-white/50 sm:text-base">
                {item.description}
              </p>

              <div className="mt-7 h-px w-full bg-white/10 transition-colors duration-300 group-hover:bg-[#55DFFF]/40" />

              <p className="mt-5 font-autotech text-sm text-white/40">
                CONTACT CATEGORY
              </p>
            </article>
          ))}
        </div>

        {/* Form section */}
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="contact-intro lg:sticky lg:top-28">
            <p className="font-autotech text-sm uppercase tracking-[0.2em] text-[#55DFFF]">
              Your next move starts here
            </p>

            <h2 className="mt-5 font-heading text-3xl leading-tight sm:text-4xl lg:text-5xl">
              SEND US A
              <br />
              MESSAGE.
            </h2>

            <p className="mt-6 max-w-lg font-pixel text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
              Tell us what&apos;s on your mind. Whether it&apos;s a
              collaboration, a question, or a new opportunity, our team is
              ready to listen.
            </p>

            <div className="mt-10 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#55DFFF] shadow-[0_0_12px_rgba(85,223,255,0.8)]" />

              <span className="font-autotech text-sm tracking-wider text-white/50">
                TECHXETRA · TEZPUR UNIVERSITY
              </span>
            </div>
          </div>

          <div className="contact-form-panel rounded-2xl border border-white/10 bg-[#080808] p-5 sm:p-8 lg:p-10">
            {submitted ? (
              <div
                role="status"
                className="flex min-h-80 flex-col justify-center"
              >
                <p className="font-autotech text-sm uppercase tracking-widest text-[#55DFFF]">
                  Form interaction complete
                </p>

                <h3 className="mt-5 font-heading text-2xl sm:text-3xl">
                  One more step.
                </h3>

                <p className="mt-4 font-pixel text-sm leading-7 text-white/50 sm:text-base">
                  The form still needs an API or email service to deliver
                  your message. No message has been sent yet.
                </p>

                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-8 w-fit font-autotech text-sm text-[#55DFFF] transition-opacity hover:opacity-70"
                >
                  BACK TO FORM
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-3 block font-autotech text-sm text-white/70"
                    >
                      YOUR NAME
                    </label>

                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your name"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 font-pixel text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#55DFFF]/60 sm:text-base"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-3 block font-autotech text-sm text-white/70"
                    >
                      EMAIL ADDRESS
                    </label>

                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 font-pixel text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#55DFFF]/60 sm:text-base"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="mb-3 block font-autotech text-sm text-white/70"
                  >
                    WHAT&apos;S THIS ABOUT?
                  </label>

                  <select
                    id="contact-subject"
                    name="subject"
                    defaultValue=""
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0D] px-4 py-4 font-pixel text-sm text-white outline-none transition-colors focus:border-[#55DFFF]/60 sm:text-base"
                  >
                    <option value="" disabled>
                      Select a topic
                    </option>
                    <option value="general">General Enquiry</option>
                    <option value="sponsorship">Sponsorship</option>
                    <option value="registration">Registration</option>
                    <option value="technical">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="mb-3 block font-autotech text-sm text-white/70"
                  >
                    YOUR MESSAGE
                  </label>

                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Tell us a little about your enquiry..."
                    required
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 font-pixel text-sm leading-7 text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#55DFFF]/60 sm:text-base"
                  />
                </div>

                <button
                  type="submit"
                  className="group flex w-full items-center justify-between rounded-xl bg-[#55DFFF] px-5 py-4 font-autotech text-sm tracking-wider text-black transition-colors duration-300 hover:bg-white sm:px-6"
                >
                  <span>SEND MESSAGE</span>

                  <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </button>

                <p className="font-pixel text-xs leading-6 text-white/35 sm:text-sm">
                  Your message will be ready for submission once the contact
                  API or email service is connected.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-24 border-t border-white/10 pt-8 sm:mt-32 sm:pt-10">
          <p className="font-pixel text-sm leading-7 text-white/40 sm:text-base">
            Three days. New ideas. One shared future.
          </p>

          <p className="mt-3 font-heading text-xl text-[#55DFFF] sm:text-2xl">
            See you at TechXetra.
          </p>
        </div>
      </div>
    </section>
  );
}
