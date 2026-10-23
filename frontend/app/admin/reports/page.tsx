"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldAlert,
  GraduationCap,
  Scale,
  Wrench,
  Clock,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import { apiRequest } from "@/lib/api-client";

export default function AdminReportsHubPage() {
  const [activeTab, setActiveTab] = useState<
    "RECONCILIATION" | "FAILED_FULFILLMENT" | "STUDENT_TIER" | "DUPLICATES" | "QUEUE_BACKLOG"
  >("RECONCILIATION");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab data states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [failedFulfillmentData, setFailedFulfillmentData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [studentTierData, setStudentTierData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [duplicatesData, setDuplicatesData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backlogData, setBacklogData] = useState<any>(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "RECONCILIATION") {
        const res = await adminApi.reports.reconciliation();
        setReconciliationData(res);
      } else if (activeTab === "FAILED_FULFILLMENT") {
        const res = await adminApi.reports.failedFulfillment();
        setFailedFulfillmentData(res);
      } else if (activeTab === "STUDENT_TIER") {
        const res = await adminApi.reports.studentTier();
        setStudentTierData(res);
      } else if (activeTab === "DUPLICATES") {
        const res = await adminApi.reports.duplicateInstitutions();
        setDuplicatesData(res);
      } else if (activeTab === "QUEUE_BACKLOG") {
        const res = await adminApi.reports.pendingVerification();
        setBacklogData(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleFixReconciliation = async (eventId: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(
        `/admin/reports/reconciliation/${encodeURIComponent(eventId)}/fix`,
        { method: "POST" },
      );
      setSuccess("Event capacity reconciled and seats_taken reset to actual registration truth!");
      void loadReport();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reconciliation fix failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceRetryFulfillment = async (purchaseId: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await adminApi.purchases.retryFulfillment(purchaseId);
      setSuccess(`Fulfillment retried for purchase ${purchaseId}!`);
      void loadReport();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fulfillment retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            BUSINESS INTELLIGENCE & AUDIT
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Reports & Health Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Capacity reconciliation, failed pass generations, student demographic auditing, and queue health.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReport()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-3 text-xs">
        {[
          { id: "RECONCILIATION", label: "Capacity Reconciliation", icon: Scale },
          { id: "FAILED_FULFILLMENT", label: "Failed Pass Fulfillment", icon: ShieldAlert },
          { id: "STUDENT_TIER", label: "Student vs General Demographics", icon: GraduationCap },
          { id: "DUPLICATES", label: "Duplicate Student IDs", icon: Users },
          { id: "QUEUE_BACKLOG", label: "Review Queue Backlog", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition ${
                active
                  ? "bg-[#55DFFF] text-black font-semibold shadow-lg shadow-[#55DFFF]/20"
                  : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
          Loading diagnostic report...
        </div>
      ) : (
        <>
          {/* TAB 1: RECONCILIATION */}
          {activeTab === "RECONCILIATION" && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
              <div className="border-b border-white/[0.08] p-5">
                <h2 className="text-base font-semibold text-white">Event Capacity Reconciliation</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Detects and fixes inconsistencies where seats_taken does not match actual active registrations.
                </p>
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {!reconciliationData?.discrepancies || reconciliationData.discrepancies.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  All event seat counts are 100% reconciled and consistent with registration truth.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] uppercase text-slate-400">
                        <th className="px-5 py-3">Event</th>
                        <th className="px-5 py-3">Reported seats_taken</th>
                        <th className="px-5 py-3">Actual Registration Count</th>
                        <th className="px-5 py-3">Difference</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {reconciliationData.discrepancies.map((d: any) => (
                        <tr key={d.event_id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3">
                            <p className="font-semibold text-white">{d.event_title}</p>
                            <p className="font-mono text-[10px] text-slate-500">{d.event_id}</p>
                          </td>
                          <td className="px-5 py-3 font-mono text-white">{d.seats_taken}</td>
                          <td className="px-5 py-3 font-mono text-emerald-400">{d.actual_count}</td>
                          <td className="px-5 py-3 font-mono font-bold text-red-400">
                            {d.seats_taken - d.actual_count}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleFixReconciliation(d.event_id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#55DFFF] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              Recalculate & Fix
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAILED FULFILLMENT */}
          {activeTab === "FAILED_FULFILLMENT" && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
              <div className="border-b border-white/[0.08] p-5">
                <h2 className="text-base font-semibold text-white">Failed Pass Generations</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Paid orders where background ticket fulfillment failed or timed out.
                </p>
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {!failedFulfillmentData?.failed_orders || failedFulfillmentData.failed_orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  No failed pass generation orders reported!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] uppercase text-slate-400">
                        <th className="px-5 py-3">Purchase Order</th>
                        <th className="px-5 py-3">Buyer</th>
                        <th className="px-5 py-3">Attempts</th>
                        <th className="px-5 py-3">Last Error</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {failedFulfillmentData.failed_orders.map((o: any) => (
                        <tr key={o.purchase_id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-mono font-semibold text-white">
                            {o.purchase_id}
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-white">{o.buyer_name || o.buyer_email}</p>
                            <p className="text-[10px] text-slate-500">{o.buyer_email}</p>
                          </td>
                          <td className="px-5 py-3 text-slate-300">{o.fulfillment_attempts}</td>
                          <td className="px-5 py-3 text-red-300">{o.fulfillment_last_error || "Unknown"}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleForceRetryFulfillment(o.purchase_id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Force Retry
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDENT TIER DEMOGRAPHICS */}
          {activeTab === "STUDENT_TIER" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
                <h2 className="text-base font-semibold text-white">Student vs General Tier Demographics</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Festival demographic ratio, discounts claimed, and verified college attendees.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-xs text-slate-400">Total Student Attendees</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">
                      {studentTierData?.student_users_count || 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-xs text-slate-400">General Public Attendees</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {studentTierData?.general_users_count || 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-xs text-slate-400">Student Passes Issued</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">
                      {studentTierData?.student_passes_count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DUPLICATE STUDENT IDS */}
          {activeTab === "DUPLICATES" && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
              <div className="border-b border-white/[0.08] p-5">
                <h2 className="text-base font-semibold text-white">Duplicate Student ID Detections</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Flags student roll numbers or institution IDs registered under multiple accounts.
                </p>
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {!duplicatesData?.duplicates || duplicatesData.duplicates.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  No duplicate student credentials detected.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] uppercase text-slate-400">
                        <th className="px-5 py-3">Institution</th>
                        <th className="px-5 py-3">Student Roll ID</th>
                        <th className="px-5 py-3">Accounts Linked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {duplicatesData.duplicates.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-semibold text-white">{item.institution_name}</td>
                          <td className="px-5 py-3 font-mono text-cyan-300">{item.institution_id}</td>
                          <td className="px-5 py-3 text-red-300">
                            {item.account_emails?.join(", ") || `${item.count} accounts`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: QUEUE BACKLOG */}
          {activeTab === "QUEUE_BACKLOG" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-5">
                  <p className="text-xs text-slate-400">Pending Review Count</p>
                  <p className="mt-2 text-3xl font-bold text-amber-400">{backlogData?.pending_count || 0}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-5">
                  <p className="text-xs text-slate-400">Overdue (&gt;24 Hours)</p>
                  <p className="mt-2 text-3xl font-bold text-red-400">{backlogData?.overdue_count || 0}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-5">
                  <p className="text-xs text-slate-400">Oldest Submission Age</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {backlogData?.oldest_age_ms
                      ? `${Math.round(backlogData.oldest_age_ms / (1000 * 60))} mins ago`
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
