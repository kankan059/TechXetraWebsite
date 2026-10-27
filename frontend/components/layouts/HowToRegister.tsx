
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Complete your profile",
    description:
      "Add your personal and academic details. Make sure your information is correct before registering.",
  },
  {
    number: "02",
    title: "Explore events",
    description:
      "Browse the available TechXetra events and choose the one you want to participate in.",
  },
  {
    number: "03",
    title: "Register for an event",
    description:
      "Open your chosen event and follow the registration instructions shown on its page.",
  },
  {
    number: "04",
    title: "Check your registration",
    description:
      "Visit your Registrations page to review your registration status and related details.",
  },
  {
    number: "05",
    title: "Access your digital pass",
    description:
      "If a pass is issued for your registration, open My Digital Passes to view your pass and QR code. Follow any event-specific entry instructions.",
  },
];

export default function HowToRegister() {
  return (
    <section
      aria-labelledby="how-to-register-title"
      className="relative isolate overflow-hidden border border-[#55DFFF]/20 bg-white/[0.02] p-5 sm:p-7 lg:p-9"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 -z-10 size-64 rounded-full bg-cyan-400/[0.07] blur-[100px]"
      />

      <div className="max-w-2xl">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Quick guide
        </p>

        <h2
          id="how-to-register-title"
          className="mt-3 font-[var(--font-gotham-bold)] text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          How to register for an event
        </h2>

        <p className="mt-3 font-sans text-sm leading-6 text-white/60">
          New to TechXetra? Follow these steps to get started, from setting up
          your profile to finding your digital pass.
        </p>
      </div>

      <ol className="mt-8 space-y-0">
        {steps.map((step, index) => (
          <li
            key={step.number}
            className="relative flex gap-4 pb-7 last:pb-0 sm:gap-5"
          >
            {index !== steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-[17px] top-9 w-px bg-gradient-to-b from-cyan-300/40 to-white/5"
              />
            )}

            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center border border-cyan-300/30 bg-[#07121B] font-sans text-xs font-semibold text-cyan-300">
              {step.number}
            </span>

            <div className="min-w-0 pt-0.5">
              <h3 className="font-[var(--font-gotham-bold)] text-base font-semibold text-white">
                {step.title}
              </h3>

              <p className="mt-1.5 max-w-2xl font-sans text-sm leading-6 text-white/60">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#55DFFF] px-5 py-3 font-sans text-sm font-semibold text-[#041018] transition-colors hover:bg-[#8BEAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07121B]"
        >
          Explore events
          <span aria-hidden="true">→</span>
        </Link>

        <Link
          href="/registrations"
          className="inline-flex min-h-11 items-center justify-center border border-white/15 px-5 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:border-cyan-300/40 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          View my registrations
        </Link>
      </div>
    </section>
  );
}
