"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Clock,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type { PaymentInstructions, PurchaseDetail, PaymentRecord } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export default function CheckoutPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // UTR submission state
  const [utr, setUtr] = useState("");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch purchase details
      const purRes = await fetch(`${API_BASE}/api/purchases/${id}`, { credentials: "include" });
      const purData = await purRes.json();

      if (!purRes.ok || !purData.success) {
        throw new Error(purData.error?.message || "Purchase order not found");
      }

      setPurchase(purData.data);

      if (purData.data.status === "PAID") {
        router.push("/dashboard");
        return;
      }

      // 2. Fetch payment instructions
      const instRes = await fetch(`${API_BASE}/api/purchases/${id}/payment-instructions`, {
        credentials: "include",
      });
      const instData = await instRes.json();

      if (instRes.ok && instData.success) {
        setInstructions(instData.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment instructions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  // Interval timer for countdown
  useEffect(() => {
    if (!instructions?.reservation_expires_at) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, instructions.reservation_expires_at! - Date.now());
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [instructions]);

  const formatTimer = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utr.trim();
    if (cleanUtr.length < 8) {
      setError("Please enter a valid 12-digit UPI UTR transaction ID.");
      return;
    }

    setSubmittingUtr(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/purchases/${id}/payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: cleanUtr }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit UTR");
      }

      setPendingPayment(data.data);
      setSuccess("Transaction ID submitted! It is now under review by festival reviewers.");
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleWithdraw = async (paymentId: string) => {
    if (!confirm("Do you want to withdraw this UTR submission to enter a corrected one?")) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/withdraw`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to withdraw payment");
      }
      setSuccess("Submission withdrawn. You can re-enter your UTR.");
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this reservation and release the slots?")) return;

    try {
      await fetch(`${API_BASE}/api/purchases/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !instructions) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error && !instructions) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold">Payment Unavailable</h1>
          <p className="mt-2 text-sm text-white/50">{error}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!instructions || !purchase) return null;

  const isPendingVerification = purchase.status === "PENDING_VERIFICATION";

  // Build QR code image URL from upi_uri
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
    instructions.upi_uri
  )}`;

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            My Dashboard
          </Link>

          {!isPendingVerification && (
            <button
              type="button"
              onClick={handleCancelOrder}
              className="text-xs text-red-300/80 hover:text-red-200"
            >
              Cancel Reservation
            </button>
          )}
        </div>

        {/* 15-Minute Countdown Header */}
        {!isPendingVerification && !isExpired && (
          <div className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <div className="flex items-center gap-2.5 text-sm text-cyan-200">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>Reservation expires in</span>
            </div>
            <span className="font-mono text-lg font-bold tracking-wider text-cyan-300">
              {formatTimer(timeLeftMs)}
            </span>
          </div>
        )}

        {isExpired && !isPendingVerification && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center text-sm text-red-200">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="font-semibold">This 15-minute reservation has expired.</p>
            <p className="mt-1 text-xs text-red-200/70">
              Held inventory slots have been released. Please return to events and initiate a new order.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block rounded-xl bg-red-400 px-4 py-2 text-xs font-bold text-black"
            >
              Browse Events
            </Link>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            {success}
          </div>
        )}

        {/* Pending Verification Notice */}
        {isPendingVerification && (
          <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
            <Clock className="mx-auto h-12 w-12 text-amber-300" />
            <h2 className="mt-4 text-xl font-bold text-white">Payment Under Review</h2>
            <p className="mt-2 text-xs text-amber-200/80">
              Your 12-digit UTR has been recorded and is currently in the review queue.
              Festival reviewers verify transactions against banking records.
            </p>
            <p className="mt-4 text-xs text-white/50">Order ID: {purchase.id}</p>

            <div className="mt-6 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Payment Card with QR & Instructions */}
        {!isPendingVerification && !isExpired && (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6 sm:p-8">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-cyan-300">UPI PAYMENT</p>
              <p className="mt-2 text-4xl font-extrabold text-white">₹{instructions.amount_rupees}</p>
              <p className="mt-1 text-xs text-white/50">Pay to: {instructions.payee_name}</p>
              <p className="font-mono text-xs text-cyan-200/80">{instructions.payee_vpa}</p>
            </div>

            {/* QR Code Container */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="rounded-2xl border border-white/15 bg-white p-3 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="TechXetra UPI QR Code"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              </div>

              {/* Mobile intent button */}
              <a
                href={instructions.upi_uri}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white hover:bg-white/10 sm:hidden"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in UPI App (GPay, PhonePe, Paytm)
              </a>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/70">
              <p className="font-semibold text-white">How to complete payment:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Scan the QR code above or pay using any UPI app.</li>
                <li>Ensure the exact payable amount matches (₹{instructions.amount_rupees}).</li>
                <li>Copy the 12-digit UTR / Reference number from your banking receipt.</li>
                <li>Paste it below and submit for instant verification.</li>
              </ol>
            </div>

            {/* UTR Submission Form */}
            <form onSubmit={handleSubmitUtr} className="mt-6 space-y-4 border-t border-white/10 pt-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">
                  12-Digit UPI Reference / UTR Number <span className="text-cyan-300">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. 429812345678"
                  minLength={8}
                  maxLength={35}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none focus:border-cyan-300"
                />
              </div>

              <button
                type="submit"
                disabled={submittingUtr || utr.trim().length < 8}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-cyan-400/20 transition hover:shadow-cyan-400/30 disabled:opacity-50"
              >
                {submittingUtr ? "Submitting..." : "Submit Transaction ID"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
