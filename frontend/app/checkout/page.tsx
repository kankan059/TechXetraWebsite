"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Shield,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { FestCatalog, UserProfile } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function CheckoutPassPage() {
  const router = useRouter();

  const [catalog, setCatalog] = useState<FestCatalog | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acknowledgeStudentPolicy, setAcknowledgeStudentPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch user profile
        const userRes = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
        if (userRes.status === 401) {
          router.push("/login?redirect=/checkout");
          return;
        }
        const userData = await userRes.json();
        if (userData.success) {
          setUser(userData.data);
          if (!userData.data.profile_complete) {
            router.push("/profile-completion");
            return;
          }
        }

        // 2. Fetch catalog passes
        const catRes = await fetch(`${API_BASE}/api/catalog/passes`, { credentials: "include" });
        const catData = await catRes.json();
        if (catData.success) {
          setCatalog(catData.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load pass checkout");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [router]);

  const handlePurchaseGatePass = async () => {
    if (!user || !catalog) return;

    if (user.is_student && !acknowledgeStudentPolicy) {
      setError("You must acknowledge the student physical ID verification policy.");
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
          acknowledge_student_id_policy: user.is_student ? acknowledgeStudentPolicy : false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Could not create pass reservation");
      }

      if (data.data.status === "PAID") {
        router.push("/dashboard");
      } else {
        router.push(`/checkout/${data.data.id}/pay`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout error");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
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
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Title Banner */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            FESTIVAL ADMISSION
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
            TechXetra 2026 Gate Pass
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {catalog.gate_pass.validity}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Pass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                {isStudent ? "STUDENT DISCOUNT TIER" : "GENERAL ATTENDEE TIER"}
              </span>
              <h2 className="mt-3 text-2xl font-bold text-white">Full Festival Access</h2>
              <p className="mt-1 text-xs text-white/50">
                Grants multi-entry entry across all 3 festival days (Nov 6–8).
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-3xl font-extrabold text-white">₹{priceRupees}</p>
              <p className="text-[11px] text-white/40">INR incl. taxes</p>
            </div>
          </div>

          {/* Student Policy Confirmation */}
          {isStudent && (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-200">Student ID Verification Required</p>
                  <p className="mt-1 leading-relaxed text-amber-200/80">
                    {catalog.student_id_warning_text}
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 font-medium text-white">
                    <input
                      type="checkbox"
                      checked={acknowledgeStudentPolicy}
                      onChange={(e) => setAcknowledgeStudentPolicy(e.target.checked)}
                      className="h-4 w-4 rounded accent-cyan-400"
                    />
                    <span>I understand and will bring my physical institution ID card.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Checkout CTA */}
          <div className="mt-8 border-t border-white/10 pt-6">
            {!catalog.purchases_enabled ? (
              <p className="text-center text-sm text-amber-300">
                Ticket sales are currently paused by festival administration.
              </p>
            ) : (
              <button
                type="button"
                disabled={submitting || (isStudent && !acknowledgeStudentPolicy)}
                onClick={handlePurchaseGatePass}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 py-4 text-sm font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Reserving Pass..." : `Proceed to Pay ₹${priceRupees}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <p className="mt-3 text-center text-[11px] text-white/40">
              Pass holds inventory slots for 15 minutes during checkout.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
