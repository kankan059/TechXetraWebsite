"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowLeft,
  User,
} from "lucide-react";
import type { ScanLookupResult, UserProfile } from "@/types/api";
import { staffApi } from "@/services/staff-api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

export default function StaffScannerPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Scanner Mode Context
  const [context, setContext] = useState<"GATE" | "EVENT">("GATE");
  const [eventId, setEventId] = useState("");

  // Token input & Lookup state
  const [tokenInput, setTokenInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<ScanLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Student ID Confirmation Checkbox
  const [studentIdChecked, setStudentIdChecked] = useState(false);

  // Action status
  const [admitting, setAdmitting] = useState(false);
  const [actionVerdict, setActionVerdict] = useState<"ADMITTED" | "DENIED" | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Deny modal
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  useEffect(() => {
    async function checkStaffAuth() {
      try {
        setLoadingAuth(true);
        const currentUser = await participantApi.auth.me();
        setUser(currentUser);
        if (
          currentUser.role !== "VOLUNTEER" &&
          currentUser.role !== "LEAD" &&
          currentUser.role !== "SUPER_ADMIN"
        ) {
          router.push("/dashboard");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login?redirect=/staff/scan");
          return;
        }
        console.error(err);
      } finally {
        setLoadingAuth(false);
      }
    }

    void checkStaffAuth();
  }, [router]);

  const handleLookup = async (tokenToLookup?: string) => {
    const rawToken = (tokenToLookup || tokenInput).trim();
    if (!rawToken) return;

    setLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    setActionVerdict(null);
    setActionMessage(null);
    setStudentIdChecked(false);

    try {
      const data = await staffApi.scan.lookup({
        qrToken: rawToken,
        context,
        eventId: context === "EVENT" ? eventId.trim() || undefined : undefined,
      });

      setLookupResult(data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const handleAdmit = async () => {
    if (!lookupResult?.ticket) return;

    if (lookupResult.ticket.requires_id_check && !studentIdChecked) {
      alert("You must physically verify the attendee's college student ID card before admitting.");
      return;
    }

    setAdmitting(true);
    try {
      await staffApi.scan.admit({
        qrToken: tokenInput.trim(),
        context,
        eventId: context === "EVENT" ? eventId.trim() || undefined : undefined,
        studentIdChecked,
      });

      setActionVerdict("ADMITTED");
      setActionMessage("Attendee admitted successfully!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Admission failed");
    } finally {
      setAdmitting(false);
    }
  };

  const handleDeny = async () => {
    if (!denyReason.trim()) {
      alert("Please enter a reason for turning away the attendee.");
      return;
    }

    try {
      await staffApi.scan.deny({
        qrToken: tokenInput.trim(),
        context,
        reason: denyReason.trim(),
        event_id: context === "EVENT" ? eventId.trim() || undefined : undefined,
      });

      setActionVerdict("DENIED");
      setActionMessage(`Entry denied: ${denyReason.trim()}`);
      setShowDenyModal(false);
      setDenyReason("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Denial action failed");
    }
  };

  const resetForNextScan = () => {
    setTokenInput("");
    setLookupResult(null);
    setLookupError(null);
    setActionVerdict(null);
    setActionMessage(null);
    setStudentIdChecked(false);
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md animate-pulse space-y-4">
          <div className="h-8 w-40 rounded-xl bg-white/10" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Staff Scanner PWA
          </span>
        </div>

        {/* Check-In Mode Toggle */}
        <div className="rounded-2xl border border-white/10 bg-[#0c121d] p-4">
          <p className="text-xs font-medium text-white/60">Check-in Location Context:</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setContext("GATE");
                resetForNextScan();
              }}
              className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                context === "GATE"
                  ? "bg-cyan-300 text-black shadow-lg shadow-cyan-300/20"
                  : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5"
              }`}
            >
              Festival Gate (Multi-Entry)
            </button>

            <button
              type="button"
              onClick={() => {
                setContext("EVENT");
                resetForNextScan();
              }}
              className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                context === "EVENT"
                  ? "bg-cyan-300 text-black shadow-lg shadow-cyan-300/20"
                  : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/5"
              }`}
            >
              Event Check-In (Single-Use)
            </button>
          </div>

          {context === "EVENT" && (
            <div className="mt-3">
              <label className="block text-[11px] text-white/50">Event ID (e.g. evt_...)</label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event UUID"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs text-white outline-none focus:border-cyan-300"
              />
            </div>
          )}
        </div>

        {/* Token Input or Camera Reader */}
        <div className="rounded-2xl border border-white/10 bg-[#0c121d] p-6">
          <label className="block text-xs font-semibold uppercase text-cyan-300">
            Scan / Enter Ticket QR Token
          </label>
          <p className="mt-1 text-xs text-white/40">
            Paste or scan the HMAC-signed token (starts with <code>tx1...</code>)
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleLookup();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="tx1.tkt_... or barcode scan"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs font-mono text-cyan-200 outline-none focus:border-cyan-300"
            />
            <button
              type="submit"
              disabled={lookingUp || !tokenInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-5 py-3 text-xs font-bold text-black hover:bg-cyan-200 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {lookingUp ? "Inspecting..." : "Lookup"}
            </button>
          </form>
        </div>

        {lookupError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center text-red-200">
            <XCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="font-bold">INSPECTION FAILED</p>
            <p className="mt-1 text-xs text-red-200/80">{lookupError}</p>
          </div>
        )}

        {/* Lookup Inspection Card */}
        {lookupResult && (
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-2xl">
            {/* Verdict Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs uppercase text-white/50">Inspection Verdict</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider ${
                  lookupResult.verdict === "VALID"
                    ? "bg-emerald-400/20 text-emerald-300 shadow-lg shadow-emerald-400/20"
                    : lookupResult.verdict === "ALREADY_USED"
                    ? "bg-red-500/20 text-red-300 shadow-lg shadow-red-500/20"
                    : "bg-amber-400/20 text-amber-300"
                }`}
              >
                {lookupResult.verdict}
              </span>
            </div>

            {/* Warning if recent gate entry */}
            {lookupResult.recent_gate_entry_warning && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
                <AlertTriangle className="mb-1 inline h-4 w-4 mr-1 text-amber-400" />
                {lookupResult.recent_gate_entry_warning}
              </div>
            )}

            {/* Ticket details */}
            {lookupResult.ticket ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-xs text-white/40">Attendee Name</p>
                  <p className="mt-0.5 text-lg font-bold text-white">
                    {lookupResult.ticket.beneficiary_name}
                  </p>

                  <div className="mt-3 flex justify-between text-xs">
                    <span className="text-white/40">Pass Type</span>
                    <span className="font-semibold text-white">
                      {lookupResult.ticket.ticket_type} ({lookupResult.ticket.tier})
                    </span>
                  </div>

                  {lookupResult.ticket.event && (
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-white/40">Event</span>
                      <span className="font-semibold text-white">
                        {lookupResult.ticket.event.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mandatory Student ID Check Banner */}
                {lookupResult.ticket.requires_id_check && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                    <div className="flex items-start gap-2.5">
                      <GraduationCap className="h-5 w-5 shrink-0 text-amber-300" />
                      <div>
                        <p className="font-bold text-amber-200">
                          STUDENT ID CARD VERIFICATION REQUIRED
                        </p>
                        <p className="mt-1 text-xs text-amber-100/80">
                          College: <strong>{lookupResult.ticket.institution_name}</strong>
                          <br />
                          Roll / Student ID: <strong>{lookupResult.ticket.institution_id}</strong>
                        </p>

                        <label className="mt-3 flex cursor-pointer items-center gap-2 font-medium text-white text-xs">
                          <input
                            type="checkbox"
                            checked={studentIdChecked}
                            onChange={(e) => setStudentIdChecked(e.target.checked)}
                            className="h-4 w-4 rounded accent-cyan-400"
                          />
                          <span>I physically inspected the valid student ID card.</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!actionVerdict ? (
                  <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      disabled={
                        admitting ||
                        lookupResult.verdict !== "VALID" ||
                        (lookupResult.ticket.requires_id_check && !studentIdChecked)
                      }
                      onClick={handleAdmit}
                      className="flex-1 rounded-xl bg-emerald-400 py-3.5 text-xs font-bold text-black shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 disabled:opacity-40"
                    >
                      {admitting ? "Admitting..." : "Admit Attendee ✓"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDenyModal(true)}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3.5 text-xs font-semibold text-red-300 hover:bg-red-500 hover:text-white"
                    >
                      Deny Entry ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className={`mt-4 rounded-xl p-4 text-center font-bold text-sm ${
                      actionVerdict === "ADMITTED"
                        ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {actionMessage}
                    <button
                      type="button"
                      onClick={resetForNextScan}
                      className="mt-3 block w-full rounded-lg bg-white/10 py-2 text-xs font-medium text-white hover:bg-white/20"
                    >
                      Scan Next Attendee →
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Deny Reason Modal */}
        {showDenyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d131f] p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white">Deny Entry Reason</h3>
              <p className="mt-1 text-xs text-white/50">
                Log the reason why the attendee was turned away.
              </p>

              <textarea
                required
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g. Failed to produce valid college student ID card"
                rows={3}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white outline-none focus:border-red-400"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDenyModal(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeny}
                  className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white"
                >
                  Confirm Denial
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
