"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Ticket,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCw,
  Undo2,
  Trash2,
  UserCheck,
  GraduationCap,
  Calendar,
  Clock,
  ShieldCheck,
  History,
} from "lucide-react";
import { adminApi } from "@/services/admin-api";
import type { AdminTicket } from "@/types/api";

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<AdminTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<"REVOKE" | "REISSUE" | "ROTATE" | "UNDO_CHECKIN" | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalNewBeneficiaryId, setModalNewBeneficiaryId] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadTicketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.tickets.get(id);
      setTicket(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTicketData();
  }, [loadTicketData]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || !ticket) return;

    setSubmittingAction(true);
    setError(null);
    setSuccess(null);

    try {
      if (modalMode === "REVOKE") {
        if (!modalReason.trim()) throw new Error("A revocation reason is required.");
        await adminApi.tickets.revoke(ticket.id, { reason: modalReason.trim() });
        setSuccess("Ticket successfully revoked.");
      } else if (modalMode === "REISSUE") {
        await adminApi.tickets.reissue(ticket.id, {
          reason: modalReason.trim() || undefined,
          new_beneficiary_id: modalNewBeneficiaryId.trim() || undefined,
        });
        setSuccess("Ticket reissued with fresh credentials!");
      } else if (modalMode === "ROTATE") {
        await adminApi.tickets.rotateQr(ticket.id);
        setSuccess("QR code rotated! Previous version invalidated.");
      } else if (modalMode === "UNDO_CHECKIN") {
        if (!modalReason.trim()) throw new Error("A reason is required to override check-in.");
        await adminApi.tickets.undoCheckin(ticket.id, { reason: modalReason.trim() });
        setSuccess("Event admission check-in has been cleared and reset!");
      }

      setModalMode(null);
      setModalReason("");
      setModalNewBeneficiaryId("");
      void loadTicketData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ticket action failed");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-slate-500">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#55DFFF]" />
        Loading ticket inspection data & logs...
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <h2 className="mt-3 text-lg font-bold text-white">Ticket Not Found</h2>
        <p className="mt-1 text-xs text-slate-400">{error}</p>
        <Link
          href="/admin/tickets"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black"
        >
          ← Search Another Ticket
        </Link>
      </div>
    );
  }

  const qrImageUrl = ticket?.qr_token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
        ticket.qr_token,
      )}`
    : null;

  // Check-in history logs
  // Backend might return check_in_history or check_in_logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTicket = ticket as any;
  const logs = rawTicket?.check_in_history || rawTicket?.check_in_logs || [];

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <span className="font-mono text-xs text-slate-400">ID: {id}</span>
        </div>

        <button
          type="button"
          onClick={() => void loadTicketData()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Ticket
        </button>
      </div>

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

      {ticket && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Info (2 Cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Overview Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#55DFFF]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#55DFFF]">
                      {ticket.ticket_type}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] text-slate-300">
                      {ticket.tier} TIER
                    </span>
                  </div>

                  <h1 className="mt-3 text-2xl font-bold text-white">
                    {ticket.event?.title || (ticket.ticket_type === "GATE_PASS" ? "Festival Gate Pass" : "Event Pass")}
                  </h1>
                  <p className="mt-1 font-mono text-xs text-slate-500">Purchase Ref: {ticket.purchase_id}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    ticket.status === "ACTIVE"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-red-400/15 text-red-300"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              {/* Event checkin alert banner */}
              {ticket.event_checked_in_at && (
                <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    <span>
                      Admitted into event on {new Date(ticket.event_checked_in_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("UNDO_CHECKIN");
                      setModalReason("");
                    }}
                    className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-black transition hover:bg-amber-300"
                  >
                    Undo Check-in
                  </button>
                </div>
              )}

              {/* Beneficiary Details */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs">
                  <p className="text-slate-400">Beneficiary Name</p>
                  <p className="mt-1 font-semibold text-white">
                    {ticket.beneficiary?.name || rawTicket.beneficiary_name || "Attendee"}
                  </p>
                  <p className="mt-0.5 text-slate-400">
                    {ticket.beneficiary?.email || rawTicket.beneficiary_email || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs">
                  <p className="text-slate-400">Institution Credentials</p>
                  <p className="mt-1 font-semibold text-white">
                    {ticket.beneficiary?.institution_name || rawTicket.institution_name || "General Public"}
                  </p>
                  <p className="mt-0.5 font-mono text-slate-400">
                    Roll ID: {ticket.beneficiary?.institution_id || rawTicket.institution_id || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Check-in Logs Audit Table */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]">
              <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#55DFFF]" />
                  <h2 className="text-sm font-semibold text-white">Check-in Scan Audit Log</h2>
                </div>
                <span className="text-xs text-slate-400">{logs.length} scan attempts</span>
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No scan attempts recorded for this pass yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] uppercase text-slate-400">
                        <th className="px-5 py-3">Context</th>
                        <th className="px-5 py-3">Verdict</th>
                        <th className="px-5 py-3">Student ID</th>
                        <th className="px-5 py-3">Scanner Staff</th>
                        <th className="px-5 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {logs.map((log: any, idx: number) => (
                        <tr key={log.id || idx} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3 font-semibold text-white">{log.context}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded px-2 py-0.5 font-semibold ${
                                log.verdict === "ADMITTED"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : log.verdict === "DENIED"
                                  ? "bg-red-500/10 text-red-300"
                                  : "bg-amber-500/10 text-amber-300"
                              }`}
                            >
                              {log.verdict}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {log.student_id_checked ? "Verified ✓" : "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-300">
                            {log.scanner_name || log.staff_name || "Volunteer"}
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-500">
                            {log.created_at || log.admitted_at
                              ? new Date(log.created_at || log.admitted_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar & Overrides (1 Col) */}
          <div className="space-y-6">
            {/* QR Code Inspection */}
            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 text-center">
              <h3 className="text-sm font-semibold text-white">Cryptographic QR Token</h3>
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                Version: {ticket.qr_version} · HMAC-SHA256
              </p>

              {qrImageUrl && (
                <div className="my-5 flex justify-center">
                  <div className="rounded-xl bg-white p-3 shadow-lg">
                    <Image
                      src={qrImageUrl}
                      alt="Scanned QR"
                      width={180}
                      height={180}
                      unoptimized
                      className="rounded"
                    />
                  </div>
                </div>
              )}

              <p className="break-all font-mono text-[10px] text-slate-500">
                {ticket.qr_token}
              </p>
            </div>

            {/* Super Admin Override Actions */}
            <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6">
              <h3 className="text-sm font-semibold text-white">Super Admin Overrides</h3>
              <p className="mt-1 text-xs text-slate-400">Direct state overrides & security controls</p>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode("ROTATE");
                    setModalReason("");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left text-xs font-medium text-white transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
                >
                  <div className="flex items-center gap-2.5">
                    <RotateCw className="h-4 w-4 text-[#55DFFF]" />
                    <span>Rotate QR Version</span>
                  </div>
                  <span className="text-[10px] text-slate-500">v{ticket.qr_version} → v{ticket.qr_version + 1}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalMode("REISSUE");
                    setModalReason("");
                    setModalNewBeneficiaryId("");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left text-xs font-medium text-white transition hover:border-cyan-300/40 hover:text-cyan-300"
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="h-4 w-4 text-cyan-400" />
                    <span>Reissue / Transfer Pass</span>
                  </div>
                </button>

                {ticket.event_checked_in_at && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("UNDO_CHECKIN");
                      setModalReason("");
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <Undo2 className="h-4 w-4 text-amber-400" />
                      <span>Undo Event Admission</span>
                    </div>
                  </button>
                )}

                {ticket.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode("REVOKE");
                      setModalReason("");
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="h-4 w-4 text-red-400" />
                      <span>Revoke Pass</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Action Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">
              {modalMode === "REVOKE" && "Revoke Ticket"}
              {modalMode === "REISSUE" && "Reissue / Transfer Pass"}
              {modalMode === "ROTATE" && "Rotate QR Code Version"}
              {modalMode === "UNDO_CHECKIN" && "Undo Event Check-in"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {modalMode === "REVOKE" && "Revoking will immediately deactivate this pass and prevent admission."}
              {modalMode === "REISSUE" && "Replaces this ticket with a fresh QR token. You can optionally transfer it to a new user."}
              {modalMode === "ROTATE" && "Increments QR version, invalidating all past screenshots or prints."}
              {modalMode === "UNDO_CHECKIN" && "Clears event admission timestamp and marks previous check-in as OVERRIDDEN."}
            </p>

            <form onSubmit={handleExecuteAction} className="mt-5 space-y-4">
              {modalMode === "REISSUE" && (
                <div>
                  <label className="text-xs font-medium text-slate-300">
                    New Beneficiary User ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalNewBeneficiaryId}
                    onChange={(e) => setModalNewBeneficiaryId(e.target.value)}
                    placeholder="usr_... (leave blank to keep current owner)"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              )}

              {(modalMode === "REVOKE" || modalMode === "UNDO_CHECKIN" || modalMode === "REISSUE") && (
                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Reason for Audit Log {modalMode !== "REISSUE" && <span className="text-red-400">*</span>}
                  </label>
                  <textarea
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    required={modalMode !== "REISSUE"}
                    rows={3}
                    placeholder="e.g. Scanned accidentally before entry bag check"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingAction}
                  className="rounded-xl bg-[#55DFFF] px-4 py-2 text-xs font-semibold text-black hover:bg-[#55DFFF]/90 disabled:opacity-50"
                >
                  {submittingAction ? "Executing..." : "Confirm Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
