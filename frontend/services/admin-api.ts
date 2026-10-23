import { apiRequest } from "@/lib/api-client";
import { normalizeEventItem } from "@/services/participant-api";
import {
  adaptAttendanceReport,
  adaptSalesReport,
  adaptPendingReport,
} from "@/lib/report-adapters";

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

function normalizeAdminUser(u: any): AdminUser {
  return {
    ...u,
    is_active: u.is_active ?? u.isActive ?? 0,
    can_review_payments: Boolean(u.can_review_payments ?? u.canReviewPayments ?? false),
    phone: u.phone ?? null,
    is_student: Boolean(u.is_student ?? u.isStudent),
    institution_name: u.institution_name ?? u.institutionName ?? null,
    institution_id: u.institution_id ?? u.institutionId ?? null,
    profile_complete: Boolean(u.profile_complete ?? u.profileComplete ?? false),
    created_at: u.created_at ?? u.createdAt ?? 0,
  };
}

export const adminApi = {
  reports: {
    summary: () =>
      apiRequest<Record<string, unknown>>("/admin/reports/summary"),

    sales: async () =>
      adaptSalesReport(await apiRequest<unknown>("/admin/reports/financial")),

    pendingVerification: async () => {
      const [submitted, pending] = await Promise.all([
        apiRequest<unknown[]>("/admin/payments?status=SUBMITTED&pageSize=100"),
        apiRequest<unknown[]>("/admin/payments?status=PENDING&pageSize=100"),
      ]);
      return adaptPendingReport([...submitted, ...pending]);
    },

    attendance: async () =>
      adaptAttendanceReport(await apiRequest<unknown>("/admin/reports/attendance")),

    registrations: async (): Promise<DashboardRegistrationReport> => {
      const { events } = await adminApi.events.list({ limit: 100 });
      return events.map((e) => {
        const r = e as unknown as Record<string, unknown>;
        const taken = Number(r.seatsTaken ?? 0);
        return {
          event_id: String(r.id ?? ""),
          slug: String(r.slug ?? ""),
          title: String(r.title ?? ""),
          category: String(r.category ?? ""),
          day_of_event: Number(r.festDay ?? 0),
          capacity: Number(r.capacity ?? 0),
          seats_taken: taken,
          confirmed_registrations_count: taken,
          confirmed_seats_count: taken,
          reserved_registrations_count: 0,
          reserved_seats_count: 0,
        };
      });
    },

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
    list: async (params?: Record<string, QueryValue>) => {
      const { limit, ...rest } = params ?? {};
      const raw = await apiRequest<unknown>(
        `/admin/users${queryString({ ...rest, pageSize: limit ?? 100 })}`,
      );
      const rows = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { users?: unknown[] })?.users)
          ? (raw as { users: unknown[] }).users
          : [];
      return {
        users: rows.map(normalizeAdminUser),
        next_cursor: null as string | null,
      };
    },

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
    list: async (params?: Record<string, QueryValue>) => {
      const tab = String(params?.status ?? "ALL");
      const statusMap: Record<string, string[]> = {
        PENDING: ["SUBMITTED", "PENDING"],
        ON_HOLD: ["ON_HOLD"],
        SUCCESS: ["SUCCESS", "APPROVED"],
        FAILED: ["REJECTED"],
      };
      const backendStatuses: (string | undefined)[] = statusMap[tab] ?? [undefined];
      const uiStatus: Record<string, string> = {
        SUBMITTED: "PENDING",
        APPROVED: "SUCCESS",
        REJECTED: "FAILED",
        WITHDRAWN: "FAILED",
      };

      const pages = await Promise.all(
        backendStatuses.map((s) =>
          apiRequest<Record<string, unknown>[]>(
            `/admin/payments${queryString({ status: s, pageSize: 100 })}`,
          ),
        ),
      );

      const search = String(params?.search ?? "").trim().toLowerCase();

      const payments = pages
        .flat()
        .map((p) => {
          const b = (p.buyer ?? {}) as Record<string, unknown>;
          const status = String(p.status ?? "");
          return {
            id: String(p.id ?? ""),
            purchase_id: String(p.purchaseId ?? ""),
            expected_amount_paise: Number(p.amountPaise ?? 0),
            transaction_id: p.transactionId ? String(p.transactionId) : null,
            status: (uiStatus[status] ?? status) as AdminPayment["status"],
            reviewer_id: null,
            reviewed_at: null,
            rejection_reason: null,
            internal_note: null,
            created_at: Number(p.createdAt ?? 0),
            buyer_id: String(b.id ?? ""),
            buyer_name: String(b.name ?? ""),
            buyer_email: String(b.email ?? ""),
            buyer_phone: b.phone ? String(b.phone) : null,
          } as AdminPayment;
        })
        .filter(
          (p) =>
            !search ||
            [p.id, p.transaction_id, p.buyer_name, p.buyer_email].some((v) =>
              (v ?? "").toLowerCase().includes(search),
            ),
        )
        .sort((a, b) => b.created_at - a.created_at);

      return { payments, next_cursor: null as string | null };
    },

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
    get: async () => {
      const c = await apiRequest<{
        gatePassPricePaise: number;
        purchasesEnabled: boolean;
        supportEmail: string;
      }>("/catalog/passes");
      return {
        gate_pass_price_paise: c.gatePassPricePaise,
        purchases_enabled: c.purchasesEnabled,
        support_contact: c.supportEmail,
      } as AdminSettings;
    },
    update: (body: Record<string, unknown>) =>
      apiRequest<AdminSettings>("/admin/settings", {
        method: "PATCH",
        body,
      }),
  },

  festDays: {
    list: async () => {
      const c = await apiRequest<{ festDays?: FestDay[] }>("/catalog/passes");
      return c.festDays ?? [];
    },
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
