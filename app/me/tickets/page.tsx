"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { DigitalTicket } from "@/types/api"
import { QRCodeSVG } from "qrcode.react"

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function formatDateRange(fromMs: number, toMs: number): string {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${fmt.format(new Date(fromMs))} – ${fmt.format(new Date(toMs))}`
}

function passTitle(ticket: DigitalTicket): string {
  if (ticket.ticket_type === "GATE_PASS") return "Gate Pass — 3 Day"
  return ticket.event?.title ?? "Event Pass"
}

// --------------------------------------------------------------------------
// Ticket Card
// --------------------------------------------------------------------------

function TicketCard({ ticket }: { ticket: DigitalTicket }) {
  const [showQr, setShowQr] = useState(false)

  const isGate = ticket.ticket_type === "GATE_PASS"
  const accentColor = isGate ? "#67e8f9" : "#a78bfa"

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
        style={{ boxShadow: `0 0 0 1px ${accentColor}15` }}
      >
        {/* Status badge */}
        <span
          className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            ticket.status === "ACTIVE"
              ? "bg-emerald-500/20 text-emerald-400"
              : ticket.status === "REVOKED"
                ? "bg-red-500/20 text-red-400"
                : "bg-white/10 text-white/40"
          }`}
        >
          {ticket.status}
        </span>

        {/* Ticket type label */}
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: accentColor }}
        >
          {ticket.ticket_type === "GATE_PASS" ? "Gate Pass" : "Event Pass"} ·{" "}
          {ticket.tier}
        </p>

        {/* Title */}
        <h3 className="mb-0.5 font-[var(--font-gotham-bold)] text-lg text-white">
          {passTitle(ticket)}
        </h3>

        {/* Validity */}
        <p className="mb-4 text-sm text-white/50">
          {formatDateRange(ticket.valid_from, ticket.valid_to)}
        </p>

        {/* Physical ID warning */}
        {ticket.physical_id_required && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M12 9v4M12 17h.01M10.3 4.6 3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span>
              <strong>Physical ID Required:</strong> Present your original
              college ID card at the gate along with this QR code.
            </span>
          </div>
        )}

        {/* Show QR Button */}
        <button
          onClick={() => setShowQr(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium uppercase tracking-widest transition"
          style={{
            borderColor: `${accentColor}50`,
            color: accentColor,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="3"
              width="8"
              height="8"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <rect
              x="13"
              y="3"
              width="8"
              height="8"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <rect
              x="3"
              y="13"
              width="8"
              height="8"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M13 13h2v2h-2zM17 13h3v3h-3zM13 17h5v4h-5z"
              fill="currentColor"
            />
          </svg>
          Show QR Code
        </button>
      </div>

      {/* QR Modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`QR code for ${passTitle(ticket)}`}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowQr(false)}
          />
          <div className="relative z-10 flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl sm:p-8">
            {/* Close */}
            <button
              onClick={() => setShowQr(false)}
              className="absolute right-4 top-4 text-white/40 transition hover:text-white"
              aria-label="Close QR modal"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <p
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: accentColor }}
            >
              {passTitle(ticket)}
            </p>

            {/* High-contrast QR on white background */}
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG
                value={ticket.qr_token}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            {ticket.physical_id_required && (
              <p className="max-w-[240px] text-center text-xs text-amber-300">
                ⚠️ Have your physical college ID card ready.
              </p>
            )}

            <p className="max-w-[240px] break-all text-center font-mono text-[10px] text-white/30">
              {ticket.qr_token}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function MyTicketsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const {
    data: tickets,
    isLoading,
    isError,
    error,
  } = useQuery<DigitalTicket[]>({
    queryKey: ["tickets", "me"],
    queryFn: () => apiRequest<DigitalTicket[]>("/api/tickets/me"),
    enabled: isAuthenticated,
  })

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-white/50">
        <p>Please sign in to view your tickets.</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-red-400">
        <p>
          Failed to load tickets:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
      <h1 className="mb-2 font-[var(--font-gotham-bold)] text-3xl text-white">
        My Passes
      </h1>
      <p className="mb-8 text-sm text-white/50">
        Your gate passes and event tickets. Tap any card to reveal its QR code.
      </p>

      {!tickets || tickets.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-16 text-center text-white/40">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="mx-auto mb-4 h-12 w-12 opacity-30"
            aria-hidden="true"
          >
            <path
              d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1 1 1 0 0 0 0 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1 1 1 0 0 0 0-2 1 1 0 0 1-1-1V8Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <p className="text-sm">No passes yet.</p>
          <p className="mt-1 text-xs">
            Purchase a Gate Pass or register for an event to see tickets here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </main>
  )
}
