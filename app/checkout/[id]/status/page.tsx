"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"
import type { PurchaseDetail } from "@/types/api"
import Link from "next/link"

export default function PaymentStatusPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { data: purchase, isLoading } = useQuery<PurchaseDetail>({
    queryKey: ["purchase", id],
    queryFn: () => apiRequest<PurchaseDetail>(`/api/purchases/${id}`),
    // Poll every 10 s while in PENDING_VERIFICATION
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "AWAITING_PAYMENT" || status === "PENDING_VERIFICATION") {
        return 10_000
      }
      return false
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  const status = purchase?.status

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
      {status === "PAID" ? (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-400/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-emerald-400">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-center font-[var(--font-gotham-bold)] text-3xl text-white">
            Payment Confirmed!
          </h1>
          <p className="mb-8 text-center text-sm text-white/50">
            Your passes have been issued. Go to My Tickets to view your QR codes.
          </p>
          <Link
            href="/me/tickets"
            className="rounded-xl bg-cyan-300 px-8 py-4 font-[var(--font-gotham-bold)] text-sm uppercase tracking-widest text-black transition hover:bg-cyan-200"
          >
            View My Tickets
          </Link>
        </>
      ) : status === "PENDING_VERIFICATION" || status === "AWAITING_PAYMENT" ? (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-400/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-amber-400">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mb-2 text-center font-[var(--font-gotham-bold)] text-3xl text-white">
            Payment Under Review
          </h1>
          <p className="mb-3 text-center text-sm text-white/50">
            Our team is verifying your UPI transaction. This usually takes a few hours.
          </p>
          <p className="mb-8 text-center text-xs text-white/30">
            This page auto-refreshes every 10 seconds.
          </p>
          <div className="flex h-2 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="animate-[pulse_2s_ease-in-out_infinite] h-full w-1/2 rounded-full bg-amber-400" />
          </div>
        </>
      ) : status === "EXPIRED" || status === "CANCELLED" ? (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-400 bg-red-400/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-red-400">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mb-2 text-center font-[var(--font-gotham-bold)] text-2xl text-white">
            {status === "EXPIRED" ? "Reservation Expired" : "Order Cancelled"}
          </h1>
          <p className="mb-8 text-center text-sm text-white/50">
            Your reservation was not completed in time. Please start a new order.
          </p>
          <Link
            href="/checkout"
            className="rounded-xl bg-white/10 px-8 py-4 text-sm text-white transition hover:bg-white/20"
          >
            Try Again
          </Link>
        </>
      ) : (
        <p className="text-white/40">Loading status…</p>
      )}
    </main>
  )
}
