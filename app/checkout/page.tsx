"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { ProfileCompletionModal } from "@/components/auth/ProfileCompletionModal"
import type { FestCatalog, PurchaseDetail } from "@/types/api"
import { useRouter } from "next/navigation"

function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [acknowledgedPolicy, setAcknowledgedPolicy] = useState(false)

  const { data: catalog, isLoading: catalogLoading } = useQuery<FestCatalog>({
    queryKey: ["catalog", "passes"],
    queryFn: () => apiRequest<FestCatalog>("/api/catalog/passes"),
  })

  const isStudent = user?.is_student ?? false
  const pricePaise = isStudent
    ? (catalog?.gate_pass.student_price_paise ?? catalog?.gate_pass.price_paise ?? 0)
    : (catalog?.gate_pass.price_paise ?? 0)

  const { mutate: createPurchase, isPending } = useMutation({
    mutationFn: () => {
      const idempotencyKey = crypto.randomUUID()
      return apiRequest<PurchaseDetail>("/api/purchases", {
        method: "POST",
        idempotencyKey,
        body: JSON.stringify({
          items: [{ item_type: "GATE_PASS" }],
          acknowledge_student_id_policy: true,
        }),
      })
    },
    onSuccess: (data) => {
      router.push(`/checkout/${data.id}/pay`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === "PROFILE_INCOMPLETE") {
          setShowProfileModal(true)
        } else if (err.code === "CAPACITY_FULL") {
          setApiError("Sorry! Gate passes are completely sold out.")
        } else {
          setApiError(err.message)
        }
      }
    },
  })

  if (authLoading || catalogLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-white/50">
        <p>Please sign in to purchase a Gate Pass.</p>
      </div>
    )
  }

  const festDays = catalog?.fest_days ?? []

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-lg px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
        <h1 className="mb-2 font-[var(--font-gotham-bold)] text-3xl text-white">
          Checkout
        </h1>
        <p className="mb-8 text-sm text-white/50">
          Review your order before proceeding to payment.
        </p>

        {/* Gate Pass Card */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/5">
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-widest text-cyan-400">
                Gate Pass
              </p>
              <h2 className="font-[var(--font-gotham-bold)] text-lg text-white">
                {catalog?.gate_pass.validity ?? "3-Day Festival Pass"}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Unlimited gate entries for all 3 days of TechXetra.
              </p>
            </div>
            <div className="text-right">
              <p className="font-[var(--font-gotham-bold)] text-xl text-white">
                {formatPaise(pricePaise)}
              </p>
              {isStudent && catalog?.gate_pass.student_price_paise && (
                <p className="text-[10px] text-emerald-400">Student price</p>
              )}
            </div>
          </div>

          {/* Fest days */}
          {festDays.length > 0 && (
            <div className="border-t border-cyan-300/10 px-5 py-4">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
                Fest Schedule
              </p>
              <div className="flex flex-wrap gap-3">
                {festDays.map((day) => (
                  <div
                    key={day.day_number}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center"
                  >
                    <p className="text-[10px] text-white/40">Day {day.day_number}</p>
                    <p className="text-sm font-medium text-white">{day.date}</p>
                    {day.description && (
                      <p className="text-[10px] text-white/40">{day.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student ID policy warning */}
        {catalog?.student_id_warning_text && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            ⚠️ {catalog.student_id_warning_text}
          </div>
        )}

        {/* Order summary */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Gate Pass × 1</span>
            <span>{formatPaise(pricePaise)}</span>
          </div>
          <div className="mt-3 border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="font-[var(--font-gotham-bold)] text-white">
              Total
            </span>
            <span className="font-[var(--font-gotham-bold)] text-xl text-white">
              {formatPaise(pricePaise)}
            </span>
          </div>
        </div>

        {/* Policy acknowledgement */}
        <label className="mb-6 flex cursor-pointer items-start gap-3 text-sm text-white/60">
          <input
            type="checkbox"
            checked={acknowledgedPolicy}
            onChange={(e) => setAcknowledgedPolicy(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-300"
          />
          <span>
            I understand that payment is via manual UPI transfer and my pass will
            be activated after admin verification (typically within a few hours).
          </span>
        </label>

        {apiError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {apiError}
          </div>
        )}

        <button
          onClick={() => createPurchase()}
          disabled={isPending || !acknowledgedPolicy}
          className="w-full rounded-xl bg-cyan-300 py-4 font-[var(--font-gotham-bold)] text-sm uppercase tracking-widest text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Creating reservation…" : "Reserve & Proceed to Payment"}
        </button>
        <p className="mt-3 text-center text-xs text-white/30">
          You have 15 minutes to complete payment after reserving.
        </p>
      </main>

      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  )
}
