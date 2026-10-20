"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { ScanAdmitResult, ScanLookupResult } from "@/types/api"

// --------------------------------------------------------------------------
// Verdict helpers
// --------------------------------------------------------------------------

const VERDICT_CONFIG: Record<
  ScanLookupResult["verdict"],
  { label: string; color: string; bg: string; border: string }
> = {
  VALID: {
    label: "VALID",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  ALREADY_USED: {
    label: "ALREADY USED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  EXPIRED: {
    label: "EXPIRED",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
  },
  NOT_YET_VALID: {
    label: "NOT YET VALID",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
  },
  REVOKED: {
    label: "REVOKED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  PAYMENT_NOT_APPROVED: {
    label: "PAYMENT NOT APPROVED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  WRONG_EVENT: {
    label: "WRONG EVENT",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
  },
  WRONG_TICKET_TYPE: {
    label: "WRONG TICKET TYPE",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
  },
  INVALID: {
    label: "INVALID / TAMPERED",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
}

// --------------------------------------------------------------------------
// QR Scanner (html5-qrcode wrapper)
// --------------------------------------------------------------------------

interface QrScannerProps {
  onScan: (token: string) => void
  isDisabled: boolean
}

function QrScannerView({ onScan, isDisabled }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let stopped = false

    async function startScanner() {
      // Lazy-import html5-qrcode to avoid SSR errors
      const { Html5Qrcode } = await import("html5-qrcode")
      if (stopped || !containerRef.current) return

      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          if (!isDisabled && decodedText.startsWith("tx1.")) {
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50)
            onScan(decodedText)
          }
        },
        () => {
          // Ignore scan errors (just means no QR found in frame)
        }
      )
    }

    startScanner().catch(console.error)

    return () => {
      stopped = true
      const s = scannerRef.current as {
        stop?: () => Promise<void>
        clear?: () => void
      } | null
      s?.stop?.()
        .then(() => s?.clear?.())
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      id="qr-reader"
      ref={containerRef}
      className="overflow-hidden rounded-2xl"
      style={{ width: "100%", maxWidth: 360 }}
    />
  )
}

// --------------------------------------------------------------------------
// Lookup Result Modal
// --------------------------------------------------------------------------

interface LookupModalProps {
  result: ScanLookupResult
  token: string
  context: "GATE" | "EVENT"
  eventId: string | null
  onDismiss: () => void
}

