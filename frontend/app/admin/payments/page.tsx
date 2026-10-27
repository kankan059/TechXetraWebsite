"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Search,
  Check,
  X,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminPayment } from "@/types/api";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action Modals State
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [modalMode, setModalMode] = useState<"APPROVE" | "REJECT" | "HOLD" | "RESUBMIT" | null>(null);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalReason, setModalReason] = useState<string>("");
  const [resubmitUtr, setResubmitUtr] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const [paymentsRes, eventsRes, purchasesRes] = await Promise.allSettled([
        adminApi.payments.list(params),
        adminApi.events.list({ limit: 100 }),
        adminApi.purchases.list({ limit: 100 }),
      ]);

      const rawPayments =
        paymentsRes.status === "fulfilled" ? paymentsRes.value.payments || [] : [];
      const events =
        eventsRes.status === "fulfilled" ? eventsRes.value.events || [] : [];
      const purchases =
        purchasesRes.status === "fulfilled" ? purchasesRes.value.purchases || [] : [];

      // Build event lookup map: ID/Slug -> Title
      const eventTitleById = new Map<string, string>();
      events.forEach((evt) => {
        if (evt.id) eventTitleById.set(evt.id, evt.title);
        if (evt.slug) eventTitleById.set(evt.slug, evt.title);
      });

      // Build purchase lookup map: Purchase ID -> Event Title / Gate Pass
      const purchaseEventMap = new Map<string, string>();
      purchases.forEach((pur) => {
        let title: string | null = null;
        if (Array.isArray(pur.registrations) && pur.registrations.length > 0) {
          const reg = pur.registrations[0];
          title =
            reg.event_title ||
            (reg.event_id ? eventTitleById.get(reg.event_id) : null) ||
            null;
        }
        if (!title && Array.isArray(pur.items) && pur.items.length > 0) {
          const item = pur.items[0];
          if (item.item_type === "GATE_PASS") {
            title = "Festival Gate Pass";
          } else if (item.event_id && eventTitleById.has(item.event_id)) {
            title = eventTitleById.get(item.event_id)!;
          } else if ((item as any).descriptionSnapshot?.title) {
            title = (item as any).descriptionSnapshot.title;
          }
        }
        if (title && pur.id) {
          purchaseEventMap.set(pur.id, title);
        }
      });

      // Enrich payments with resolved event titles
      const enrichedPayments = rawPayments.map((p) => {
        const title =
          p.event_title ||
          purchaseEventMap.get(p.purchase_id) ||
          (p.event_id ? eventTitleById.get(p.event_id) : null) ||
          null;
        return {
          ...p,
          event_title: title,
        };
      });

      setPayments(enrichedPayments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment review queue");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPayments();
    }, 200);

    return () => clearTimeout(timer);
  }, [loadPayments]);

  const openActionModal = (
    payment: AdminPayment,
    mode: "APPROVE" | "REJECT" | "HOLD" | "RESUBMIT"
  ) => {
    setSelectedPayment(payment);
    setModalMode(mode);
    setModalNote("");
    setModalReason("");
    setResubmitUtr("");
  };

  const closeActionModal = () => {
    setSelectedPayment(null);
    setModalMode(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedPayment || !modalMode) return;

    setSubmittingAction(true);
    setError(null);
    setActionSuccess(null);

    try {
      if (modalMode === "APPROVE") {
        await adminApi.payments.approve(selectedPayment.id, {
          internal_note: modalNote.trim() || undefined,
        });
        setActionSuccess(`Payment ${selectedPayment.transaction_id || selectedPayment.id} approved!`);
      } else if (modalMode === "REJECT") {
        if (!modalReason.trim()) {
          throw new Error("A rejection reason is required.");
        }
        await adminApi.payments.reject(selectedPayment.id, {
          reason: modalReason.trim(),
          internal_note: modalNote.trim() || undefined,
        });
        setActionSuccess(`Payment rejected.`);
      } else if (modalMode === "HOLD") {
        await adminApi.payments.hold(selectedPayment.id, {
          reason: modalReason.trim() || undefined,
          internal_note: modalNote.trim() || undefined,
        });
        setActionSuccess(`Payment placed on hold.`);
      } else if (modalMode === "RESUBMIT") {
        if (!resubmitUtr.trim()) {
          throw new Error("Please enter the corrected transaction ID / UTR.");
        }
        await adminApi.payments.resubmit(selectedPayment.id, {
          transaction_id: resubmitUtr.trim(),
        });
        setActionSuccess(`Payment resubmitted with corrected UTR.`);
      }

      closeActionModal();
      void loadPayments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUnhold = async (paymentId: string) => {
    try {
      setLoading(true);
      await adminApi.payments.unhold(paymentId);
      setActionSuccess("Payment moved back to pending queue.");
      void loadPayments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unhold failed");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            REVIEWER DASHBOARD
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Payment Verification Queue
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Verify manual UPI UTR transaction numbers against festival bank statements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPayments()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {["PENDING", "ON_HOLD", "SUCCESS", "FAILED", "ALL"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                activeTab === tab
                  ? "bg-[#55DFFF] text-black shadow-lg shadow-[#55DFFF]/20"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by UTR, Name, Email..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#55DFFF]/50"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
        {loading && payments.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
            Loading review queue...
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-500">
            No payments found in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                  <th className="px-5 py-4">Attendee</th>
                  <th className="px-5 py-4">Event / Item</th>
                  <th className="px-5 py-4">Transaction UTR</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {payments.map((p) => {
                  const amountRupees = (p.expected_amount_paise / 100).toFixed(2);
                  return (
                    <tr key={p.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{p.buyer_name || "Unknown"}</p>
                        <p className="text-xs text-slate-400">{p.buyer_email}</p>
                        {p.buyer_phone && (
                          <p className="text-[11px] text-slate-500">+91 {p.buyer_phone}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {p.event_title ? (
                          <span className="inline-flex items-center rounded-lg border border-purple-400/20 bg-purple-400/10 px-2.5 py-1 text-xs font-medium text-purple-200">
                            {p.event_title}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-sm font-medium text-cyan-200">
                          {p.transaction_id || "No UTR submitted"}
                        </span>
                        <p className="text-[11px] text-slate-500">ID: {p.id}</p>
                      </td>

                      <td className="px-5 py-4 font-semibold text-white">
                        ₹{amountRupees}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            p.status === "SUCCESS"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : p.status === "PENDING"
                              ? "bg-amber-400/10 text-amber-300"
                              : p.status === "ON_HOLD"
                              ? "bg-blue-400/10 text-blue-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString()}{" "}
                        {new Date(p.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openActionModal(p, "APPROVE")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() => openActionModal(p, "HOLD")}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500 hover:text-black"
                              >
                                <PauseCircle className="h-3.5 w-3.5" />
                                Hold
                              </button>

                              <button
                                type="button"
                                onClick={() => openActionModal(p, "REJECT")}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {p.status === "ON_HOLD" && (
                            <button
                              type="button"
                              onClick={() => handleUnhold(p.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500 hover:text-black"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              Unhold
                            </button>
                          )}

                          {p.status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => openActionModal(p, "RESUBMIT")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                            >
                              Resubmit UTR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {modalMode && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e141f] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {modalMode === "APPROVE" && "Approve Payment & Issue Passes"}
              {modalMode === "REJECT" && "Reject Payment Submission"}
              {modalMode === "HOLD" && "Put Payment On Hold"}
              {modalMode === "RESUBMIT" && "Correct & Resubmit UTR"}
            </h3>

            <p className="mt-2 text-xs text-slate-400">
              Buyer: <span className="text-white">{selectedPayment.buyer_name}</span> (
              {selectedPayment.buyer_email}) · Amount: ₹
              {(selectedPayment.expected_amount_paise / 100).toFixed(2)}
              {selectedPayment.event_title && (
                <> · Event: <span className="font-medium text-purple-300">{selectedPayment.event_title}</span></>
              )}
            </p>

            <div className="mt-4 space-y-4">
              {modalMode === "REJECT" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Rejection Reason <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="e.g. UTR not found on statement / Amount mismatch"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-red-400"
                  />
                </div>
              )}

              {modalMode === "HOLD" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Hold Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="e.g. Banking statement pending reconciliation"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-blue-400"
                  />
                </div>
              )}

              {modalMode === "RESUBMIT" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Corrected 12-Digit UTR <span className="text-cyan-300">*</span>
                  </label>
                  <input
                    type="text"
                    value={resubmitUtr}
                    onChange={(e) => setResubmitUtr(e.target.value)}
                    placeholder="Enter corrected transaction ID"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-cyan-300"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Internal Reviewer Note (Optional)
                </label>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Private note for staff audits"
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-[#55DFFF]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeActionModal}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submittingAction}
                onClick={handleExecuteAction}
                className={`rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
                  modalMode === "APPROVE"
                    ? "bg-emerald-400 text-black hover:bg-emerald-300"
                    : modalMode === "REJECT"
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-[#55DFFF] text-black hover:bg-[#8de8ff]"
                }`}
              >
                {submittingAction ? "Processing..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
