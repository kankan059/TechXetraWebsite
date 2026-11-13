"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";

import {

  Ticket,

  RefreshCw,

  AlertTriangle,

  ArrowLeft,

  ArrowUpRight,

  CheckCircle2,

  GraduationCap,

  MessageCircle,
  Download,

} from "lucide-react";

import type { DigitalTicket, PreparingTicket } from "@/types/api";

import { participantApi } from "@/services/participant-api";

import { ApiError } from "@/lib/api-client";

import ParticipantPass from "@/components/sections/tickets/ParticipantPass";

import TicketsBackdrop from "@/components/sections/tickets/TicketsBackdrop";

/* ------------------------------------------------------------------ */

/* Mapping helpers: the API shape is read defensively, so a renamed    */

/* field never crashes the page. Adjust the key lists to your payload. */

/* ------------------------------------------------------------------ */

function pick(obj: unknown, keys: string[]): string {

  if (!obj || typeof obj !== "object") return "";

  const rec = obj as Record<string, unknown>;

  for (const key of keys) {

    const v = rec[key];

    if (typeof v === "string" && v.trim()) return v.trim();

  }

  return "";

}

function eventNames(tkt: DigitalTicket): string[] {

  const rec = tkt as unknown as Record<string, unknown>;

  const list = rec.events ?? rec.registered_events ?? rec.registeredEvents;

  if (Array.isArray(list)) {

    const names = list

      .map((e) => (typeof e === "string" ? e : pick(e, ["title", "name"])))

      .filter(Boolean);

    if (names.length) return names;

  }

  const title = tkt.event?.title;

  return title ? [title] : [];

}

function toPassProps(tkt: DigitalTicket) {

  const rec = tkt as unknown as Record<string, unknown>;

  const type = String(tkt.ticketType || tkt.ticket_type || "").toUpperCase();

  const tier = String(tkt.tier || "");

  const base = type.includes("DELEGATE") ? "Delegate" : "Participant";

  const tierLabel = tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : "";

  return {

    name:

      pick(tkt, ["participant_name", "participantName", "holder_name", "holderName", "user_name", "full_name", "name"]) ||

      pick(rec.user, ["full_name", "fullName", "name"]) ||

      pick(rec.participant, ["full_name", "fullName", "name"]) ||

      "TechXetra Participant",

    techxetraId:

      pick(tkt, ["participant_id", "participantId", "techxetra_id", "techxetraId", "user_code", "userCode"]) ||

      pick(rec.user, ["techxetra_id", "techxetraId", "participant_id", "participantId"]) ||

      tkt.id,

    category: tierLabel ? `${base} · ${tierLabel}` : base,

    events: eventNames(tkt),

    venue: tkt.event?.venue || undefined,

    qrValue: tkt.qrToken || tkt.qr_token || "",

    ticketNumber: tkt.id,

  };

}

function whatsappLink(tkt: DigitalTicket): string {

  const url = pick(tkt.event, ["whatsappUrl", "whatsapp_url"]);

  return /^https:\/\//i.test(url) ? url : "";

}

const STATE_STYLE: Record<string, string> = {

  VALID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",

  UPCOMING: "border-sky-400/30 bg-sky-400/10 text-sky-300",

};

/* ------------------------------------------------------------------ */

/* Page                                                                */

/* ------------------------------------------------------------------ */

