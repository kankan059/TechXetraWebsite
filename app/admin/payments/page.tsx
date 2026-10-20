"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { PaymentRecord } from "@/types/api"

// --------------------------------------------------------------------------
// Types for the admin queue
// --------------------------------------------------------------------------

interface AdminPaymentQueueItem extends PaymentRecord {
  buyer_name: string
  buyer_email: string
  purchase_total_paise: number
  submitted_at: number
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

function formatTimestamp(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms))
}

// --------------------------------------------------------------------------
// Rejection Modal
// --------------------------------------------------------------------------

interface RejectModalProps {
  payment: AdminPaymentQueueItem
  onClose: () => void
  onConfirm: (reason: string, cancelReservation: boolean) => void
  isPending: boolean
}

function RejectModal({ payment, onClose, onConfirm, isPending }: RejectModalProps) {
  const [reason, setReason] = useState("")
  const [cancelReservation, setCancelReservation] = useState(false)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
        <h3 className="mb-1 font-[var(--font-gotham-bold)] text-lg text-white">
          Reject Payment
        </h3>
        <p className="mb-5 text-sm text-white/50">
          UTR: <span className="font-mono text-white/70">{payment.transaction_id}</span>{" "}
          from {payment.buyer_name}
        </p>

        <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/60">
          Rejection Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-red-400/60"
          placeholder="e.g. Amount mismatch, UTR not found in bank statement…"
        />

        <label className="mb-5 flex cursor-pointer items-center gap-3 text-sm text-white/60">
          <input
            type="checkbox"
            checked={cancelReservation}
            onChange={(e) => setCancelReservation(e.target.checked)}
            className="h-4 w-4 accent-red-400"
          />
          Cancel reservation (participant must re-purchase)
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason, cancelReservation)}
            disabled={!reason.trim() || isPending}
            className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            {isPending ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Row
// --------------------------------------------------------------------------

function PaymentRow({
  payment,
  onApprove,
  onReject,
  onHold,
  isActioning,
}: {
  payment: AdminPaymentQueueItem
  onApprove: () => void
  onReject: () => void
  onHold: () => void
  isActioning: boolean
}) {
  return (
    <tr className="border-t border-white/5 transition hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <p className="text-sm text-white">{payment.buyer_name}</p>
        <p className="text-xs text-white/40">{payment.buyer_email}</p>
      </td>
      <td className="px-4 py-3 text-right font-[var(--font-gotham-bold)] text-white">
        {formatPaise(payment.expected_amount_paise)}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-white/70">
        {payment.transaction_id}
      </td>
      <td className="px-4 py-3 text-sm text-white/40">
        {formatTimestamp(payment.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            disabled={isActioning}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={isActioning}
            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onHold}
            disabled={isActioning}
            className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-50"
          >
            Hold
          </button>
        </div>
      </td>
    </tr>
  )
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function AdminPaymentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<AdminPaymentQueueItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    data: payments,
    isLoading,
    isError,
  } = useQuery<AdminPaymentQueueItem[]>({
    queryKey: ["admin", "payments", "PENDING"],
    queryFn: () =>
      apiRequest<AdminPaymentQueueItem[]>("/api/admin/payments?status=PENDING"),
    enabled: user?.can_review_payments === true,
    refetchInterval: 30_000, // Auto-refresh every 30s
  })

  const invalidatePayments = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "payments"] })

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/payments/${id}/approve`, { method: "POST" }),
    onSuccess: invalidatePayments,
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Action failed")
    },
  })

  const { mutate: hold, isPending: isHolding } = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/payments/${id}/hold`, { method: "POST" }),
    onSuccess: invalidatePayments,
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Action failed")
    },
  })

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: ({
      id,
      reason,
      cancel_reservation,
    }: {
      id: string
      reason: string
      cancel_reservation: boolean
    }) =>
      apiRequest(`/api/admin/payments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason, cancel_reservation }),
      }),
    onSuccess: () => {
      setRejectTarget(null)
      invalidatePayments()
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Action failed")
    },
  })

  const isActioning = isApproving || isHolding || isRejecting

  // ---------- Auth guard ----------
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (!user?.can_review_payments) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-white/40">
        <div>
          <p className="text-lg">Access Denied</p>
          <p className="mt-1 text-sm">
            This page is restricted to payment reviewers.
          </p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-red-400">
        <p>Failed to load payment queue.</p>
      </div>
    )
  }

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[var(--font-gotham-bold)] text-3xl text-white">
              Payment Review Queue
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {payments?.length ?? 0} pending UPI submissions · auto-refreshes every 30s
            </p>
          </div>
        </div>

        {actionError && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-3 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!payments || payments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-20 text-center text-white/40">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-4 h-10 w-10 opacity-30"
            >
              <path
                d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm">No pending payments.</p>
            <p className="mt-1 text-xs">All clear! Check back soon.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-white/40">
                    Buyer
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-white/40">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-white/40">
                    UTR
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-white/40">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-white/40">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    isActioning={isActioning}
                    onApprove={() => approve(payment.id)}
                    onHold={() => hold(payment.id)}
                    onReject={() => setRejectTarget(payment)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {rejectTarget && (
        <RejectModal
          payment={rejectTarget}
          onClose={() => setRejectTarget(null)}
          isPending={isRejecting}
          onConfirm={(reason, cancelReservation) =>
            reject({
              id: rejectTarget.id,
              reason,
              cancel_reservation: cancelReservation,
            })
          }
        />
      )}
    </>
  )
}
