"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Ticket,
  GraduationCap,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { participantApi } from "@/services/participant-api";
import type { DigitalTicket } from "@/types/api";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<DigitalTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        await participantApi.auth.me();
      } catch {
        router.push(`/login?redirect=/tickets/${encodeURIComponent(id)}`);
        return;
      }

      const res = await participantApi.tickets.get(id);
      setTicket(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
  }, [id]);

  if (loading) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-xl animate-pulse space-y-6">
          <div className="h-6 w-32 rounded-lg bg-white/10" />
          <div className="h-96 rounded-3xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pt-32 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold">Ticket Not Found</h1>
          <p className="mt-2 text-sm text-white/50">
            {error || "This ticket could not be found or does not belong to your account."}
          </p>
          <Link
            href="/me/tickets"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-cyan-200"
          >
            ← View All My Tickets
          </Link>
        </div>
      </main>
    );
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    ticket.qr_token,
  )}`;

  const isGatePass = ticket.ticket_type === "GATE_PASS";
  const isValid = ticket.validity?.state === "VALID" || ticket.validity?.is_currently_valid;

  return (
    <main className="relative z-10 min-h-screen bg-[#07090e] px-4 pb-24 pt-32 text-white sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/me/tickets"
            className="inline-flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Tickets
          </Link>

          <button
            type="button"
            onClick={loadTicket}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Ticket presentation card */}
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.01] shadow-2xl backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300">
                    {ticket.ticket_type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-white/70">
                    {ticket.tier} TIER
                  </span>
                </div>

                <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
                  {ticket.event?.title || (isGatePass ? "TechXetra Gate Pass" : "Festival Pass")}
                </h1>
                <p className="mt-1 font-mono text-xs text-white/50">Ticket ID: {ticket.id}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isValid
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-red-400/15 text-red-300"
                }`}
              >
                {ticket.validity?.state || ticket.status}
              </span>
            </div>

            {/* Student ID Warning */}
            {ticket.tier === "STUDENT" && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200">
                <GraduationCap className="h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-300">Physical Student ID Required</p>
                  <p className="mt-0.5 text-white/70">
                    {ticket.student_id_warning ||
                      "You must present your physical college ID card alongside this QR badge at the gate."}
                  </p>
                </div>
              </div>
            )}

            {/* Event Check-in Status */}
            {ticket.event_checked_in_at && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Checked in on {new Date(ticket.event_checked_in_at).toLocaleString()}</span>
              </div>
            )}

            {/* QR Code Presentation */}
            <div className="my-8 flex flex-col items-center justify-center">
              <div className="overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
                <Image
                  src={qrImageUrl}
                  alt="Ticket QR Token"
                  width={260}
                  height={260}
                  unoptimized
                  className="rounded-lg"
                />
              </div>
              <p className="mt-3 text-center text-xs text-white/50">
                Show this barcode to the volunteer at the entrance scanner
              </p>
              <p className="mt-1 font-mono text-[10px] text-white/30">
                v{ticket.qr_version} · HMAC Authenticated
              </p>
            </div>

            {/* Event & Validity Details */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs">
              {ticket.event?.venue && (
                <div className="flex items-center gap-2 text-white/70">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  <span>Venue: <strong className="text-white">{ticket.event.venue}</strong></span>
                </div>
              )}

              {ticket.event?.day_of_event && (
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="h-4 w-4 text-cyan-300" />
                  <span>Festival Day: <strong className="text-white">Day {ticket.event.day_of_event}</strong></span>
                </div>
              )}

              {ticket.validity?.valid_from && (
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  <span>
                    Valid: {new Date(ticket.validity.valid_from).toLocaleDateString()} to{" "}
                    {new Date(ticket.validity.valid_to).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-white/70">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                <span>Order Reference: <strong className="text-white font-mono">{ticket.purchase_id}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
