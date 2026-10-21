"use client";

import { useEffect, useState } from "react";
import { Ticket, RefreshCw, AlertCircle } from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { SalesReport, PurchaseDetail } from "@/types/api";

export default function AdminPassesPage() {
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [purchases, setPurchases] = useState<PurchaseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesRes, purchasesRes] = await Promise.all([
        adminApi.reports.sales(),
        adminApi.purchases.list({ limit: 50 }).catch(() => ({ purchases: [], next_cursor: null })),
      ]);
      setSales(salesRes);
      setPurchases(purchasesRes.purchases || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load passes data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            PASS INVENTORY & FINANCIALS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Passes & Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Overview of festival gate passes, item tier breakdowns, and order fulfillment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
          Loading pass records...
        </div>
      ) : (
        <>
          {/* Sales Breakdown by Tier */}
          {sales && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
                <p className="text-xs text-slate-400">Total Paid Passes</p>
                <p className="mt-2 text-3xl font-bold text-white">{sales.paid_count}</p>
                <p className="mt-1 text-xs text-emerald-400">
                  ₹{(sales.paid_total_amount_paise / 100).toFixed(2)} collected
                </p>
              </div>

              {sales.items_breakdown.map((item) => (
                <div
                  key={`${item.item_type}-${item.tier}`}
                  className="rounded-2xl border border-white/10 bg-[#0C1017] p-6"
                >
                  <p className="text-xs text-slate-400">
                    {item.item_type} ({item.tier})
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{item.count} sold</p>
                  <p className="mt-1 text-xs text-slate-500">
                    ₹{(item.total_amount_paise / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Orders Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
            <div className="border-b border-white/[0.08] px-6 py-4">
              <h2 className="text-base font-semibold text-white">Recent Purchase Orders</h2>
            </div>

            {purchases.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No orders recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xs font-semibold uppercase text-slate-400">
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3">Buyer ID</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Fulfillment</th>
                      <th className="px-5 py-3">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {purchases.map((p) => (
                      <tr key={p.id} className="transition hover:bg-white/[0.02]">
                        <td className="px-5 py-4 font-mono text-xs text-cyan-200">{p.id}</td>
                        <td className="px-5 py-4 text-xs text-slate-400">{p.buyer_id}</td>
                        <td className="px-5 py-4 font-semibold text-white">
                          ₹{(p.total_amount_paise / 100).toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              p.status === "PAID"
                                ? "bg-emerald-400/10 text-emerald-300"
                                : p.status === "PENDING_VERIFICATION"
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-300">
                          {p.fulfillment_status}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {p.items?.length || 0} item(s)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
