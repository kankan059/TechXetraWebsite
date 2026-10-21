"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Filter,
  FileCode,
  X,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminAuditLog } from "@/types/api";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect JSON Modal
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = { limit: "100" };
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.target_type = targetTypeFilter;

      const res = await adminApi.auditLogs.list(params);
      setLogs(res.audit_logs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetTypeFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actor_id?.toLowerCase().includes(q) ||
      (log as unknown as Record<string, string>).resource_type?.toLowerCase().includes(q) ||
      (log as unknown as Record<string, string>).target_type?.toLowerCase().includes(q) ||
      log.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
            COMPLIANCE & TRACEABILITY
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            System Audit Trail
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Immutable SQLite trigger-protected logs of administrative decisions and state modifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0C1017] p-4 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor ID, or resource..."
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none"
        >
          <option value="" className="bg-[#0C1017]">All Target Types</option>
          <option value="PAYMENT" className="bg-[#0C1017]">PAYMENT</option>
          <option value="TICKET" className="bg-[#0C1017]">TICKET</option>
          <option value="USER" className="bg-[#0C1017]">USER</option>
          <option value="EVENT" className="bg-[#0C1017]">EVENT</option>
          <option value="SETTINGS" className="bg-[#0C1017]">SETTINGS</option>
          <option value="SCORE" className="bg-[#0C1017]">SCORE</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
            Loading system audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] uppercase text-slate-400">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target Entity</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLogs.map((log) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const rawLog = log as any;
                  const targetType = rawLog.target_type || rawLog.resource_type || "SYSTEM";
                  const targetId = rawLog.target_id || rawLog.resource_id || "N/A";

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>

                      <td className="px-5 py-3">
                        <span className="rounded bg-white/[0.05] px-2 py-0.5 font-semibold text-white">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <p className="font-semibold text-cyan-300">{targetType}</p>
                        <p className="font-mono text-[10px] text-slate-500">{targetId}</p>
                      </td>

                      <td className="px-5 py-3 font-mono text-slate-400">
                        {log.actor_name ? (
                          <span className="text-white">{log.actor_name}</span>
                        ) : (
                          log.actor_id?.slice(0, 16) || "System"
                        )}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300 hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
                        >
                          <FileCode className="h-3 w-3" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Audit Log Record</h2>
                <p className="font-mono text-xs text-[#55DFFF]">{selectedLog.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="font-medium text-slate-400">Action:</span>{" "}
                <span className="font-bold text-white">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-medium text-slate-400">Actor ID:</span>{" "}
                <span className="font-mono text-white">{selectedLog.actor_id}</span>
              </div>
              <div>
                <span className="font-medium text-slate-400">Timestamp:</span>{" "}
                <span className="text-white">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(selectedLog as any).reason && (
                <div>
                  <span className="font-medium text-slate-400">Reason:</span>{" "}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="text-amber-300">{(selectedLog as any).reason}</span>
                </div>
              )}

              {/* JSON diff preview if available */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {((selectedLog as any).before_json || (selectedLog as any).after_json || selectedLog.details) && (
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-slate-400">Payload State & Changes:</p>
                  <pre className="max-h-60 overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-slate-300">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {JSON.stringify(
                      {
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        before: (selectedLog as any).before_json
                          ? /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                            JSON.parse((selectedLog as any).before_json)
                          : null,
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        after: (selectedLog as any).after_json
                          ? /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                            JSON.parse((selectedLog as any).after_json)
                          : null,
                        details: selectedLog.details,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
