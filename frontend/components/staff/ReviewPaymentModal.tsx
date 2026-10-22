"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { StaffEventPayment } from "@/types/api";

interface ReviewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: StaffEventPayment | null;
  action: "APPROVE" | "REJECT" | "HOLD";
  onConfirm: (
    paymentId: string,
    action: "APPROVE" | "REJECT" | "HOLD",
    reason?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}

const REJECT_PRESETS = [
  "UTR not found in bank statement.",
  "Amount received does not match expected pass fee.",
  "Duplicate UTR submission.",
  "Payment was reversed or cancelled.",
];

export default function ReviewPaymentModal({
  isOpen,
  onClose,
  payment,
  action,
  onConfirm,
  isSubmitting,
}: ReviewPaymentModalProps) {
  const [reasonPreset, setReasonPreset] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [amountChecked, setAmountChecked] = useState(false);
  const [utrChecked, setUtrChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReasonPreset(action === "REJECT" ? REJECT_PRESETS[0] : "");
      setCustomReason("");
      setAmountChecked(false);
      setUtrChecked(false);
      setError(null);
    }
  }, [isOpen, action]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalReason: string | undefined;

    if (action === "APPROVE") {
      if (!amountChecked || !utrChecked) {
        setError("Please verify all checklist items before confirming approval.");
        return;
      }
      finalReason = "UTR verified in bank statement";
    } else if (action === "REJECT") {
      const selected = reasonPreset === "OTHER" ? customReason.trim() : reasonPreset;
      if (!selected) {
        setError("A rejection reason is required.");
        return;
      }
      finalReason = selected;
    } else if (action === "HOLD") {
      finalReason = customReason.trim() || "Awaiting further bank/attendee clarification";
    }

    try {
      await onConfirm(payment.payment_id, action, finalReason);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const amountRupees = (payment.expected_amount_paise / 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl sm:p-8 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                action === "APPROVE"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : action === "REJECT"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {action === "APPROVE" && <CheckCircle2 className="h-5 w-5" />}
              {action === "REJECT" && <AlertTriangle className="h-5 w-5" />}
              {action === "HOLD" && <PauseCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {action === "APPROVE" && "Approve Attendee Payment"}
                {action === "REJECT" && "Reject Payment Submission"}
                {action === "HOLD" && "Put Payment On Hold"}
              </h2>
              <p className="text-xs text-white/50">{payment.buyer_name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 p-2 text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Payment summary box */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs space-y-2">
            <div className="flex justify-between text-white/60">
              <span>Expected Amount:</span>
              <span className="font-bold text-white text-sm">₹{amountRupees}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Submitted UTR:</span>
              <span className="font-mono font-semibold text-cyan-300">
                {payment.transaction_id}
              </span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Buyer Email:</span>
              <span className="text-white">{payment.buyer_email}</span>
            </div>
          </div>

          {/* APPROVE checklist */}
          {action === "APPROVE" && (
            <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
              <p className="font-semibold text-emerald-300">
                Committee Verification Checklist:
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={amountChecked}
                  onChange={(e) => setAmountChecked(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 rounded border-white/20 bg-white/10 text-emerald-400 focus:ring-emerald-400"
                />
                <span>
                  Expected amount of <strong>₹{amountRupees}</strong> matches the receipt.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={utrChecked}
                  onChange={(e) => setUtrChecked(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-0.5 rounded border-white/20 bg-white/10 text-emerald-400 focus:ring-emerald-400"
                />
                <span>
                  UTR <code className="font-mono text-cyan-300">{payment.transaction_id}</code> verified in festival receiving bank statement.
                </span>
              </label>
            </div>
          )}

          {/* REJECT options */}
          {action === "REJECT" && (
            <div className="space-y-3 text-xs">
              <label className="block font-semibold text-white/80">
                Select Rejection Reason <span className="text-red-400">*</span>
              </label>
              <select
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/10 bg-[#0C1017] px-3.5 py-2.5 text-xs text-white outline-none focus:border-red-400"
              >
                {REJECT_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="OTHER">Custom Reason...</option>
              </select>

              {reasonPreset === "OTHER" && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this payment is being rejected..."
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder-white/30 outline-none focus:border-red-400"
                />
              )}
            </div>
          )}

          {/* HOLD note */}
          {action === "HOLD" && (
            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-white/80">
                Internal Hold Note (Optional):
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Contacted bank for UTR clearance; awaiting phone verification..."
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                action === "APPROVE"
                  ? "bg-emerald-400 text-black hover:bg-emerald-300"
                  : action === "REJECT"
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-amber-400 text-black hover:bg-amber-300"
              }`}
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {action === "APPROVE" && "Confirm Approval & Issue Tickets"}
              {action === "REJECT" && "Reject Payment"}
              {action === "HOLD" && "Mark On Hold"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
