"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminUserDetail } from "@/types/api";
import { adminApi } from "@/services/admin-api";
import { ApiError } from "@/lib/api-client";

const ID_PREFIX = "TX26";

const CARD =
    "border border-[#55DFFF]/25 bg-transparent p-5 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]";

const SECTION =
    "border border-[#55DFFF]/25 bg-transparent p-6 shadow-[0_0_24px_rgba(85,223,255,0.035)] [clip-path:polygon(0_0,calc(100%_-_18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%_-_18px))]";

const HEADING = "font-[var(--font-gotham-bold)] font-semibold text-white";

// Backend may send seconds or milliseconds
function formatTimestamp(ts: number | null | undefined): string {
    if (!ts) return "—";
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms).toLocaleString();
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-white/40">{label}</span>
            <span className="max-w-[60%] truncate text-right text-white/80">{children}</span>
        </div>
    );
}

function Badge({ tone, children }: { tone: "green" | "amber" | "cyan" | "muted"; children: React.ReactNode }) {
    const tones = {
        green: "bg-[#8FE388]/10 text-[#8FE388]",
        amber: "bg-amber-400/10 text-[#FFB86B]",
        cyan: "bg-cyan-400/10 text-cyan-300",
        muted: "bg-white/10 text-white/50",
    };
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
            {children}
        </span>
    );
}

