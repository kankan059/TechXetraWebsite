"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function MePage() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center text-white/50">
        <p>Please sign in to view your profile.</p>
      </div>
    )
  }

  const completeness = user.profile_complete
  const missingFields = user.missing_fields

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-5 pb-32 pt-28 sm:px-8 sm:pt-32">
      {/* Avatar + Name */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-cyan-300/40 bg-white/10 text-2xl font-bold uppercase text-cyan-300">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            user.name.charAt(0)
          )}
        </div>
        <div>
          <h1 className="font-[var(--font-gotham-bold)] text-2xl text-white">
            {user.name}
          </h1>
          <p className="text-sm text-white/50">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-white/60">
            {user.role}
          </span>
        </div>
      </div>

      {/* Profile Completeness */}
      <div
        className={`mb-5 rounded-2xl border p-5 ${
          completeness
            ? "border-emerald-400/30 bg-emerald-400/5"
            : "border-amber-400/30 bg-amber-400/5"
        }`}
      >
        <div className="flex items-center gap-3">
          {completeness ? (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-emerald-400"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-emerald-400">
                Profile complete — you&apos;re ready to register!
              </p>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 shrink-0 text-amber-400"
              >
                <path
                  d="M12 9v4M12 17h.01M10.3 4.6 3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p className="text-sm text-amber-400">Profile incomplete</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Missing: {missingFields.join(", ")}
                </p>
              </div>
            </>
          )}
        </div>
        {!completeness && (
          <Link
            href="/me/profile"
            className="mt-3 block w-full rounded-xl bg-amber-400/20 py-2.5 text-center text-sm text-amber-300 transition hover:bg-amber-400/30"
          >
            Complete Profile →
          </Link>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-3">
        <Link
          href="/me/tickets"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-cyan-300"
            >
              <path
                d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1 1 1 0 0 0 0 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1 1 1 0 0 0 0-2 1 1 0 0 1-1-1V8Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-sm text-white">My Passes & Tickets</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/30">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <Link
          href="/checkout"
          className="flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-5 py-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
        >
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-cyan-300"
            >
              <path
                d="M3 6h2l1 10h12l2-7H7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.5" fill="currentColor" />
              <circle cx="17" cy="20" r="1.5" fill="currentColor" />
            </svg>
            <span className="text-sm font-medium text-cyan-200">
              Buy Gate Pass
            </span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-cyan-300/50">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        <Link
          href="/me/profile"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-white/60"
            >
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M4 20c.5-4 3-7 8-7s7.5 3 8 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm text-white">Edit Profile</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/30">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </Link>

        {/* Staff links */}
        {(user.role === "VOLUNTEER" ||
          user.role === "LEAD" ||
          user.role === "SUPER_ADMIN") && (
          <Link
            href="/staff/scan"
            className="flex items-center justify-between rounded-2xl border border-violet-400/20 bg-violet-400/5 px-5 py-4 transition hover:border-violet-400/40 hover:bg-violet-400/10"
          >
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-violet-400"
              >
                <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13 13h2v2h-2zM17 13h3v3h-3zM13 17h5v4h-5z" fill="currentColor" />
              </svg>
              <span className="text-sm text-violet-300">Staff Scanner</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-violet-400/50">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
        )}

        {/* Admin link */}
        {user.can_review_payments && (
          <Link
            href="/admin/payments"
            className="flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/5 px-5 py-4 transition hover:border-rose-400/40"
          >
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-rose-400">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-rose-300">Review Payments</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-rose-400/50">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        className="mt-8 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/40 transition hover:border-white/20 hover:text-white/70"
      >
        Sign Out
      </button>
    </main>
  )
}
