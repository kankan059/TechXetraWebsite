"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Search,
  ArrowRight,
  ShieldAlert,
  History,
  RotateCw,
  Undo2,
  AlertCircle,
} from "lucide-react";

export default function AdminTicketsSearchPage() {
  const router = useRouter();
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = ticketIdInput.trim();
    if (!trimmed) return;

    // Support entering raw token tx1.tkt_xxx.1.sig by extracting ticket ID
    let finalId = trimmed;
    if (trimmed.startsWith("tx1.")) {
      const parts = trimmed.split(".");
      if (parts.length >= 2) {
        finalId = parts[1];
      }
    }

    router.push(`/admin/tickets/${encodeURIComponent(finalId)}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#55DFFF]">
          TICKET LIFECYCLE & SECURITY
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Ticket Supervision & Check-in Overrides
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Inspect cryptographic passes, review scan logs, rotate leaked QR codes, reissue passes, or undo accidental check-ins.
        </p>
      </div>

      {/* Ticket Lookup Form */}
      <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Inspect Ticket by ID or Scanned Token</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter the ticket UUID (e.g. <span className="font-mono text-cyan-300">tkt_01j8n45c2m10ab</span>) or paste the full scanned QR token (<span className="font-mono text-cyan-300">tx1.tkt_...</span>).
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={ticketIdInput}
              onChange={(e) => setTicketIdInput(e.target.value)}
              placeholder="Enter ticket ID or paste scanned token..."
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-[#55DFFF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#55DFFF] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#55DFFF]/90"
          >
            Inspect Ticket
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Capabilities Overview Cards */}
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