export default function UserLookupPage() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    const [digits, setDigits] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<AdminUserDetail | null>(null);

    const fullId = `${ID_PREFIX}${digits}`;
    const isValid = /^\d{4}$/.test(digits) && digits !== "0000";

    const handleSearch = async () => {
        if (!isValid) {
            setError("Enter a 4-digit number from 0001 to 9999.");
            return;
        }

        setLoading(true);
        setError(null);
        setUser(null);

        try {
            const data = await adminApi.users.getDetails(fullId);
            setUser(data);
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    router.replace("/login");
                    return;
                }
                if (err.status === 403) {
                    setError("Unauthorized: admin access required.");
                } else if (err.status === 404) {
                    setError(`No user found with ID ${fullId}.`);
                } else {
                    setError(err.message || "Failed to fetch user details.");
                }
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch user details.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setDigits("");
        setUser(null);
        setError(null);
        inputRef.current?.focus();
    };

    return (
        <main className="relative z-10 min-h-screen px-4 pb-20 pt-28 text-white font-pixel sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-7">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="[font-family:var(--font-gotham-bold)] text-2xl font-normal leading-tight tracking-normal sm:text-3xl">
                            User Lookup
                        </h1>
                        <p className="mt-1 text-sm text-white/50">
                            Find a participant by their TechXetra ID.
                        </p>
                    </div>
                </div>

                {/* Search card */}
                <div className={CARD}>
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <div>
                            <p className={HEADING}>Search by User ID</p>
                            <p className="text-xs text-white/50">
                                {ID_PREFIX} followed by 4 digits (0001–9999)
                            </p>
                        </div>
                    </div>

                    <form
                        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSearch();
                        }}
                    >
                        <div className="flex flex-1 items-stretch border border-white/10 bg-white/[0.03] focus-within:border-[#55DFFF]/60 focus-within:ring-2 focus-within:ring-[#55DFFF]/40">
                            <span className="flex items-center border-r border-white/10 bg-[#55DFFF]/10 px-4 font-mono text-sm font-semibold text-[#55DFFF]">
                                {ID_PREFIX}
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                autoFocus
                                maxLength={4}
                                placeholder="0001"
                                value={digits}
                                aria-label="Four digit user number"
                                onChange={(e) => {
                                    setDigits(e.target.value.replace(/\D/g, "").slice(0, 4));
                                    if (error) setError(null);
                                }}
                                className="w-full bg-transparent px-4 py-3 font-mono text-sm tracking-[0.3em] text-white placeholder:text-white/20 focus:outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || digits.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-none bg-[#55DFFF] px-6 py-3 text-xs font-semibold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-[#8BEAFF] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Searching…" : "Find user"}
                        </button>

                        {(user || error || digits) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="rounded-none border border-white/10 bg-white/[0.05] px-4 py-3 text-xs text-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55DFFF] cursor-pointer hover:bg-white/10 hover:text-white"
                            >
                                Clear
                            </button>
                        )}
                    </form>
                </div>

                {/* Error banner */}
                {error && (
                    <div
                        role="alert"
                        className="flex items-center justify-between rounded-none border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
                    >
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="text-xs text-white/60 hover:text-white cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="animate-pulse space-y-6">
                        <div className="h-40 rounded-none bg-white/5" />
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="h-60 rounded-none bg-white/5" />
                            <div className="h-60 rounded-none bg-white/5" />
                        </div>
                    </div>
                )}

                {/* Result */}
                {user && !loading && (
                    <>
                        {/* Identity + profile */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className={`${CARD} md:col-span-1`}>
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div>
                                        <p className={HEADING}>{user.name}</p>
                                        <p className="font-mono text-xs text-cyan-300">{user.id}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Badge tone="cyan">{user.role}</Badge>
                                    <Badge tone={user.isActive ? "green" : "amber"}>
                                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                                    </Badge>
                                </div>

                                <div className="mt-4 space-y-3 text-xs">
                                    <Row label="Email">{user.email}</Row>
                                    <Row label="Phone">{user.phone ? `+91 ${user.phone}` : "Not set"}</Row>
                                </div>
                            </div>

                            <div className={`${CARD} md:col-span-1`}>
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div>
                                        <p className={HEADING}>Academic Details</p>
                                        <p className="text-xs text-white/50">Student status & institution</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3 text-xs">
                                    <Row label="Student Status">{user.isStudent ? "Yes" : "General Attendee"}</Row>
                                    {user.isStudent && (
                                        <>
                                            <Row label="Institution">{user.institutionName || "—"}</Row>
                                            <Row label="Student ID">{user.institutionId || "—"}</Row>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className={`${CARD} md:col-span-1`}>
                                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div>
                                        <p className={HEADING}>Staff Roles</p>
                                        <p className="text-xs text-white/50">
                                            {user.staffAssignments?.length ?? 0} Assignments
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {user.staffAssignments?.length ? (
                                        user.staffAssignments.map((s) => (
                                            <div
                                                key={`${s.eventId}-${s.role}`}
                                                className="flex items-center justify-between rounded-none border border-white/5 bg-transparent p-2.5 text-xs"
                                            >
                                                <p className="font-medium text-white">{s.eventTitle}</p>
                                                <Badge tone="amber">{s.role.replace("_", " ")}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="py-6 text-center text-xs text-white/40">
                                            No staff roles assigned.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Events */}
                        <section className={SECTION}>
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="font-[var(--font-gotham-bold)] text-xl font-semibold text-white">
                                    Registered Events
                                </h2>
                                <span className="text-xs text-white/50">{user.events?.length ?? 0} total</span>
                            </div>

                            {!user.events?.length ? (
                                <div className="rounded-none border border-dashed border-white/10 py-12 text-center">
                                    <p className="text-sm text-white/50">
                                        This user hasn’t registered for any events.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {user.events.map((reg) => (
                                        <div
                                            key={reg.registrationId}
                                            className="relative overflow-hidden border border-[#55DFFF]/35 bg-transparent p-5 [clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_22px,100%_100%,22px_100%,0_calc(100%_-_22px))]"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-cyan-300">
                                                        {reg.event.category}
                                                    </span>
                                                    <h3 className="font-[var(--font-gotham-bold)] mt-2 text-lg font-bold text-white">
                                                        {reg.event.title}
                                                    </h3>
                                                    <p className="text-xs text-white/50">
                                                        Day {reg.event.festDay} · {reg.event.venue} · {reg.event.format}
                                                    </p>
                                                </div>

                                                <Badge tone={reg.registrationStatus === "CONFIRMED" ? "green" : "amber"}>
                                                    {reg.registrationStatus}
                                                </Badge>
                                            </div>

                                            <div className="mt-4 space-y-2 text-xs">
                                                <Row label="Registered">{formatTimestamp(reg.registeredAt)}</Row>
                                                <Row label="Type">{reg.event.isTeam ? "Team event" : "Individual"}</Row>
                                                {reg.team && <Row label="Team">{reg.team.name}</Row>}
                                            </div>

                                            <div className="mt-4 rounded-none border border-white/10 bg-transparent p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                                                    Ticket
                                                </p>
                                                {reg.ticket ? (
                                                    <>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <p className="break-all font-mono text-xs text-cyan-200">
                                                                {reg.ticket.publicId}
                                                            </p>
                                                            <Badge tone={reg.ticket.status === "VALID" ? "green" : "muted"}>
                                                                {reg.ticket.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="mt-2 text-[10px] text-white/30">
                                                            {reg.ticket.checkedInAt
                                                                ? `Checked in ${formatTimestamp(reg.ticket.checkedInAt)}`
                                                                : "Not checked in"}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="mt-1 text-xs text-white/40">No ticket issued.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Teams */}
                        <section className={SECTION}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-[var(--font-gotham-bold)] text-xl font-semibold text-white">
                                    Teams
                                </h2>
                                <span className="text-xs text-white/50">{user.teams?.length ?? 0} total</span>
                            </div>

                            {!user.teams?.length ? (
                                <p className="py-6 text-center text-xs text-white/40">
                                    This user isn’t part of any team.
                                </p>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {user.teams.map((t) => (
                                        <div
                                            key={t.id}
                                            className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{t.name}</p>
                                                <p className="text-xs text-white/50">{t.eventTitle}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge tone={t.isLeader ? "cyan" : "muted"}>{t.role}</Badge>
                                                <Badge tone={t.status === "ACCEPTED" ? "green" : "amber"}>
                                                    {t.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div>
                            <Link
                                href="/admin/users"
                                className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                            >
                                ← Back to all users
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}