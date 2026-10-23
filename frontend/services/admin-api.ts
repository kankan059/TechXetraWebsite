import { apiRequest } from "@/lib/api-client";
import { normalizeEventItem } from "@/services/participant-api";

import type {
  DashboardSalesReport,
  DashboardRegistrationReport,
  DashboardPaymentReport,
  DashboardAttendanceReport,
  AdminUser,
  AdminEvent,
  AdminPayment,
  PaymentDecisionBody,
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
    summary: () =>
      apiRequest<Record<string, unknown>>("/admin/reports/summary"),

    sales: () =>
      apiRequest<DashboardSalesReport>("/admin/reports/financial"),

    pendingVerification: () =>
      apiRequest<DashboardPaymentReport>(
        "/admin/payments?status=PENDING",
      ),

    registrations: () =>
      apiRequest<DashboardRegistrationReport>(
        "/admin/reports/summary",
      ),

    attendance: () =>
      apiRequest<DashboardAttendanceReport>(
        "/admin/reports/attendance",
      ),

    reconciliation: () =>
      apiRequest<Record<string, unknown>>(
        "/admin/reports/financial",
      ),

    failedFulfillment: () =>
      apiRequest<Record<string, unknown>>(
        "/admin/reports/summary",
      ),

    studentTier: () =>
      apiRequest<Record<string, unknown>>(
        "/admin/reports/summary",
      ),

    duplicateInstitutions: () =>
      apiRequest<Record<string, unknown>>(
        "/admin/reports/summary",
      ),
  },

  users: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{ users: AdminUser[]; next_cursor: string | null }>(
        `/admin/users${queryString(params)}`,
      ),

    get: (userId: string) =>
      apiRequest<AdminUser>(
        `/admin/users/${encodeURIComponent(userId)}`,
      ),

    preRegister: async (body: {
      email: string;
      name: string;
      role: string;
      can_review_payments?: boolean;
    }): Promise<AdminUser> => {
      // Backend does not have /admin/users/pre-register route.
      throw new Error(
        "Pre-registration is not supported by the backend. User must first sign in, after which an admin can update their role.",
      );
    },

    update: (
      userId: string,
      body: {
        role?: string;
        is_active?: boolean;
        isActive?: boolean;
        can_review_payments?: boolean;
        canReviewPayments?: boolean;
      },
    ) =>
      apiRequest<AdminUser>(
        `/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  },

  events: {
    list: async (
      params?: Record<string, QueryValue>,
    ): Promise<{ events: AdminEvent[]; next_cursor: string | null; total?: number }> => {
      const sanitized: Record<string, QueryValue> = { ...params };
      if (sanitized.limit && Number(sanitized.limit) > 100) {
        sanitized.limit = 100;
      }
      const raw = await apiRequest<
        | AdminEvent[]
        | { events?: AdminEvent[]; items?: AdminEvent[]; next_cursor?: string | null; total?: number }
      >(`/events${queryString(sanitized)}`);

      let items: AdminEvent[] = [];
      let nextCursor: string | null = null;
      let total: number | undefined = undefined;

      if (Array.isArray(raw)) {
        items = raw;
        total = raw.length;
      } else if (raw && Array.isArray(raw.events)) {
        items = raw.events;
        nextCursor = raw.next_cursor ?? null;
        total = raw.total ?? items.length;
      } else if (raw && Array.isArray(raw.items)) {
        items = raw.items;
        total = raw.total ?? items.length;
      }

      const normalized = items.map((item) => normalizeEventItem(item) as AdminEvent);

      return {
        events: normalized,
        next_cursor: nextCursor,
        total: total ?? normalized.length,
      };
    },

    create: (body: unknown) =>
      apiRequest<AdminEvent>("/admin/events", {
        method: "POST",
        body,
      }),

    update: (eventId: string, body: unknown) =>
      apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        body,
      }),

    publish: (eventId: string) =>
      apiRequest<{ published: boolean }>(`/admin/events/${encodeURIComponent(eventId)}/publish`, {
        method: "POST",
      }),

    cancel: (eventId: string) =>
      apiRequest<{ cancelled: boolean }>(`/admin/events/${encodeURIComponent(eventId)}/cancel`, {
        method: "POST",
      }),

    assignStaff: (
      eventId: string,
      body: { user_id?: string; userId?: string; role: string },
    ) =>
      apiRequest<{ assigned: boolean }>(
        `/admin/events/${encodeURIComponent(eventId)}/staff`,
        {
          method: "POST",
          body: {
            userId: body.userId || body.user_id,
            role: body.role,
          },
        },
      ),

    removeStaff: (eventId: string, userId: string) =>
      apiRequest<{ removed: boolean }>(
        `/admin/events/${encodeURIComponent(eventId)}/staff/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        },
      ),

    reopenScores: (eventId: string) =>
      apiRequest<{ reopened: boolean }>(
        `/staff/events/${encodeURIComponent(eventId)}/reopen`,
        {
          method: "POST",
        },
      ),

    delete: (eventId: string) =>
      apiRequest<{ deleted: boolean; status: "DELETED" | "CANCELLED"; message: string }>(
        `/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
        },
      ),

    listStaff: (eventId: string) =>
      apiRequest<Array<{ user_id: string; role: "LEAD" | "VOLUNTEER"; name: string; email: string }>>(
        `/admin/events/${encodeURIComponent(eventId)}/staff`,
      ),

    fullUpdate: (eventId: string, body: Record<string, unknown>) =>
      apiRequest<AdminEvent>(
        `/admin/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        },
      ),
  },

  payments: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{ payments: AdminPayment[]; next_cursor: string | null }>(
        `/admin/payments${queryString(params)}`,
      ),

    get: (paymentId: string) =>
      apiRequest<AdminPayment>(
        `/admin/payments/${encodeURIComponent(paymentId)}`,
      ),

    decision: (paymentId: string, body: PaymentDecisionBody) =>
      apiRequest<{ id: string; status: string }>(
        `/admin/payments/${encodeURIComponent(paymentId)}/decision`,
        {
          method: "POST",
          body,
        },
      ),

    approve: (paymentId: string, body?: { internal_note?: string; internalNote?: string }) =>
      adminApi.payments.decision(paymentId, {
        decision: "APPROVE",
        internalNote: body?.internalNote || body?.internal_note,
      }),

    reject: (
      paymentId: string,
      body: { reason?: string; rejectionReason?: string; internal_note?: string; internalNote?: string },
    ) =>
      adminApi.payments.decision(paymentId, {
        decision: "REJECT",
        rejectionReason: body.rejectionReason || body.reason,
        internalNote: body.internalNote || body.internal_note,
      }),

    hold: (
      paymentId: string,
      body?: { reason?: string; rejectionReason?: string; internal_note?: string; internalNote?: string },
    ) =>
      adminApi.payments.decision(paymentId, {
        decision: "HOLD",
        rejectionReason: body?.rejectionReason || body?.reason,
        internalNote: body?.internalNote || body?.internal_note,
      }),

    unhold: (paymentId: string) =>
      adminApi.payments.decision(paymentId, {
        decision: "HOLD",
        internalNote: "Resumed review",
      }),

    resubmit: (paymentId: string, _body: { transaction_id?: string; transactionId?: string }) =>
      adminApi.payments.decision(paymentId, {
        decision: "HOLD",
        internalNote: "Requested UTR verification update",
      }),
  },

  purchases: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{
        purchases: PurchaseDetail[];
        next_cursor: string | null;
      }>(`/purchases${queryString(params)}`),

    retryFulfillment: (purchaseId: string) =>
      apiRequest<{ fulfilled: boolean }>(
        `/admin/purchases/${encodeURIComponent(purchaseId)}/retry-fulfillment`,
        {
          method: "POST",
        },
      ),
  },

  tickets: {
    get: (ticketId: string) =>
      apiRequest<AdminTicket>(
        `/tickets/${encodeURIComponent(ticketId)}`,
      ),

    revoke: (ticketId: string, body: { reason: string }) =>
      apiRequest<AdminTicket>(
        `/admin/tickets/${encodeURIComponent(ticketId)}/revoke`,
        {
          method: "POST",
          body,
        },
      ),

    rotateQr: (ticketId: string) =>
      apiRequest<AdminTicket>(
        `/admin/tickets/${encodeURIComponent(ticketId)}/rotate-qr`,
        {
          method: "POST",
        },
      ),

    undoCheckin: (ticketId: string, body: { reason: string }) =>
      apiRequest<{ undone: boolean }>(
        `/admin/tickets/${encodeURIComponent(ticketId)}/undo-check-in`,
        {
          method: "POST",
          body,
        },
      ),

    reissue: async (
      _ticketId: string,
      _body?: { new_beneficiary_id?: string; reason?: string },
    ): Promise<AdminTicket> => {
      throw new Error("Ticket reissuing is not supported by the backend.");
    },
  },

  registrations: {
    cancel: async (registrationId: string, _body?: unknown): Promise<AdminRegistration> => {
      throw new Error("Direct registration cancellation is not supported by the backend. Use purchase or ticket revocation.");
    },

    replaceMember: async (
      _registrationId: string,
      _body: {
        old_participant_id: string;
        new_participant_id: string;
        reason?: string;
      },
    ): Promise<AdminRegistration> => {
      throw new Error("Replacing registration member is not supported by the backend.");
    },
  },

  auditLogs: {
    list: (params?: Record<string, QueryValue>) =>
      apiRequest<{
        audit_logs: AdminAuditLog[];
        next_cursor: string | null;
      }>(`/admin/audit-logs${queryString(params)}`),
  },

  settings: {
    get: () => apiRequest<AdminSettings>("/catalog/passes"),
    update: (body: Record<string, unknown>) =>
      apiRequest<AdminSettings>("/admin/settings", {
        method: "PATCH",
        body,
      }),
  },

  festDays: {
    list: () => apiRequest<FestDay[]>("/catalog/passes"),
    update: (dayNumber: number, body: Record<string, unknown>) =>
      apiRequest<FestDay>(`/admin/fest-days/${dayNumber}`, {
        method: "PATCH",
        body,
      }),
  },

  gateStaff: {
    list: async () => ({ gate_staff: [] }),
    assign: async (_body: { user_id: string }) => {
      throw new Error(
        "Gate staff assignments are not a distinct backend route. Assign volunteers or leads via event staff routes.",
      );
    },
    remove: async (_userId: string) => {
      throw new Error(
        "Gate staff assignments are not a distinct backend route. Remove staff via event staff routes.",
      );
    },
  },
};
