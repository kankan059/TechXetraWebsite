"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  ShieldAlert,
  History,
  RotateCw,
  Undo2,
  AlertCircle,
  Camera,
  QrCode,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import TicketQrScanner from "@/components/admin/TicketQrScanner";
import { adminApi } from "@/services/admin-api";
import type { AdminTicket } from "@/types/api";

type TicketReviewData = AdminTicket & {
  itemType?: AdminTicket["ticket_type"];
  eventCheckedInAt?: number | null;
};

type TicketReview = {
  ticket: TicketReviewData;
  scannedToken: string | null;
  qrVerified: boolean;
};

function parseTicketInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ticketId: "", scannedToken: null };

  if (trimmed.startsWith("tx1")) {
    const parts = trimmed.split(".");
    if (
      parts.length !== 4 ||
      parts[0] !== "tx1" ||
      !parts[1] ||
      !parts[2] ||
      !parts[3]
    ) {
      throw new Error("This QR code is not a valid TechXetra ticket.");
    }
    return { ticketId: parts[1], scannedToken: trimmed };
  }

  return { ticketId: trimmed, scannedToken: null };
}

export default function AdminTicketsSearchPage() {
  const router = useRouter();
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketReview, setTicketReview] = useState<TicketReview | null>(null);

  const loadTicket = useCallback(
    async (value: string) => {
      setTicketReview(null);
      setError(null);
      try {
        const { ticketId, scannedToken } = parseTicketInput(value);
        if (!ticketId) {
          setError("Enter a ticket ID or scan a ticket QR code.");
          return;
        }
        setLoadingTicket(true);
        const ticket = (await adminApi.tickets.get(ticketId)) as TicketReviewData;
        const currentQrToken = ticket.qrToken ?? ticket.qr_token;
        setTicketReview({
          ticket,
          scannedToken,
          qrVerified:
            scannedToken !== null &&
            currentQrToken === scannedToken &&
            ticket.status === "ACTIVE",
        });
      } catch (inspectionError: unknown) {
        setError(
          inspectionError instanceof Error
            ? inspectionError.message
            : "Could not read that ticket.",
        );
      } finally {
        setLoadingTicket(false);
      }
    },
    [],
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void loadTicket(ticketIdInput);
  };

  const handleScan = useCallback(
    (value: string) => {
      setScanning(false);
      void loadTicket(value);
    },
    [loadTicket],
  );

  const toggleScanner = () => {
    setError(null);
    setScanning((current) => !current);
  };

  const scanNextTicket = () => {
    setTicketReview(null);
    setError(null);
    setTicketIdInput("");
    setScanning(true);
  };

  const reviewedTicket = ticketReview?.ticket;
  const ticketType =
    reviewedTicket?.ticket_type ??
    reviewedTicket?.ticketType ??
    reviewedTicket?.itemType ??
    "Ticket";
  const attendeeName = reviewedTicket?.beneficiary?.name || "Attendee";
  const attendeeEmail = reviewedTicket?.beneficiary?.email;
  const eventTitle = reviewedTicket?.event?.title;
  const checkedInAt =
    reviewedTicket?.event_checked_in_at ??
    reviewedTicket?.eventCheckedInAt ??
    null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
          TICKET LIFECYCLE & SECURITY
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Ticket Supervision & Check-in Overrides
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
          Inspect cryptographic passes, review scan logs, rotate leaked QR codes,
          reissue passes, or undo accidental check-ins.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#0C1017] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#55DFFF]/10 p-2.5 text-[#55DFFF]">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Enter ticket details</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Load a ticket by ID or paste its full QR token, such as{" "}
                <span className="font-mono text-cyan-300">tx1.tkt_...</span>.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-5 space-y-3">
            <label htmlFor="ticket-lookup" className="sr-only">
              Ticket ID or QR token
            </label>
            <input
              id="ticket-lookup"
              type="text"
              value={ticketIdInput}
              onChange={(e) => {
                setTicketIdInput(e.target.value);
                setError(null);
              }}
              placeholder="Ticket ID or paste QR token"
              autoComplete="off"
              disabled={loadingTicket}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-[#55DFFF] focus:ring-2 focus:ring-[#55DFFF]/20"
            />
            <button
              type="submit"
              disabled={loadingTicket || !ticketIdInput.trim()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#55DFFF] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#55DFFF]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingTicket ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Checking ticket...
                </>
              ) : (
                <>
                  Load ticket
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            QR tokens are checked against the current ticket. Entering an ID
            loads the record but does not verify its QR code or check anyone in.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0C1017] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#55DFFF]/10 p-2.5 text-[#55DFFF]">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">Scan ticket QR</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Scan a ticket to verify it and review the attendee here.
              </p>
            </div>
          </div>

          {loadingTicket ? (
            <div className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-slate-300">
              <LoaderCircle className="h-4 w-4 animate-spin text-[#55DFFF]" />
              Verifying ticket...
            </div>
          ) : scanning ? (
            <div className="mt-5">
              <TicketQrScanner
                onDetected={handleScan}
                onClose={() => setScanning(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleScanner}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#55DFFF]/40 bg-[#55DFFF]/10 px-5 py-3 text-sm font-semibold text-[#55DFFF] transition hover:border-[#55DFFF] hover:bg-[#55DFFF]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DFFF]"
            >
              <Camera className="h-4 w-4" />
              Open camera scanner
            </button>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Camera permission is requested only when scanning starts. The
            attendee summary stays here; ticket controls are optional.
          </p>
        </section>
      </div>

      {ticketReview && reviewedTicket && (
        <section
          aria-live="polite"
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0C1017]"
        >
          <div
            className={`flex items-start gap-3 border-b border-white/10 p-5 sm:p-6 ${
              ticketReview.qrVerified
                ? "bg-emerald-400/[0.07]"
                : "bg-amber-400/[0.06]"
            }`}
          >
            {ticketReview.qrVerified ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
            ) : (
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" />
            )}
            <div>
              <h2
                className={`text-lg font-semibold ${
                  ticketReview.qrVerified ? "text-emerald-200" : "text-amber-100"
                }`}
              >
                {ticketReview.qrVerified
                  ? "QR verified"
                  : ticketReview.scannedToken
                    ? "QR needs review"
                    : "Ticket record loaded"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {ticketReview.qrVerified
                  ? "This QR matches the current server-issued code for an active ticket. Review the attendee and pass details before continuing."
                  : ticketReview.scannedToken
                    ? "This QR does not match the current code for an active ticket. It may be outdated, invalid, or inactive."
                    : "The record was found by ID, but its QR code has not been verified."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs text-slate-400">Attendee</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <UserRound className="h-4 w-4 text-[#55DFFF]" />
                {attendeeName}
              </p>
              {attendeeEmail && (
                <p className="mt-1 break-all text-xs text-slate-400">
                  {attendeeEmail}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs text-slate-400">Pass</p>
              <p className="mt-1 font-semibold text-white">
                {ticketType.replace(/_/g, " ")}
                {reviewedTicket.tier ? ` · ${reviewedTicket.tier} tier` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Status: {reviewedTicket.status}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs text-slate-400">Event</p>
              <p className="mt-1 font-semibold text-white">
                {eventTitle || "Festival Gate Pass"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs text-slate-400">Event check-in</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Clock3 className="h-4 w-4 text-[#55DFFF]" />
                {checkedInAt ? "Already checked in" : "Not checked in"}
              </p>
              {checkedInAt && (
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(checkedInAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-6">
            <button
              type="button"
              onClick={scanNextTicket}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
            >
              <Camera className="h-4 w-4" />
              Check next attendee
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/admin/tickets/${encodeURIComponent(reviewedTicket.id)}`,
                )
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#55DFFF] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#55DFFF]/90"
            >
              Manage ticket
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          <p className="px-5 pb-5 text-xs leading-relaxed text-slate-500 sm:px-6 sm:pb-6">
            This page verifies and reviews the ticket only. No admission or
            check-in is performed. Open ticket management only if you need to
            revoke, rotate, or review its scan history.
          </p>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1017] p-5">
          <History className="h-6 w-6 text-[#55DFFF]" />
          <h3 className="mt-3 text-sm font-semibold text-white">Full Scan Trail</h3>
          <p className="mt-1 text-xs text-slate-400">
            Audit every admission, denial reason, and scanning staff volunteer timestamp.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1017] p-5">
          <Undo2 className="h-6 w-6 text-amber-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">Undo Check-in</h3>
          <p className="mt-1 text-xs text-slate-400">
            Safely reset single-use event admissions if scanned prematurely or by mistake.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1017] p-5">
          <RotateCw className="h-6 w-6 text-cyan-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">Rotate QR Token</h3>
          <p className="mt-1 text-xs text-slate-400">
            Instantly invalidate screenshots or leaked passes while keeping ticket active.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1017] p-5">
          <ShieldAlert className="h-6 w-6 text-red-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">Revoke & Reissue</h3>
          <p className="mt-1 text-xs text-slate-400">
            Revoke passes for disciplinary reasons or transfer ownership to a new student ID.
          </p>
        </div>
      </div>
    </div>
  );
}
