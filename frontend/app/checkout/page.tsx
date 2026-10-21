
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import type { FestCatalog, UserProfile } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function CheckoutPassPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [catalog, setCatalog] = useState<FestCatalog | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgeStudentPolicy, setAcknowledgeStudentPolicy] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const userRes = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
        });

        if (userRes.status === 401) {
          router.push("/login?redirect=/checkout");
          return;
        }

        const userData = await userRes.json();

        if (!userRes.ok || !userData.success) {
          throw new Error(
            userData.error?.message || "Unable to load your profile."
          );
        }

        setUser(userData.data);

        if (!userData.data.profile_complete) {
          router.push("/profile-completion");
          return;
        }

        const catRes = await fetch(`${API_BASE}/api/catalog/passes`, {
          credentials: "include",
        });

        const catData = await catRes.json();

        if (!catRes.ok || !catData.success) {
          throw new Error(
            catData.error?.message || "Unable to load available passes."
          );
        }

        setCatalog(catData.data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load checkout."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [router]);

  useEffect(() => {
    if (loading || !catalog || !user || prefersReducedMotion) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      timeline
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7 }
        )
        .fromTo(
          passRef.current,
          { opacity: 0, y: 32, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8 },
          "-=0.4"
        )
        .fromTo(
          ".checkout-reveal",
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.09,
            clearProps: "transform",
          },
          "-=0.35"
        );
    }, pageRef);

    return () => context.revert();
  }, [loading, catalog, user, prefersReducedMotion]);

  const handlePurchaseGatePass = async () => {
    if (!user || !catalog || submitting) return;

    if (user.is_student && !acknowledgeStudentPolicy) {
      setError(
        "You must acknowledge the student physical ID verification policy."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/purchases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ item_type: "GATE_PASS" }],
          acknowledge_student_id_policy: user.is_student
            ? acknowledgeStudentPolicy
            : false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error?.message || "Could not create pass reservation."
        );
      }

      if (data.data.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(`/checkout/${data.data.id}/pay`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout error.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center  px-5">
        <div className="w-full max-w-2xl animate-pulse space-y-5">
          <div className="h-3 w-32 rounded bg-cyan-300/20" />
          <div className="h-10 w-3/4 rounded-lg bg-white/[0.06]" />
          <div className="h-80 rounded-3xl border border-white/[0.07] bg-white/[0.025]" />
        </div>
      </main>
    );
  }

  if (!catalog || !user) return null;

  const isStudent = user.is_student;
  const pricePaise = isStudent
    ? catalog.gate_pass.student_price_paise
    : catalog.gate_pass.price_paise;
  const priceRupees = (pricePaise / 100).toFixed(0);

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-hidden  px-5 pb-20 pt-28  sm:px-8 sm:pt-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/[0.06] blur-[120px]" />
        <div className="absolute right-[-10rem] top-[30rem] h-80 w-80 rounded-full bg-blue-500/[0.04] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:3rem_3rem]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm text-white/50 transition-colors hover:text-cyan-200"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            Back to home
          </Link>
        </motion.div>

        <div ref={titleRef} className="mb-9">
          <div className="mb-5 flex items-center gap-3">
            <p className="font-pixel text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Festival admission
            </p>
          </div>

          <h1 className="font-heading max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Your pass.
            <span className="block text-white/45">Your TechXetra.</span>
          </h1>

          <p className="font-cta mt-5 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
            Everything you need to be part of three days of technology,
            creativity and innovation.
          </p>

          <p className="mt-4 font-cta text-sm text-white/35">
            {catalog.gate_pass.validity}
          </p>
        </div>

        {error && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm leading-6 text-red-200"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          ref={passRef}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          whileHover={prefersReducedMotion ? undefined : { y: -3 }}
          className="relative rounded-3xl border border-white/[0.10] bg-[#0b1019]/90 p-5 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

          <div className="checkout-reveal flex flex-col justify-between gap-7 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium font-pixel uppercase tracking-[0.18em] text-cyan-200/80">
                {isStudent ? "Student pass" : "General admission"}
              </p>

              <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Full festival access
              </h2>

              <p className="mt-3 font-cta max-w-sm text-sm leading-6 text-white/45">
                Multi-entry access across all three festival days, November
                20-22.
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-4xl font-hero font-semibold tracking-tight sm:text-5xl">
                ₹{priceRupees}
              </p>
              <p className="mt-2 text-xs font-cta text-white/35">INR, inclusive of taxes</p>
            </div>
          </div>

          <div className="checkout-reveal grid grid-cols-2 gap-4 border-b border-white/[0.08] py-6">
            <div>
              <p className="text-xs text-white/35">Access</p>
              <p className="mt-2 text-sm font-medium text-white/85 font-cta">
                All 3 days
              </p>
            </div>
            <div>
              <p className="text-xs text-white/35">Reservation hold</p>
              <p className="mt-2 text-sm font-medium text-white/85 font-cta">
                15 minutes
              </p>
            </div>
          </div>

          {isStudent && (
            <div className="checkout-reveal mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 sm:p-5">
              <p className="text-sm font-pixel font-semibold text-amber-100">
                Student ID verification
              </p>

              <p className="mt-2 text-sm leading-6 text-white/55">
                {catalog.student_id_warning_text}
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/75">
                <input
                  type="checkbox"
                  checked={acknowledgeStudentPolicy}
                  onChange={(e) =>
                    setAcknowledgeStudentPolicy(e.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
                />
                <span>
                  I understand and will bring my physical institution ID card.
                </span>
              </label>
            </div>
          )}

          <div className="checkout-reveal pt-6">
            {!catalog.purchases_enabled ? (
              <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-4 text-center text-sm text-amber-200">
                Ticket sales are currently paused by festival administration.
              </p>
            ) : (
              <motion.button
                type="button"
                disabled={
                  submitting ||
                  (isStudent && !acknowledgeStudentPolicy)
                }
                onClick={handlePurchaseGatePass}
                whileHover={
                  prefersReducedMotion || submitting
                    ? undefined
                    : { scale: 1.01 }
                }
                whileTap={
                  prefersReducedMotion || submitting
                    ? undefined
                    : { scale: 0.985 }
                }
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-cyan-300 px-5 py-4 text-sm font-semibold text-[#071019] transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
                <span className="relative font-hero">
                  {submitting
                    ? "Reserving pass..."
                    : `Proceed to pay ₹${priceRupees}`}
                </span>
                {!submitting && (
                  <span aria-hidden="true" className="relative transition-transform duration-300 group-hover:translate-x-1">
                    
                  </span>
                )}
              </motion.button>
            )}

            <p className="mt-4 text-center text-xs leading-5 text-white/35">
              Your pass reservation holds inventory for 15 minutes during
              checkout.
            </p>
          </div>

      
        </motion.div>

        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-8 text-center text-xs text-white/30"
        >
          TechXetra 2026
        </motion.p>
      </div>
    </main>
  );
}
