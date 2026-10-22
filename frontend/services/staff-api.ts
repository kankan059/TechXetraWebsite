import { apiRequest } from "@/lib/api-client";
import type {
  ScanLookupResult,
  ScanAdmitResult,
  ScanDenyResult,
  EsportsScore,
  StaffEventSummary,
  StaffEventDashboard,
  EventRegistrationDetail,
  StaffEventPayment,
  ReviewStaffPaymentBody,
  LeadUpdateEventBody,
  EventItem,
} from "@/types/api";

export const staffApi = {
  scan: {
    lookup: (body: { token: string; context: "GATE" | "EVENT"; event_id?: string }) =>
      apiRequest<ScanLookupResult>("/api/staff/scan/lookup", {
        method: "POST",
        body,
      }),

    admit: (body: {
      token: string;
      context: "GATE" | "EVENT";
      event_id?: string;
      student_id_checked?: boolean;
      client_scan_id?: string;
    }) =>
      apiRequest<ScanAdmitResult>("/api/staff/scan/admit", {
        method: "POST",
        body,
      }),

    deny: (body: {
      token: string;
      context: "GATE" | "EVENT";
      reason: string;
      event_id?: string;
      client_scan_id?: string;
    }) =>
      apiRequest<ScanDenyResult>("/api/staff/scan/deny", {
        method: "POST",
        body,
      }),
  },

  scores: {
    get: (eventId: string) =>
      apiRequest<{
        event: {
          id: string;
          slug: string;
          title: string;
          category: string;
          scoring_enabled: number | boolean;
          scoring_status: string;
          max_rounds: number;
        };
        scores: EsportsScore[];
        history: unknown[];
      }>(`/api/staff/events/${encodeURIComponent(eventId)}/scores`),

    upsert: (
      eventId: string,
      body: {
        registration_id: string;
        round_no: number;
        score: number;
        expected_version?: number;
        reason?: string;
      },
    ) =>
      apiRequest<EsportsScore>(
        `/api/staff/events/${encodeURIComponent(eventId)}/scores`,
        {
          method: "PUT",
          body,
        },
      ),

    delete: (eventId: string, entryId: string, reason: string) =>
      apiRequest<{ deleted: boolean }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/scores/${encodeURIComponent(entryId)}`,
        {
          method: "DELETE",
          body: { reason },
        },
      ),

    finalize: (eventId: string) =>
      apiRequest<{ finalized: boolean }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/scores/finalize`,
        {
          method: "POST",
        },
      ),
  },

  events: {
    /**
     * GET /api/staff/events/mine
     * Returns list of events assigned to current staff user (or all events for SUPER_ADMIN)
     */
    listMine: () =>
      apiRequest<StaffEventSummary[]>("/api/staff/events/mine"),

    /**
     * GET /api/staff/events/:id/dashboard
     * Returns live metrics, capacity stats, and assigned staff roster
     */
    getDashboard: (eventId: string) =>
      apiRequest<StaffEventDashboard>(
        `/api/staff/events/${encodeURIComponent(eventId)}/dashboard`
      ),

    /**
     * GET /api/staff/events/:id/registrations
     * Returns attendee roster with contact details, check-in state, and custom questionnaire answers
     */
    getRegistrations: (eventId: string, search?: string) => {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiRequest<EventRegistrationDetail[]>(
        `/api/staff/events/${encodeURIComponent(eventId)}/registrations${query}`
      );
    },

    /**
     * GET /api/staff/events/:id/payments
     * Returns payment verification queue for orders containing this event
     */
    getPayments: (eventId: string, status?: string) => {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiRequest<StaffEventPayment[]>(
        `/api/staff/events/${encodeURIComponent(eventId)}/payments${query}`
      );
    },

    /**
     * POST /api/staff/events/:id/payments/:paymentId/review
     * Lead reviews attendee payment (APPROVE, REJECT, or HOLD)
     */
    reviewPayment: (
      eventId: string,
      paymentId: string,
      body: ReviewStaffPaymentBody
    ) =>
      apiRequest<{ success: boolean; message: string }>(
        `/api/staff/events/${encodeURIComponent(eventId)}/payments/${encodeURIComponent(paymentId)}/review`,
        {
          method: "POST",
          body,
        }
      ),

    /**
     * PATCH /api/staff/events/:id
     * Lead updates venue, description, rules, form_schema, or registration deadline
     */
    update: (eventId: string, body: LeadUpdateEventBody) =>
      apiRequest<EventItem>(
        `/api/staff/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body,
        }
      ),
  },
};