function LookupModal({ result, token, context, eventId, onDismiss }: LookupModalProps) {
  const [studentIdChecked, setStudentIdChecked] = useState(false)
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null)

  const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.INVALID
  const ticket = result.ticket
  const canAdmit = result.verdict === "VALID"

  const { mutate: admit, isPending: isAdmitting } = useMutation({
    mutationFn: () =>
      apiRequest<ScanAdmitResult>("/api/staff/scan/admit", {
        method: "POST",
        body: JSON.stringify({
          token,
          context,
          event_id: eventId,
          student_id_checked: studentIdChecked,
          client_scan_id: crypto.randomUUID(),
        }),
      }),
    onSuccess: () => {
      setFlashColor("green")
      // Play chime
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } catch {
        // Audio not available
      }
      setTimeout(onDismiss, 1200)
    },
    onError: () => {
      setFlashColor("red")
      setTimeout(() => setFlashColor(null), 800)
    },
  })

  const { mutate: deny } = useMutation({
    mutationFn: () =>
      apiRequest("/api/staff/scan/deny", {
        method: "POST",
        body: JSON.stringify({
          token,
          context,
          reason: `Denied by staff. Verdict: ${result.verdict}`,
        }),
      }),
    onSettled: () => {
      setFlashColor("red")
      setTimeout(onDismiss, 800)
    },
  })

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* Flash overlay */}
      {flashColor && (
        <div
          className={`pointer-events-none fixed inset-0 z-[300] ${
            flashColor === "green" ? "bg-emerald-400/30" : "bg-red-500/30"
          }`}
        />
      )}

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onDismiss}
      />

      <div className="relative z-10 w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0f0f0f] p-5 pb-8 shadow-2xl sm:rounded-2xl sm:pb-6">
        {/* Verdict banner */}
        <div
          className={`mb-4 rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3 text-center`}
        >
          <p className={`font-[var(--font-gotham-bold)] text-lg ${cfg.color}`}>
            {cfg.label}
          </p>
          {result.reason && (
            <p className="mt-0.5 text-xs text-white/50">{result.reason}</p>
          )}
        </div>

        {/* Already-used warning */}
        {result.verdict === "ALREADY_USED" && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-3 text-center text-red-300">
            <p className="font-bold">TICKET ALREADY USED!</p>
            {result.recent_gate_entry_warning && (
              <p className="mt-1 text-xs">{result.recent_gate_entry_warning}</p>
            )}
          </div>
        )}

        {/* Invalid QR warning */}
        {result.verdict === "INVALID" && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-3 text-center text-red-300">
            <p className="font-bold">FAKE OR TAMPERED QR CODE!</p>
            <p className="text-xs">Signature verification failed.</p>
          </div>
        )}

        {/* Attendee details */}
        {ticket && (
          <div className="mb-4 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/50">Name</span>
              <span className="font-medium text-white">
                {ticket.beneficiary_name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Tier</span>
              <span className="text-white">{ticket.tier}</span>
            </div>
            {ticket.institution_name && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">Institution</span>
                <span className="text-right text-white">{ticket.institution_name}</span>
              </div>
            )}
            {ticket.institution_id && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">Student ID</span>
                <span className="font-mono text-white">{ticket.institution_id}</span>
              </div>
            )}
            {ticket.event && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">Event</span>
                <span className="text-white">{ticket.event.title}</span>
              </div>
            )}
          </div>
        )}

        {/* Student ID physical check */}
        {canAdmit && ticket?.requires_id_check && (
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <input
              type="checkbox"
              checked={studentIdChecked}
              onChange={(e) => setStudentIdChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-red-400"
            />
            <span className="font-semibold">
              ✓ Physically verified student ID card
            </span>
          </label>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => deny()}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60 transition hover:bg-white/5"
          >
            Deny
          </button>
          {canAdmit && (
            <button
              onClick={() => admit()}
              disabled={
                isAdmitting ||
                (ticket?.requires_id_check && !studentIdChecked)
              }
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {isAdmitting ? "Admitting…" : "Admit Attendee"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function StaffScanPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [context, setContext] = useState<"GATE" | "EVENT">("GATE")
  const [scannerActive, setScannerActive] = useState(false)
  const [lookupResult, setLookupResult] = useState<ScanLookupResult | null>(null)
  const [lastToken, setLastToken] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const { mutate: lookup, isPending: isLooking } = useMutation({
    mutationFn: (token: string) =>
      apiRequest<ScanLookupResult>("/api/staff/scan/lookup", {
        method: "POST",
        body: JSON.stringify({ token, context }),
      }),
    onSuccess: (data) => {
      setLookupResult(data)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        setScanError("Too many scans. Please wait 5 seconds before trying again.")
      } else {
        setScanError(
          err instanceof Error ? err.message : "Lookup failed"
        )
      }
    },
  })

  const handleScan = useCallback(
    (token: string) => {
      if (isLooking) return
      setLastToken(token)
      setScanError(null)
      lookup(token)
    },
    [isLooking, lookup]
  )

  const isStaff =
    user?.role === "VOLUNTEER" ||
    user?.role === "LEAD" ||
    user?.role === "SUPER_ADMIN"

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-white/40">
        <div>
          <p className="text-lg">Access Denied</p>
          <p className="mt-1 text-sm">Staff access required.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-32 pt-20 sm:px-6">
        {/* Header */}
        <div className="mb-5 text-center">
          <h1 className="font-[var(--font-gotham-bold)] text-2xl text-white">
            Gate Scanner
          </h1>
          <p className="text-sm text-white/50">TechXetra Staff — {user?.name}</p>
        </div>

        {/* Context Toggle */}
        <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(["GATE", "EVENT"] as const).map((ctx) => (
            <button
              key={ctx}
              onClick={() => setContext(ctx)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium uppercase tracking-wider transition ${
                context === ctx
                  ? "bg-cyan-300 text-black shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {ctx === "GATE" ? "🚪 Gate Entry" : "🎪 Event Entry"}
            </button>
          ))}
        </div>

        {/* Context info */}
        <p className="mb-5 text-center text-xs text-white/30">
          {context === "GATE"
            ? "Multi-entry gate pass scan"
            : "Single-use event slot scan"}
        </p>

        {/* Scanner */}
        <div className="relative flex flex-col items-center">
          {scannerActive ? (
            <>
              <div className="relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/10">
                <QrScannerView
                  onScan={handleScan}
                  isDisabled={isLooking || lookupResult !== null}
                />
                {/* Scanning indicator */}
                {isLooking && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                  </div>
                )}
              </div>

              <button
                onClick={() => setScannerActive(false)}
                className="mt-4 text-sm text-white/40 transition hover:text-white"
              >
                Stop Scanner
              </button>
            </>
          ) : (
            <button
              onClick={() => setScannerActive(true)}
              className="flex w-full max-w-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] py-16 transition hover:border-cyan-300/40 hover:bg-white/5"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-10 w-10 text-cyan-300/60"
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
                <path d="M13 13h2v2h-2zM17 13h3v3h-3zM13 17h5v4h-5z" fill="currentColor" />
              </svg>
              <span className="text-sm text-white/60">Tap to start camera</span>
            </button>
          )}

          {scanError && (
            <div className="mt-4 w-full max-w-[360px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
              {scanError}
            </div>
          )}
        </div>
      </main>

      {/* Lookup Modal */}
      {lookupResult && lastToken && (
        <LookupModal
          result={lookupResult}
          token={lastToken}
          context={context}
          eventId={null}
          onDismiss={() => {
            setLookupResult(null)
            setLastToken(null)
          }}
        />
      )}
    </>
  )
}
