"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Ticket,
  GraduationCap,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import type { DigitalTicket, PreparingTicket } from "@/types/api";
import { participantApi } from "@/services/participant-api";
import { ApiError } from "@/lib/api-client";

export default function MyTicketsPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [preparingTickets, setPreparingTickets] = useState<PreparingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await participantApi.tickets.myTickets();
      setTickets(data?.tickets || []);
      setPreparingTickets(data?.preparing_tickets || []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login?redirect=/me/tickets");
        return;
      }
      setError(err instanceof Error ? err.message : "Error loading passes");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const handleRetryFulfillment = async (purchaseId: string) => {
    setRetryingId(purchaseId);
    setError(null);
    setSuccess(null);

    try {
      await participantApi.purchases.retryFulfillment(purchaseId);
      setSuccess("Pass generation initiated! Refreshing tickets...");
      void fetchTickets();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Fulfillment retry requires administrator approval. Please contact support."
      );
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <main className="relative z-10 min-h-screen px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              ADMISSION & VERIFICATION
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Digital Tickets & Passes
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Present your signed QR token at fest gates and event venues for contactless check-in.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchTickets()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Passes
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Preparing Tickets Section */}
        {preparingTickets.length > 0 && (
          <section className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-6">
            <div className="mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-300" />
              <h2 className="text-lg font-semibold text-white">Tickets Preparing in Background</h2>
            </div>

            <div className="space-y-3">
              {preparingTickets.map((prep) => (
                <div
                  key={prep.purchase_id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-white">Order {prep.purchase_id}</p>
                    <p className="text-xs text-white/70">{prep.message}</p>
                    {prep.last_error && (
                      <p className="mt-1 text-[11px] text-red-300">
                        Error: {prep.last_error}
                      </p>
                    )}
                  </div>

                  {prep.can_retry && (
                    <button
                      type="button"
                      disabled={retryingId === prep.purchase_id}
                      onClick={() => handleRetryFulfillment(prep.purchase_id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-blue-300 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${retryingId === prep.purchase_id ? "animate-spin" : ""}`}
                      />
                      Retry Pass Fulfillment
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pass Presentation Grid */}
        {loading ? (
          <div className="py-24 text-center text-sm text-white/40">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-300" />
            Loading passes and cryptographic QR tokens...
          </div>
        ) : tickets.length === 0 && preparingTickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-white/40">
            <Ticket className="mx-auto mb-4 h-12 w-12 text-white/20" />
            <h3 className="text-lg font-semibold text-white">No active passes found</h3>
            <p className="mt-1 text-xs text-white/50">
              You haven&apos;t completed any pass purchases or event registrations yet.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/checkout"
                className="rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-200"
              >
                Get Festival Gate Pass
              </Link>
              <Link
                href="/events"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {tickets.map((tkt) => {
              const tokenValue = tkt.qrToken || tkt.qr_token || "";
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
                tokenValue,
              )}`;

              const isGatePass = (tkt.ticketType || tkt.ticket_type) === "GATE_PASS";

              return (
                <div
                  key={tkt.id}
                  className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.01] shadow-2xl backdrop-blur-xl"
                >
                  {/* Pass Header */}
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300">
                            {tkt.ticketType || tkt.ticket_type}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-white/70">
                            {tkt.tier} TIER
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
                          {tkt.event?.title || (isGatePass ? "TechXetra Gate Pass" : "Event Pass")}
                        </h2>
                        <p className="mt-1 text-xs text-white/50">Pass ID: {tkt.id}</p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tkt.validity?.state === "VALID"
                            ? "bg-emerald-400/15 text-emerald-300"
                            : tkt.validity?.state === "UPCOMING"
                            ? "bg-blue-400/15 text-blue-300"
                            : "bg-red-400/15 text-red-300"
                        }`}
                      >
                        {tkt.validity?.state || "VALID"}
                      </span>
                    </div>

                    {/* Student Verification Badge */}
                    {tkt.tier === "STUDENT" && (
                      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-200">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <div>
                          <p className="font-semibold text-amber-100">Student ID Verification Required</p>
                          <p className="mt-0.5 text-[11px] text-amber-200/80">
                            {tkt.student_id_warning ||
                              "Physical college institution ID card must be presented at scan admission."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Venue & Timing */}
                    <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-white/60">
                      {tkt.event?.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-white/40" />
                          <span>Venue: {tkt.event.venue}</span>
                        </div>
                      )}
                      {(tkt.event?.day_of_event || (tkt.event as any)?.festDay) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-white/40" />
                          <span>Day {tkt.event?.day_of_event || (tkt.event as any)?.festDay} of TechXetra 2026</span>
                        </div>
                      )}
                      {tkt.validity?.valid_from && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-white/40" />
                          <span>
                            Valid: {new Date(tkt.validity.valid_from).toLocaleDateString()} –{" "}
                            {new Date(tkt.validity.valid_to).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Official WhatsApp Group for Confirmed Attendees */}
                    {(tkt.event?.whatsappUrl || (tkt.event as any)?.whatsapp_url) && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <a
                          href={tkt.event?.whatsappUrl || (tkt.event as any)?.whatsapp_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-black transition hover:bg-[#20bd5a] hover:shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                        >
                          <MessageCircle className="h-4 w-4 fill-current" />
                          Join Event WhatsApp Group
                        </a>
                      </div>
                    )}
                  </div>

                  {/* High Contrast QR Code Presentation */}
                  <div className="border-t border-white/10 bg-black/40 p-6 sm:p-7 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                      Physical Gate & Venue Scanner QR
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/40">
                      Hold screen under volunteer scanner with full brightness
                    </p>

                    <div className="mx-auto mt-4 flex w-fit items-center justify-center rounded-2xl bg-white p-4 shadow-xl">
                      {/* High-contrast QR image */}
                      <Image
                        src={qrImageUrl}
                        alt={`QR Pass for ${tkt.id}`}
                        width={200}
                        height={200}
                        unoptimized
                        className="h-48 w-48 object-contain"
                      />
                    </div>

                    <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left">
                      <p className="text-[10px] font-mono uppercase text-white/40">HMAC QR Signature</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-cyan-200/90">
                        {tokenValue}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
