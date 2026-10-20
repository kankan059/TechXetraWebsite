"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import type { PaymentInstructions, PaymentRecord } from "@/types/api"
import { QRCodeSVG } from "qrcode.react"

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getSecondsLeft(expiresAtMs: number): number {
  return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function PayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [utr, setUtr] = useState("")
  const [utrError, setUtrError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch payment instructions
  const {
    data: instructions,
    isLoading,
    isError,
  } = useQuery<PaymentInstructions>({
    queryKey: ["payment-instructions", id],
    queryFn: () =>
      apiRequest<PaymentInstructions>(
        `/api/purchases/${id}/payment-instructions`
      ),
    refetchOnWindowFocus: false,
  })

  // Start countdown timer
  useEffect(() => {
    if (!instructions) return

    const tick = () => {
      setSecondsLeft(getSecondsLeft(instructions.reservation_expires_at))
    }

    tick()
    timerRef.current = setInterval(tick, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [instructions])

  const isExpired = secondsLeft !== null && secondsLeft <= 0
  const isUrgent = secondsLeft !== null && secondsLeft < 120

  // Submit UTR
  const { mutate: submitPayment, isPending: isSubmitting } = useMutation({
    mutationFn: (transactionId: string) =>
      apiRequest<PaymentRecord>(`/api/purchases/${id}/payment`, {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: JSON.stringify({ transaction_id: transactionId }),
      }),
    onSuccess: () => {
      router.push(`/checkout/${id}/status`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === "UTR_ALREADY_USED") {
          setUtrError(
            "This transaction ID has already been submitted for another payment."
          )
        } else {
          setSubmitError(err.message)
        }
      }
    },
  })

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setUtrError(null)
      setSubmitError(null)

      if (!/^\d{12}$/.test(utr.trim())) {
        setUtrError("Enter a valid 12-digit UPI transaction ID (UTR number).")
        return
      }

      submitPayment(utr.trim())
    },
    [utr, submitPayment]
  )

  // ---------- Render ----------

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (isError || !instructions) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-red-400">
        <p>Failed to load payment instructions. Please go back and try again.</p>
      </div>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 font-[var(--font-gotham-bold)] text-3xl text-white">
          Complete Payment
        </h1>
        <p className="text-sm text-white/50">
          Scan the QR code with any UPI app and submit your UTR number below.
        </p>
      </div>

      {/* Countdown Timer */}
      <div
        className={`mb-6 flex items-center justify-between rounded-xl border px-5 py-3 ${
          isExpired
            ? "border-red-500/40 bg-red-500/10"
            : isUrgent
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-cyan-300/20 bg-cyan-300/5"
        }`}
      >
        <span className="text-sm text-white/60">
          {isExpired ? "Reservation expired" : "Time remaining"}
        </span>
        <span
          className={`font-mono text-xl font-bold tracking-widest ${
            isExpired
              ? "text-red-400"
              : isUrgent
                ? "text-amber-400"
                : "text-cyan-300"
          }`}
        >
          {secondsLeft !== null ? formatCountdown(secondsLeft) : "--:--"}
        </span>
      </div>

      {/* Expired state */}
      {isExpired ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="mb-2 font-[var(--font-gotham-bold)] text-lg text-red-400">
            Reservation Expired
          </p>
          <p className="mb-5 text-sm text-white/50">
            Slots have been released. Please start over.
          </p>
          <button
            onClick={() => router.push("/checkout")}
            className="rounded-xl bg-white/10 px-6 py-3 text-sm text-white transition hover:bg-white/20"
          >
            Start Over
          </button>
        </div>
      ) : (
        <>
          {/* Amount */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="mb-0.5 text-xs uppercase tracking-widest text-white/40">
              Amount to pay
            </p>
            <p className="font-[var(--font-gotham-bold)] text-3xl text-white">
              {instructions.formatted_amount}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Pay to: {instructions.payee_name} ({instructions.upi_vpa})
            </p>
          </div>

          {/* UPI QR */}
          <div className="mb-6 flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-xl">
              <QRCodeSVG
                value={instructions.upi_intent_uri}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-white/40">
              Scan with PhonePe, GPay, Paytm, or any UPI app
            </p>
            <a
              href={instructions.upi_intent_uri}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-5 py-2.5 text-sm text-cyan-300 transition hover:bg-cyan-300/10"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14M5 12l7 7 7-7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Open UPI App
            </a>
          </div>

          {/* Instructions */}
          {instructions.instructions.length > 0 && (
            <ol className="mb-6 space-y-2 text-sm text-white/50">
              {instructions.instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}

          {/* UTR Form */}
          <form onSubmit={handleSubmit} noValidate>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/60">
              UPI Transaction ID (UTR)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
              disabled={isSubmitting}
              placeholder="12-digit UTR number"
              className="mb-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20 disabled:opacity-50"
            />
            {utrError && (
              <p className="mb-3 text-xs text-red-400">{utrError}</p>
            )}
            {submitError && (
              <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || utr.length !== 12}
              className="mt-2 w-full rounded-xl bg-cyan-300 py-4 font-[var(--font-gotham-bold)] text-sm uppercase tracking-widest text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Submitting…" : "Submit UTR & Confirm Payment"}
            </button>
          </form>
        </>
      )}
    </main>
  )
}
