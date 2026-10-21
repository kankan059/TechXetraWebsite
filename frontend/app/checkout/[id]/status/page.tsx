"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Ticket,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { participantApi } from "@/services/participant-api";
import type { PurchaseDetail } from "@/types/api";

export default function CheckoutStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await participantApi.purchases.get(id);
      setPurchase(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load order status");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchStatus();

    // Auto poll every 6 seconds if pending
    const interval = setInterval(() => {
      void fetchStatus();
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order? Held seats will be released.")) return;

    setActionLoading(true);
    setError(null);
    try {
      await participantApi.purchases.cancel(id);
      setActionSuccess("Order reservation cancelled.");
      void fetchStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFulfillment = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await participantApi.purchases.retryFulfillment(id);
      setActionSuccess("Ticket fulfillment retried successfully! Refreshing...");
      void fetchStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fulfillment retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-lg animate-pulse space-y-6">
          <div className="h-6 w-32 rounded bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error && !purchase) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Order Not Found</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-200"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const status = purchase?.status;
  const isPaid = status === "PAID";
  const isPending = status === "PENDING_VERIFICATION";
  const isAwaiting = status === "AWAITING_PAYMENT";
  const isCancelled = status === "CANCELLED";
  const isExpired = status === "EXPIRED";

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Check Live Status
          </button>
        </div>

        {/* Status card */}
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col items-center text-center">
            {isPaid && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            )}
            {isPending && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>
            )}
            {isAwaiting && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
                <CreditCard className="h-8 w-8" />
              </div>
            )}
            {(isCancelled || isExpired) && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
                <XCircle className="h-8 w-8" />
              </div>
            )}

            <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">
              {isPaid && "Payment Confirmed!"}
              {isPending && "Payment Under Verification"}
              {isAwaiting && "Awaiting Payment"}
              {isCancelled && "Order Cancelled"}
              {isExpired && "Reservation Expired"}
            </h1>

            <p className="mt-2 text-sm text-white/60">
              {isPaid && "Your payment has been verified and your digital passes have been issued."}
              {isPending && "We have received your 12-digit UTR. A festival finance volunteer is verifying the bank credit."}
              {isAwaiting && "Please complete your UPI transaction before your reservation expires."}
              {isCancelled && "This reservation was cancelled and the slots have been released."}
              {isExpired && "The 15-minute reservation timer lapsed before payment submission."}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-white/50">
              Order: {id}
            </div>
          </div>

          {actionSuccess && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
              {actionSuccess}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Fulfillment failed alert */}
          {purchase?.fulfillment_status === "FAILED" && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">Ticket Generation Delayed</p>
                <p className="mt-0.5 text-white/70">
                  {purchase.fulfillment_last_error || "Background ticket preparation encountered a momentary error."}
                </p>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRetryFulfillment}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-amber-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${actionLoading ? "animate-spin" : ""}`} />
                  Retry Fulfillment Now
                </button>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isPaid && (
              <Link
                href="/me/tickets"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200"
              >
                <Ticket className="h-4 w-4" />
                View My Digital Passes
              </Link>
            )}

            {isAwaiting && (
              <>
                <Link
                  href={`/checkout/${id}/pay`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200"
                >
                  <CreditCard className="h-4 w-4" />
                  Proceed to Pay
                </Link>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Cancel Reservation
                </button>
              </>
            )}

            {isPending && (
              <Link
                href={`/checkout/${id}/pay`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View UPI QR or Withdraw UTR
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {(isCancelled || isExpired) && (
              <Link
                href="/checkout"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200"
              >
                Start New Reservation
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Order Details Breakdown */}
          {purchase && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs text-white/70">
              <h3 className="font-semibold text-white">Order Summary</h3>
              <div className="mt-3 divide-y divide-white/[0.06]">
                {purchase.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-white">{item.item_type}</p>
                      <p className="text-[11px] text-white/40">{item.tier} Tier</p>
                    </div>
                    <span className="font-mono text-white">
                      ₹{(item.unit_price_paise / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm font-bold text-white">
                <span>Total Amount</span>
                <span>₹{(purchase.total_amount_paise / 100).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