export default function MyTicketsPage() {

  const router = useRouter();

  const [tickets, setTickets] = useState<DigitalTicket[]>([]);

  const [preparingTickets, setPreparingTickets] = useState<PreparingTicket[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {

    try {

      setLoading(true);

      setError(null);

      const data = await participantApi.tickets.myTickets();

      setTickets(

        (data?.tickets || []).filter(

          (ticket) => (ticket.ticketType || ticket.ticket_type) !== "GATE_PASS"

        )

      );

      setPreparingTickets(data?.preparing_tickets || []);

    } catch (err: unknown) {

      if (err instanceof ApiError && err.status === 401) {

        router.push("/login?redirect=/me/tickets");

        return;

      }

      setError(err instanceof Error ? err.message : "Could not load your passes. Try refreshing.");

    } finally {

      setLoading(false);

    }

  }, [router]);

  useEffect(() => {

    void fetchTickets();

  }, [fetchTickets]);

  const handleDownloadPass = async (ticketId: string) => {
    const wrapper = document.getElementById(`participant-pass-${ticketId}`);
    const passCard = wrapper?.querySelector("article");

    if (!passCard) {
      setError("Could not find your pass. Please refresh and try again.");
      return;
    }

    try {
      setDownloadingId(ticketId);
      setError(null);

      await document.fonts.ready;

      const dataUrl = await toPng(passCard as HTMLElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#080b25",
      });

      const link = document.createElement("a");
      link.download = `TechXetra-Pass-${ticketId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (downloadError) {
      console.error("Pass download failed:", downloadError);
      setError("Could not download your pass. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetryFulfillment = async (purchaseId: string) => {

    setRetryingId(purchaseId);

    setError(null);

    setSuccess(null);

    try {

      await participantApi.purchases.retryFulfillment(purchaseId);

      setSuccess("Pass generation started. Refreshing your tickets...");

      void fetchTickets();

    } catch (err: unknown) {

      setError(

        err instanceof Error

          ? err.message

          : "Retrying needs administrator approval. Please contact support."

      );

    } finally {

      setRetryingId(null);

    }

  };

  const hasContent = tickets.length > 0 || preparingTickets.length > 0;

  return (

    <>

      <TicketsBackdrop />

      <main className="relative min-h-screen px-4 pb-24 pt-28 text-white sm:px-8 sm:pt-32">

        <div className="mx-auto max-w-[1120px] space-y-8">

          <Link

            href="/dashboard"

            className="inline-flex items-center gap-2 text-xs text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"

          >

            <ArrowLeft className="h-4 w-4" />

            Back to dashboard

          </Link>

          {/* Header */}

          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">

            <div>

              <h1 className="text-3xl tracking-tight text-white font-roboto sm:text-5xl">

                Your passes

              </h1>

              <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-white/60">

                Show the QR on the right of your pass at the venue gate. Turn your screen brightness up

                before scanning.

              </p>

            </div>

            <button

              type="button"

              onClick={() => void fetchTickets()}

              disabled={loading}

              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-slate-200 transition-colors hover:border-cyan-300/40 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:opacity-60 sm:self-auto"

            >

              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />

              Refresh

            </button>

          </div>

          {/* Alerts */}

          {error && (

            <div

              role="alert"

              className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200"

            >

              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />

              <span>{error}</span>

            </div>

          )}

          {success && (

            <div

              role="status"

              className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200"

            >

              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />

              <span>{success}</span>

            </div>

          )}

          {/* Passes still being generated */}

          {preparingTickets.length > 0 && (

            <section className="rounded-2xl border border-blue-400/25 bg-blue-500/[0.07] p-5 sm:p-6">

              <div className="mb-4 flex items-center gap-2">

                <RefreshCw className="h-4 w-4 text-blue-300" />

                <h2 className="text-base text-white font-roboto">

                  Passes being prepared

                </h2>

              </div>

              <div className="space-y-3">

                {preparingTickets.map((prep) => (

                  <div

                    key={prep.purchase_id}

                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center"

                  >

                    <div className="min-w-0">

                      <p className="break-all text-sm font-semibold text-white">Order {prep.purchase_id}</p>

                      <p className="text-xs text-white/70">{prep.message}</p>

                      {prep.last_error && (

                        <p className="mt-1 text-[11px] text-red-300">Error: {prep.last_error}</p>

                      )}

                    </div>

                    {prep.can_retry && (

                      <button

                        type="button"

                        disabled={retryingId === prep.purchase_id}

                        onClick={() => void handleRetryFulfillment(prep.purchase_id)}

                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-blue-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-blue-300 disabled:opacity-50"

                      >

                        <RefreshCw

                          className={`h-3.5 w-3.5 ${retryingId === prep.purchase_id ? "animate-spin" : ""}`}

                        />

                        Retry pass generation

                      </button>

                    )}

                  </div>

                ))}

              </div>

            </section>

          )}

          {/* Passes */}

          {loading && tickets.length === 0 ? (

            <div aria-busy="true" aria-label="Loading passes" className="space-y-10">

              <div className="h-[420px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.03] max-[760px]:h-[620px]" />

            </div>

          ) : !hasContent ? (

            <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">

              <Ticket className="mx-auto mb-4 h-12 w-12 text-white/20" />

              <h3 className="text-lg text-white font-roboto">No passes yet</h3>

              <p className="mx-auto mt-1 max-w-[40ch] text-xs text-white/50">

                Register for an event and your pass will appear here.

              </p>

              <Link

                href="/events"

                className="mt-6 inline-block rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"

              >

                Browse events

              </Link>

            </div>

          ) : (

            <div className="space-y-12">

              {tickets.map((tkt) => {

                const wa = whatsappLink(tkt);

                const state = tkt.validity?.state || "VALID";

                const eventTitle = tkt.event?.title || "Event pass";

                return (

                  <section key={tkt.id} aria-label={eventTitle}>

                    {/* Above the pass: WhatsApp group + validity */}

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">

                      {wa ? (

                        <a

                          href={wa}

                          target="_blank"

                          rel="noopener noreferrer"

                          aria-label={`Join the WhatsApp group for ${eventTitle}`}

                          className="group inline-flex items-center gap-3 rounded-full border border-[#25D366]/30 bg-[#25D366]/[0.08] py-1.5 pl-1.5 pr-4 text-xs text-[#d4f8e1] transition-colors hover:border-[#25D366]/70 hover:bg-[#25D366]/[0.16] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366]"

                        >

                          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#25D366] text-black">

                            <MessageCircle className="h-4 w-4" />

                          </span>

                          <span className="font-roboto">Join the WhatsApp group</span>

                          <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />

                        </a>

                      ) : (

                        <p className="text-xs text-white/50">{eventTitle}</p>

                      )}

                      <span

                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${

                          STATE_STYLE[state] ?? "border-red-400/30 bg-red-400/10 text-red-300"

                        }`}

                      >

                        {state.charAt(0) + state.slice(1).toLowerCase()}

                      </span>

                    </div>

                    <div
                      id={`participant-pass-${tkt.id}`}
                      className="w-full"
                    >
                      <ParticipantPass {...toPassProps(tkt)} />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDownloadPass(tkt.id)}
                        disabled={downloadingId === tkt.id}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-300/50 hover:bg-cyan-300/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingId === tkt.id ? "Preparing PNG..." : "Download Pass"}
                      </button>
                    </div>

                    {tkt.tier === "STUDENT" && (

                      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5 text-xs text-amber-200">

                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />

                        <div>

                          <p className="font-semibold text-amber-100">Carry your student ID</p>

                          <p className="mt-0.5 text-[11px] text-amber-200/80">

                            {tkt.student_id_warning ||

                              "Your college ID card must be shown at the gate along with this pass."}

                          </p>

                        </div>

                      </div>

                    )}

                  </section>

                );

              })}

            </div>

          )}

        </div>

      </main>

    </>

  );

}