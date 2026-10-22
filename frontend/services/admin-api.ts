import { apiRequest } from "@/lib/api-client";

import type {
  DashboardSalesReport,
  DashboardRegistrationReport,
  DashboardPaymentReport,
  DashboardAttendanceReport,
  AdminUser,
  AdminEvent,
  AdminPayment,
  AdminTicket,
  AdminRegistration,
  AdminAuditLog,
  AdminSettings,
  PurchaseDetail,
  FestDay,
} from "@/types/api";

type QueryValue = string | number | boolean | undefined;

function queryString(params: Record<string, QueryValue> = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const adminApi = {
  reports: {
    sales: () =>
      apiRequest<DashboardSalesReport>("/api/admin/reports/sales"),

    pendingVerification: () =>
      apiRequest<DashboardPaymentReport>(
        "/api/admin/reports/pending-verification",
      ),

    registrations: () =>
      apiRequest<DashboardRegistrationReport>(
        "/api/admin/reports/registrations",
      ),

    attendance: () =>
      apiRequest<DashboardAttendanceReport>(
        "/api/admin/reports/attendance",
      ),

    reconciliation: () =>
      apiRequest<Record<string, unknown>>(
        "/api/admin/reports/reconciliation",
      ),

    failedFulfillment: () =>
      apiRequest<Record<string, unknown>>(
        "/api/admin/reports/failed-fulfillment",
      ),

    studentTier: () =>
      apiRequest<Record<string, unknown>>(
        "/api/admin/reports/student-tier",
      ),

    duplicateInstitutions: () =>
      apiRequest<Record<string, unknown>>(
        "/api/admin/reports/duplicate-institutions",
      ),
  },

  users: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{ users: AdminUser[]; next_cursor: string | null }>(
        `/api/admin/users${queryString(params)}`,
      ),

    get: (userId: string) =>
      apiRequest<AdminUser>(
        `/api/admin/users/${encodeURIComponent(userId)}`,
      ),

    preRegister: (body: {
      email: string;
      name: string;
      role: string;
      can_review_payments?: boolean;
    }) =>
      apiRequest<AdminUser>("/api/admin/users/pre-register", {
        method: "POST",
        body,
      }),

    update: (
      userId: string,
      body: {
        role?: string;
        is_active?: boolean;
        can_review_payments?: boolean;
      },
    ) =>
      apiRequest<AdminUser>(
        `/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  },

  events: {
    list: async (params?: Record<string, QueryValue>) => {
      const sanitized: Record<string, QueryValue> = { ...params };
      if (sanitized.limit && Number(sanitized.limit) > 50) {
        sanitized.limit = 50;
      }

      try {
        return await apiRequest<{ events: AdminEvent[]; next_cursor: string | null }>(
          `/api/admin/events${queryString(sanitized)}`,
        );
      } catch {
        // Fallback to public catalog /api/events (enforcing limit <= 50)
        const firstPage = await apiRequest<{ events: AdminEvent[]; next_cursor: string | null }>(
          `/api/events${queryString({ ...sanitized, limit: 50 })}`,
        );

        let allEvents = [...(firstPage.events || [])];
        let cursor = firstPage.next_cursor;

        // Auto-fetch subsequent pages if more than 50 events exist
        while (cursor) {
          try {
            const nextPage = await apiRequest<{ events: AdminEvent[]; next_cursor: string | null }>(
              `/api/events${queryString({ ...sanitized, limit: 50, cursor })}`,
            );
            if (nextPage.events && nextPage.events.length > 0) {
              allEvents = allEvents.concat(nextPage.events);
              cursor = nextPage.next_cursor;
            } else {
              break;
            }
          } catch {
            break;
          }
        }

        return {
          events: allEvents,
          next_cursor: null,
        };
      }
    },

    create: (body: unknown) =>
      apiRequest<AdminEvent>("/api/admin/events", {
        method: "POST",
        body,
      }),

    update: (eventId: string, body: unknown) =>
      apiRequest<AdminEvent>(`/api/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body,
      }),

    assignStaff: (
      eventId: string,
      body: { user_id: string; role: string },
    ) =>
      apiRequest<{ assigned: boolean }>(
        `/api/admin/events/${encodeURIComponent(eventId)}/staff`,
        {
          method: "POST",
          body,
        },
      ),

    removeStaff: (eventId: string, userId: string) =>
      apiRequest<{ removed: boolean }>(
        `/api/admin/events/${encodeURIComponent(eventId)}/staff/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      ),

    reopenScores: (eventId: string) =>
      apiRequest<{ reopened: boolean }>(
        `/api/admin/events/${encodeURIComponent(eventId)}/scores/reopen`,
        {
          method: "POST",
        },
      ),

    /**
     * DELETE /api/admin/events/:id
     * Safely deletes event (hard-deletes if 0 attendees; sets CANCELLED if attendees exist)
     */
    delete: (eventId: string) =>
      apiRequest<{ deleted: boolean; status: "DELETED" | "CANCELLED"; message: string }>(
        `/api/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
        },
      ),

    /**
     * GET /api/admin/events/:id/staff
     * Lists assigned staff members for an event
     */
    listStaff: (eventId: string) =>
      apiRequest<Array<{ user_id: string; role: "LEAD" | "VOLUNTEER"; name: string; email: string }>>(
        `/api/admin/events/${encodeURIComponent(eventId)}/staff`,
      ),

    /**
     * PATCH /api/admin/events/:id
     * Full Super Admin update across pricing, capacity, dates, status, and form schema
     */
    fullUpdate: (eventId: string, body: Record<string, any>) =>
      apiRequest<AdminEvent>(
        `/api/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  },

  payments: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{ payments: AdminPayment[]; next_cursor: string | null }>(
        `/api/admin/payments${queryString(params)}`,
      ),

    get: (paymentId: string) =>
      apiRequest<AdminPayment>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}`,
      ),

    approve: (paymentId: string, body?: { internal_note?: string }) =>
      apiRequest<{ id: string; status: string }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/approve`,
        {
          method: "POST",
          body: body ?? {},
        },
      ),

    reject: (
      paymentId: string,
      body: { reason: string; internal_note?: string },
    ) =>
      apiRequest<{ id: string; status: string }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/reject`,
        {
          method: "POST",
          body,
        },
      ),

    hold: (
      paymentId: string,
      body?: { reason?: string; internal_note?: string },
    ) =>
      apiRequest<{ id: string; status: string }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/hold`,
        {
          method: "POST",
          body: body ?? {},
        },
      ),

    unhold: (paymentId: string) =>
      apiRequest<{ id: string; status: string }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/unhold`,
        {
          method: "POST",
        },
      ),

    resubmit: (paymentId: string, body: { transaction_id: string }) =>
      apiRequest<{ id: string; status: string }>(
        `/api/admin/payments/${encodeURIComponent(paymentId)}/resubmit`,
        {
          method: "POST",
          body,
        },
      ),
  },

  purchases: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{
        purchases: PurchaseDetail[];
        next_cursor: string | null;
      }>(`/api/admin/purchases${queryString(params)}`),

    retryFulfillment: (purchaseId: string) =>
      apiRequest<{ fulfilled: boolean }>(
        `/api/admin/purchases/${encodeURIComponent(purchaseId)}/retry-fulfillment`,
        {
          method: "POST",
        },
      ),
  },

  tickets: {
    get: (ticketId: string) =>
      apiRequest<AdminTicket>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
      ),

    revoke: (ticketId: string, body: { reason: string }) =>
      apiRequest<AdminTicket>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/revoke`,
        {
          method: "POST",
          body,
        },
      ),

    reissue: (
      ticketId: string,
      body?: { new_beneficiary_id?: string; reason?: string },
    ) =>
      apiRequest<AdminTicket>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/reissue`,
        {
          method: "POST",
          body: body ?? {},
        },
      ),

    rotateQr: (ticketId: string) =>
      apiRequest<AdminTicket>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/rotate-qr`,
        {
          method: "POST",
        },
      ),

    undoCheckin: (ticketId: string, body: { reason: string }) =>
      apiRequest<{ undone: boolean }>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}/undo-checkin`,
        {
          method: "POST",
          body,
        },
      ),
  },

  registrations: {
    cancel: (registrationId: string, body?: unknown) =>
      apiRequest<AdminRegistration>(
        `/api/admin/registrations/${encodeURIComponent(registrationId)}/cancel`,
        {
          method: "POST",
          body: body ?? {},
        },
      ),

    replaceMember: (
      registrationId: string,
      body: {
        old_participant_id: string;
        new_participant_id: string;
        reason?: string;
      },
    ) =>
      apiRequest<AdminRegistration>(
        `/api/admin/registrations/${encodeURIComponent(registrationId)}/replace-member`,
        {
          method: "POST",
          body,
        },
      ),
  },

  auditLogs: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{
        audit_logs: AdminAuditLog[];
        next_cursor: string | null;
      }>(`/api/admin/audit-logs${queryString(params)}`),
  },

  settings: {
    get: () => apiRequest<AdminSettings>("/api/admin/settings"),
    update: (body: Record<string, unknown>) =>
      apiRequest<AdminSettings>("/api/admin/settings", {
        method: "PATCH",
        body,
      }),
  },

  festDays: {
    list: () => apiRequest<FestDay[]>("/api/admin/fest-days"),
    update: (dayNumber: number, body: Record<string, unknown>) =>
      apiRequest<FestDay>(`/api/admin/fest-days/${dayNumber}`, {
        method: "PATCH",
        body,
      }),
  },

  gateStaff: {
    list: () =>
      apiRequest<{ gate_staff: { id: string; user_id: string; user: AdminUser }[] }>(
        "/api/admin/gate-staff",
      ),
    assign: (body: { user_id: string }) =>
      apiRequest<{ assigned: boolean }>("/api/admin/gate-staff", {
        method: "POST",
        body,
      }),
    remove: (userId: string) =>
      apiRequest<{ removed: boolean }>(
        `/api/admin/gate-staff/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      ),
  },
};
