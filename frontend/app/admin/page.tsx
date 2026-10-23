"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/services/admin-api";
import {
  adaptAttendanceReport,
  adaptSalesReport,
  adaptPendingReport,
} from "@/lib/report-adapters";

import type {
  SalesReport,
  PendingVerificationReport,
  EventRegistrationsReport,
  AttendanceReport,
} from "@/types/api";

type DashboardData = {
  sales: SalesReport;
  pending: PendingVerificationReport;
  registrations: EventRegistrationsReport;
  attendance: AttendanceReport;
};

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0C1017] p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#E8EDF4] sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#0C1017] p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[#E8EDF4]">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const [salesRes, pendingRes, registrationsRes, attendanceRes] =
        await Promise.allSettled([
          adminApi.reports.sales(),
          adminApi.reports.pendingVerification(),
          adminApi.reports.registrations(),
          adminApi.reports.attendance(),
        ]);

      setData({
        sales:
          salesRes.status === "fulfilled" ? salesRes.value : adaptSalesReport({}),
        pending:
          pendingRes.status === "fulfilled"
            ? pendingRes.value
            : adaptPendingReport([]),
        registrations: (registrationsRes.status === "fulfilled" &&
          Array.isArray(registrationsRes.value)
          ? registrationsRes.value
          : []) as EventRegistrationsReport,
        attendance:
          attendanceRes.status === "fulfilled"
            ? attendanceRes.value
            : adaptAttendanceReport({}),
      });

    } catch (err) {
      console.error("Failed to load admin dashboard:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8EDF4]">
            Overview
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Loading your dashboard data...
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-white/[0.07] bg-[#0C1017]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-[#0C1017] p-6">
        <h1 className="text-xl font-semibold text-[#E8EDF4]">
          Dashboard unavailable
        </h1>

        <p className="mt-3 text-sm text-slate-400">
          {error || "Dashboard data could not be loaded."}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Check your backend server and make sure you are signed in with a
          Super Admin account.
        </p>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-5 rounded-xl bg-[#55DFFF] px-4 py-2.5 text-sm font-semibold text-[#080B10] transition hover:bg-[#9BEAFF]"
        >
          Try again
        </button>
      </div>
    );
  }

  const { sales, pending, registrations, attendance } = data;
  const regList = Array.isArray(registrations) ? registrations : [];

  const confirmedSeats = regList.reduce(
    (total, event) => total + Number(event.confirmed_seats_count || 0),
    0,
  );

  const reservedSeats = regList.reduce(
    (total, event) => total + Number(event.reserved_seats_count || 0),
    0,
  );

  const eventsWithRegistrations = [...regList].sort(
    (a, b) =>
      Number(b.confirmed_seats_count || 0) -
      Number(a.confirmed_seats_count || 0),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#55DFFF]">
            TECHXETRA ADMIN
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF4] sm:text-3xl">
            Overview
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Live reports from your event management backend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="w-fit rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-[#55DFFF]/40 hover:text-[#55DFFF]"
        >
          Refresh data
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid Purchases"
          value={formatNumber(Number(sales.paid_count || 0))}
          description="Purchases with PAID status"
        />

        <StatCard
          label="Revenue"
          value={formatCurrency(Number(sales.paid_total_amount_paise || 0))}
          description="Total recorded paid purchase value"
        />

        <StatCard
          label="Pending Verification"
          value={formatNumber(Number(pending.pending_count || 0))}
          description={`${formatNumber(Number(pending.overdue_count || 0))} older than 24 hours`}
        />

        <StatCard
          label="Gate Attendees"
          value={formatNumber(
            Number(attendance.unique_gate_attendees_count || 0),
          )}
          description="Unique admitted ticket beneficiaries"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Event Registrations"
          description="Confirmed and reserved registrations reported by event."
        >
          {registrations.length === 0 ? (
            <EmptyState message="No event registration data available." />
          ) : (
            <div className="space-y-5">
              {eventsWithRegistrations.map((event) => {
                const confirmed = Number(event.confirmed_seats_count || 0);
                const reserved = Number(event.reserved_seats_count || 0);
                const capacity = Number(event.capacity || 0);
                const used = confirmed + reserved;
                const percentage =
                  capacity > 0
                    ? Math.min((used / capacity) * 100, 100)
                    : 0;

                return (
                  <div key={event.event_id} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-[#E8EDF4]">
                          {event.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Day {event.day_of_event} ·{" "}
                          {formatNumber(
                            Number(event.confirmed_registrations_count || 0),
                          )}{" "}
                          confirmed registrations
                        </p>
                      </div>

                      <p className="shrink-0 text-sm text-slate-300">
                        {formatNumber(confirmed)} /{" "}
                        {capacity > 0 ? formatNumber(capacity) : "—"}
                      </p>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#55DFFF] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between gap-3 text-xs text-slate-500">
                      <span>{formatNumber(reserved)} reserved seats</span>
                      <span>{Math.round(percentage)}% of capacity</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Attendance by Day"
          description="Gate admissions recorded during each fest day."
        >
          {attendance.gate_admissions_by_day.length === 0 ? (
            <EmptyState message="No gate attendance data available." />
          ) : (
            <div className="space-y-5">
              {attendance.gate_admissions_by_day.map((day) => {
                const maxAdmissions = Math.max(
                  ...attendance.gate_admissions_by_day.map((item) =>
                    Number(item.admissions_count || 0),
                  ),
                  1,
                );

                const count = Number(day.admissions_count || 0);
                const percentage = (count / maxAdmissions) * 100;

                return (
                  <div key={`${day.day_number}-${day.date}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#E8EDF4]">
                          Day {day.day_number}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(day.date)}
                        </p>
                      </div>

                      <p className="text-sm font-medium text-slate-300">
                        {formatNumber(count)}
                      </p>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#55DFFF]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Payment Verification Queue"
        description="Oldest pending verifications returned by the backend."
      >
        {pending.items.length === 0 ? (
          <EmptyState message="There are no pending payment verifications." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs text-slate-500">
                  <th className="px-3 py-3 font-medium">Buyer</th>
                  <th className="px-3 py-3 font-medium">Transaction ID</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Verification age</th>
                </tr>
              </thead>

              <tbody>
                {pending.items.slice(0, 8).map((payment) => (
                  <tr
                    key={payment.payment_id}
                    className="border-b border-white/[0.05] last:border-0"
                  >
                    <td className="px-3 py-4">
                      <p className="font-medium text-[#E8EDF4]">
                        {payment.buyer_name || "Unknown buyer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {payment.buyer_email}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-slate-400">
                      {payment.transaction_id || "Not provided"}
                    </td>

                    <td className="px-3 py-4 text-slate-300">
                      {formatCurrency(
                        Number(payment.expected_amount_paise || 0),
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${payment.is_overdue
                          ? "bg-red-400/10 text-red-300"
                          : "bg-amber-400/10 text-amber-300"
                          }`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-slate-400">
                      {Math.max(
                        0,
                        Math.floor(Number(payment.age_ms || 0) / 3_600_000),
                      )}
                      h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Sales Breakdown"
        description="Recorded purchase totals grouped by status."
      >
        {sales.totals_by_status.length === 0 ? (
          <EmptyState message="No purchase data available." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sales.totals_by_status.map((item) => (
              <div
                key={item.status}
                className="rounded-xl border border-white/[0.06] p-4"
              >
                <p className="text-xs text-slate-500">{item.status}</p>

                <p className="mt-2 text-xl font-semibold text-[#E8EDF4]">
                  {formatNumber(Number(item.count || 0))}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {formatCurrency(Number(item.total_amount_paise || 0))}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Event Admissions"
        description="Admitted entries recorded for individual events."
      >
        {attendance.event_admissions.length === 0 ? (
          <EmptyState message="No event admission data available." />
        ) : (
          <div className="space-y-3">
            {attendance.event_admissions.map((event) => (
              <div
                key={event.event_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] p-4"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-[#E8EDF4]">
                    {event.event_title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Day {event.day_of_event}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-semibold text-[#55DFFF]">
                  {formatNumber(Number(event.admissions_count || 0))}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}