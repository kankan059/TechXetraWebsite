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
            apiRequest<DashboardSalesReport>(
                "/api/admin/reports/sales",
            ),

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
            apiRequest<AdminUser[]>(
                `/api/admin/users${queryString(params)}`,
            ),

        get: (userId: string) =>
            apiRequest<AdminUser>(
                `/api/admin/users/${encodeURIComponent(userId)}`,
            ),
    },

    events: {
        list: (params?: Record<string, QueryValue>) =>
            apiRequest<AdminEvent[]>(
                `/api/admin/events${queryString(params)}`,
            ),
    },

    payments: {
        list: (params?: Record<string, QueryValue>) =>
            apiRequest<AdminPayment[]>(
                `/api/admin/payments${queryString(params)}`,
            ),
    },

    tickets: {
        get: (ticketId: string) =>
            apiRequest<AdminTicket>(
                `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
            ),
    },

    registrations: {
        cancel: (registrationId: string, body: unknown) =>
            apiRequest<AdminRegistration>(
                `/api/admin/registrations/${encodeURIComponent(registrationId)}/cancel`,
                {
                    method: "POST",
                    body,
                },
            ),
    },

    auditLogs: {
        list: (params?: Record<string, QueryValue>) =>
            apiRequest<AdminAuditLog[]>(
                `/api/admin/audit-logs${queryString(params)}`,
            ),
    },

    settings: {
        get: () => apiRequest<AdminSettings>("/api/admin/settings"),
    },
};