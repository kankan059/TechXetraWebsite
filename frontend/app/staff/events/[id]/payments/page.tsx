"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
  RefreshCw,
  Phone,
  Mail,
  ChevronRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import StaffEventNav from "@/components/staff/StaffEventNav";
import ReviewPaymentModal from "@/components/staff/ReviewPaymentModal";
import type { StaffEventDashboard, StaffEventPayment, UserProfile } from "@/types/api";

type PaymentFilterStatus = "PENDING" | "ON_HOLD" | "SUCCESS" | "FAILED" | "ALL";

export default function StaffEventPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<StaffEventDashboard | null>(null);
  const [payments, setPayments] = useState<StaffEventPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentFilterStatus>("PENDING");

  // Copy feedback
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Review modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<StaffEventPayment | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "HOLD">("APPROVE");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Authenticate user
      let currentUser: UserProfile;
      try {
        currentUser = await participantApi.auth.me();
      } catch {
        router.push(`/login?redirect=/staff/events/${id}/payments`);
        return;
      }
      setUser(currentUser);

      // 2. Fetch dashboard to verify Lead or Super Admin permissions
      const dash = await staffApi.events.getDashboard(id);
      setDashboard(dash);

      const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
      const isLead =
        dash.staff.some((s) => s.user_id === currentUser.id && s.role === "LEAD") ||
        currentUser.role === "LEAD";

      if (!isSuperAdmin && !isLead) {
        throw new Error(
          "Access Restricted: Only assigned Event Leads and Super Admins can verify attendee payments."
        );
      }

      // 3. Fetch payment queue
      const payList = await staffApi.events.getPayments(
        id,
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setPayments(payList || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment verification queue");
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter, router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleOpenReview = (
    payment: StaffEventPayment,
    action: "APPROVE" | "REJECT" | "HOLD"
  ) => {
    setSelectedPayment(payment);
    setReviewAction(action);
    setModalOpen(true);
  };

  const handleConfirmReview = async (
    paymentId: string,
    action: "APPROVE" | "REJECT" | "HOLD",
    reason?: string
  ) => {
    setSubmittingReview(true);
    setError(null);
    setSuccess(null);

    try {
      await staffApi.events.reviewPayment(id, paymentId, { action, reason });
      setSuccess(
        action === "APPROVE"
          ? "Payment approved successfully! Digital tickets issued to attendee."
          : action === "HOLD"
          ? "Payment marked on hold."
          : "Payment rejected."
      );
      setModalOpen(false);
      void loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment review failed");
    } finally {
      setSubmittingReview(false);
    }
  };

  const isLeadOrAdmin =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "LEAD" ||
    dashboard?.staff.some((s) => s.user_id === user?.id && s.role === "LEAD");

  if (!loading && error && error.includes("Access Restricted")) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-[#0C1017] p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold">Lead Permission Required</h1>
          <p className="mt-2 text-xs text-white/50">{error}</p>
          <Link
            href={`/staff/events/${id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-400 px-5 py-2.5 text-xs font-bold text-black"
          >
            ← Return to Event Overview
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Breadcrumb & Refresh */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Link href="/staff" className="hover:text-white">Staff Portal</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/staff/events" className="hover:text-white">Events</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/staff/events/${id}`} className="hover:text-white truncate max-w-[160px]">
              {dashboard?.event.title || "Event"}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">Payments</span>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <StaffEventNav
          eventId={id}
          currentTab="payments"
          isLeadOrAdmin={Boolean(isLeadOrAdmin)}
          isEsports={dashboard?.event.category === "E_SPORTS"}
        />

        {/* Notice Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs text-cyan-200">
          <Info className="h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <p className="font-semibold text-white">Event Lead Payment Verification Console</p>
            <p className="mt-0.5 text-white/70">
              You are reviewing attendee payments for <strong>{dashboard?.event.title || "this event"}</strong>.
              Verify the 12-digit UPI UTR transaction ID against your festival bank statements before approving tickets.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1.5 text-xs">
          {(
            [
              ["PENDING", "Pending Review"],
              ["ON_HOLD", "On Hold"],
              ["SUCCESS", "Approved / Paid"],
              ["FAILED", "Rejected"],
              ["ALL", "All Submissions"],
            ] as const
          ).map(([st, label]) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-4 py-2 font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-purple-400 text-black font-bold shadow-md shadow-purple-400/20"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Payments Table / List */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C1017]">
          {loading ? (
            <div className="py-24 text-center text-sm text-white/40">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-purple-400" />
              Loading payments queue...
            </div>
          ) : payments.length === 0 ? (
            <div className="py-20 text-center text-white/40">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-white/20" />
              <p className="text-base font-semibold text-white/70">No payments in this queue</p>
              <p className="mt-1 text-xs text-white/40">
                {statusFilter === "PENDING"
                  ? "All attendee payments are fully reviewed."
                  : "No submissions matched the selected status."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase text-white/40">
                    <th className="py-3.5 px-5">Buyer</th>
                    <th className="py-3.5 px-5">Expected Amount</th>
                    <th className="py-3.5 px-5">UTR Transaction ID</th>
                    <th className="py-3.5 px-5">Submitted</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payments.map((p) => {
                    const isSelf = user?.id === p.buyer_id;
                    const canReview =
                      !isSelf && (p.payment_status === "PENDING" || p.payment_status === "ON_HOLD");
                    const amountRupees = (p.expected_amount_paise / 100).toFixed(2);

                    return (
                      <tr key={p.payment_id} className="transition hover:bg-white/[0.02]">
                        {/* 1. Buyer */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-white text-sm">{p.buyer_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                            <span className="font-mono text-cyan-300">{p.buyer_id}</span>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{p.buyer_email}</span>
                            </div>
                            {p.buyer_phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <a href={`tel:${p.buyer_phone}`} className="hover:text-white">
                                  {p.buyer_phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Expected Amount */}
                        <td className="py-4 px-5 font-bold text-sm text-white">
                          ₹{amountRupees}
                        </td>

                        {/* 3. UTR Transaction ID */}
                        <td className="py-4 px-5">
                          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-xs text-white">
                            <span>{p.transaction_id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(p.transaction_id)}
                              title="Copy UTR"
                              className="text-white/40 hover:text-white transition"
                            >
                              {copiedUtr === p.transaction_id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 4. Submitted */}
                        <td className="py-4 px-5 text-white/60">
                          <p>{new Date(p.submitted_at).toLocaleDateString()}</p>
                          <p className="text-[11px] text-white/40">
                            {new Date(p.submitted_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>

                        {/* 5. Status */}
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              p.payment_status === "SUCCESS"
                                ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                                : p.payment_status === "PENDING"
                                ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                                : p.payment_status === "ON_HOLD"
                                ? "bg-purple-400/15 text-purple-300 border border-purple-400/30"
                                : "bg-red-400/15 text-red-300 border border-red-400/30"
                            }`}
                          >
                            {p.payment_status === "SUCCESS" && <CheckCircle2 className="h-3 w-3" />}
                            {p.payment_status === "PENDING" && <Clock className="h-3 w-3" />}
                            {p.payment_status === "ON_HOLD" && <PauseCircle className="h-3 w-3" />}
                            {p.payment_status === "FAILED" && <XCircle className="h-3 w-3" />}
                            {p.payment_status}
                          </span>
                          {p.rejection_reason && (
                            <p className="mt-1 text-[10px] text-red-300/80 italic">
                              {p.rejection_reason}
                            </p>
                          )}
                        </td>

                        {/* 6. Actions */}
                        <td className="py-4 px-5 text-right">
                          {isSelf ? (
                            <span
                              className="text-[11px] italic text-amber-300/80"
                              title="You cannot review your own payment submission."
                            >
                              Self-submission (Locked)
                            </span>
                          ) : canReview ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenReview(p, "APPROVE")}
                                className="rounded-lg bg-emerald-400/15 border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-400 hover:text-black transition"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(p, "HOLD")}
                                className="rounded-lg bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400 hover:text-black transition"
                              >
                                Hold
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(p, "REJECT")}
                                className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500 hover:text-white transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-white/30">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review Action Modal */}
        <ReviewPaymentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          payment={selectedPayment}
          action={reviewAction}
          onConfirm={handleConfirmReview}
          isSubmitting={submittingReview}
        />
      </div>
    </main>
  );
}
